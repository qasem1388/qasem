//! Double-entry posting: balance, atomicity, immutability, idempotency,
//! period locking — checked both through the service and directly against
//! the database guards.

mod common;

use chrono::NaiveDate;
use hesabati_lib::application::ledger_service;
use hesabati_lib::domain::accounting::{AccountType, AccountingError, JournalEntryDraft, JournalLineDraft};
use hesabati_lib::domain::money::Money;
use hesabati_lib::error::AppError;
use hesabati_lib::infrastructure::repositories::ledger_repo;

fn d(y: i32, m: u32, day: u32) -> NaiveDate {
    NaiveDate::from_ymd_opt(y, m, day).unwrap()
}

fn m(s: &str) -> Money {
    s.parse().unwrap()
}

struct Ledger {
    f: common::Fixture,
    jan: String,
}

/// Accounts: 1101 cash, 4101 sales, 2201 VAT payable, 1000 (non-postable parent).
/// Periods: Jan 2026 (open), Feb 2026 (open).
fn ledger() -> Ledger {
    let f = common::initialized();
    {
        let c = f.db.conn();
        ledger_repo::insert_account(&c, "assets", "1000", "الأصول", AccountType::Asset, None, false).unwrap();
        ledger_repo::insert_account(&c, "cash", "1101", "الصندوق", AccountType::Asset, Some("assets"), true).unwrap();
        ledger_repo::insert_account(&c, "sales", "4101", "المبيعات", AccountType::Revenue, None, true).unwrap();
        ledger_repo::insert_account(
            &c,
            "vat",
            "2201",
            "ضريبة القيمة المضافة المستحقة",
            AccountType::Liability,
            None,
            true,
        )
        .unwrap();
    }
    let jan = ledger_service::create_period(&f.db, "يناير 2026", d(2026, 1, 1), d(2026, 1, 31)).unwrap();
    ledger_service::create_period(&f.db, "فبراير 2026", d(2026, 2, 1), d(2026, 2, 28)).unwrap();
    Ledger { f, jan }
}

fn line(acc: &str, debit: &str, credit: &str) -> JournalLineDraft {
    JournalLineDraft { account_id: acc.into(), debit: m(debit), credit: m(credit), memo: None }
}

fn sale(date: NaiveDate, source: Option<&str>) -> JournalEntryDraft {
    JournalEntryDraft {
        entry_date: date,
        description: "فاتورة مبيعات نقدية".into(),
        reference: Some("INV-0001".into()),
        source_type: source.map(|_| "sales_invoice".into()),
        source_id: source.map(Into::into),
        lines: vec![line("cash", "1150.00", "0"), line("sales", "0", "1000.00"), line("vat", "0", "150.00")],
    }
}

fn entry_count(l: &Ledger) -> i64 {
    l.f.db.conn().query_row("SELECT COUNT(*) FROM journal_entries", [], |r| r.get(0)).unwrap()
}

#[test]
fn posts_balanced_entry_and_updates_balances() {
    let l = ledger();
    let posted = ledger_service::post_entry(&l.f.db, &l.f.admin, sale(d(2026, 1, 10), Some("inv-1"))).unwrap();
    assert_eq!(posted.entry_number, 1);
    assert_eq!(posted.total, m("1150"));
    assert_eq!(posted.status, "posted");

    let c = l.f.db.conn();
    assert_eq!(ledger_repo::account_totals(&c, "cash").unwrap(), (m("1150"), Money::ZERO));
    assert_eq!(ledger_repo::account_totals(&c, "sales").unwrap(), (Money::ZERO, m("1000")));
    assert_eq!(ledger_repo::account_totals(&c, "vat").unwrap(), (Money::ZERO, m("150")));
    let (dr, cr) = ledger_repo::ledger_totals(&c).unwrap();
    assert_eq!(dr, cr, "trial balance must balance");
    assert!(ledger_repo::inconsistent_entries(&c).unwrap().is_empty());
}

#[test]
fn unbalanced_entry_is_never_stored() {
    let l = ledger();
    let mut e = sale(d(2026, 1, 10), None);
    e.lines[2] = line("vat", "0", "149.99");
    let err = ledger_service::post_entry(&l.f.db, &l.f.admin, e).unwrap_err();
    assert!(matches!(err, AppError::Accounting(AccountingError::Unbalanced { .. })));
    assert_eq!(entry_count(&l), 0);
}

#[test]
fn database_rejects_unbalanced_lines_even_bypassing_the_service() {
    let l = ledger();
    let c = l.f.db.conn();
    let res = c.execute_batch(&format!(
        "BEGIN;
         INSERT INTO journal_entries (id, entry_number, entry_date, period_id, description, line_count, total, posted_at, posted_by)
           VALUES ('raw', 1, '2026-01-05', '{}', 'raw', 2, 100, '2026-01-05T00:00:00Z', '{}');
         INSERT INTO journal_lines (id, entry_id, line_no, account_id, debit, credit) VALUES ('l1', 'raw', 1, 'cash', 100, 0);
         INSERT INTO journal_lines (id, entry_id, line_no, account_id, debit, credit) VALUES ('l2', 'raw', 2, 'sales', 0, 90);
         COMMIT;",
        l.jan, l.f.admin.id
    ));
    let err: AppError = res.unwrap_err().into();
    assert!(matches!(err, AppError::Accounting(AccountingError::Unbalanced { .. })), "got {err:?}");
    c.execute_batch("ROLLBACK").ok();
    drop(c);
    assert_eq!(entry_count(&l), 0);
}

#[test]
fn posting_is_atomic() {
    let l = ledger();
    // Line 3 targets a non-postable parent account -> DB trigger aborts.
    let mut e = sale(d(2026, 1, 10), Some("inv-atomic"));
    e.lines[0] = line("assets", "1150.00", "0");
    let err = ledger_service::post_entry(&l.f.db, &l.f.admin, e).unwrap_err();
    assert!(matches!(err, AppError::Accounting(AccountingError::AccountNotPostable)), "got {err:?}");
    assert_eq!(entry_count(&l), 0, "header must be rolled back with the failed lines");
    let lines: i64 = l.f.db.conn().query_row("SELECT COUNT(*) FROM journal_lines", [], |r| r.get(0)).unwrap();
    assert_eq!(lines, 0);
    // The source document can still be posted correctly afterwards, and gets number 1.
    let ok = ledger_service::post_entry(&l.f.db, &l.f.admin, sale(d(2026, 1, 10), Some("inv-atomic"))).unwrap();
    assert_eq!(ok.entry_number, 1);
}

#[test]
fn same_document_cannot_be_posted_twice() {
    let l = ledger();
    ledger_service::post_entry(&l.f.db, &l.f.admin, sale(d(2026, 1, 10), Some("inv-7"))).unwrap();
    let err = ledger_service::post_entry(&l.f.db, &l.f.admin, sale(d(2026, 1, 11), Some("inv-7"))).unwrap_err();
    assert!(matches!(err, AppError::Accounting(AccountingError::DuplicatePosting)));
    assert_eq!(entry_count(&l), 1);
}

#[test]
fn posted_entries_cannot_be_edited_or_deleted() {
    let l = ledger();
    let p = ledger_service::post_entry(&l.f.db, &l.f.admin, sale(d(2026, 1, 10), None)).unwrap();
    let c = l.f.db.conn();
    for sql in [
        format!("UPDATE journal_entries SET description = 'changed' WHERE id = '{}'", p.id),
        format!("UPDATE journal_entries SET total = 1 WHERE id = '{}'", p.id),
        format!("DELETE FROM journal_entries WHERE id = '{}'", p.id),
        format!("UPDATE journal_lines SET debit = 1 WHERE entry_id = '{}'", p.id),
        format!("DELETE FROM journal_lines WHERE entry_id = '{}'", p.id),
        format!(
            "INSERT INTO journal_lines (id, entry_id, line_no, account_id, debit, credit) VALUES ('extra', '{}', 9, 'cash', 5, 0)",
            p.id
        ),
    ] {
        let err: AppError = c.execute(&sql, []).unwrap_err().into();
        assert!(
            matches!(err, AppError::Accounting(AccountingError::PostedEntryImmutable)),
            "statement should be blocked: {sql} -> {err:?}"
        );
    }
}

#[test]
fn reversal_corrects_without_editing() {
    let l = ledger();
    let p = ledger_service::post_entry(&l.f.db, &l.f.admin, sale(d(2026, 1, 10), Some("inv-9"))).unwrap();
    let r = ledger_service::reverse_entry(&l.f.db, &l.f.admin, &p.id, d(2026, 2, 3), "عكس فاتورة".into()).unwrap();
    assert_eq!(r.entry_number, 2);
    assert_eq!(r.reversal_of.as_deref(), Some(p.id.as_str()));
    {
        let c = l.f.db.conn();
        assert_eq!(ledger_repo::get_entry(&c, &p.id).unwrap().unwrap().status, "reversed");
        let (dr, cr) = ledger_repo::account_totals(&c, "cash").unwrap();
        assert_eq!(dr, cr, "cash net effect is zero after reversal");
    }
    let err = ledger_service::reverse_entry(&l.f.db, &l.f.admin, &p.id, d(2026, 2, 4), "مرة ثانية".into()).unwrap_err();
    assert!(matches!(err, AppError::Accounting(AccountingError::AlreadyReversed)));
}

#[test]
fn closed_or_missing_periods_block_posting() {
    let l = ledger();
    ledger_service::close_period(&l.f.db, &l.f.admin, &l.jan).unwrap();
    let err = ledger_service::post_entry(&l.f.db, &l.f.admin, sale(d(2026, 1, 20), None)).unwrap_err();
    assert!(matches!(err, AppError::Accounting(AccountingError::PeriodClosed)));

    let err = ledger_service::post_entry(&l.f.db, &l.f.admin, sale(d(2026, 3, 1), None)).unwrap_err();
    assert!(matches!(err, AppError::Accounting(AccountingError::NoOpenPeriod)));

    // February is still open.
    assert!(ledger_service::post_entry(&l.f.db, &l.f.admin, sale(d(2026, 2, 1), None)).is_ok());

    // DB guard: raw insert into the closed period is refused too.
    let c = l.f.db.conn();
    let err: AppError = c
        .execute(
            &format!(
                "INSERT INTO journal_entries (id, entry_number, entry_date, period_id, description, line_count, total, posted_at, posted_by)
                 VALUES ('raw', 99, '2026-01-05', '{}', 'raw', 2, 100, '2026-01-05T00:00:00Z', '{}')",
                l.jan, l.f.admin.id
            ),
            [],
        )
        .unwrap_err()
        .into();
    assert!(matches!(err, AppError::Accounting(AccountingError::PeriodClosed)), "got {err:?}");
}

#[test]
fn overlapping_periods_are_rejected() {
    let l = ledger();
    let err = ledger_service::create_period(&l.f.db, "متداخلة", d(2026, 1, 15), d(2026, 2, 15)).unwrap_err();
    assert!(matches!(err, AppError::Accounting(AccountingError::OverlappingPeriod)));
}

#[test]
fn many_entries_keep_the_ledger_balanced() {
    let l = ledger();
    for i in 0..50 {
        let amount = Money::from_minor(10_001 + i * 37); // odd halalas on purpose
        let e = JournalEntryDraft {
            entry_date: d(2026, 1, 1 + (i as u32 % 28)),
            description: format!("قيد {i}"),
            reference: None,
            source_type: Some("test".into()),
            source_id: Some(format!("doc-{i}")),
            lines: vec![
                JournalLineDraft { account_id: "cash".into(), debit: amount, credit: Money::ZERO, memo: None },
                JournalLineDraft { account_id: "sales".into(), debit: Money::ZERO, credit: amount, memo: None },
            ],
        };
        ledger_service::post_entry(&l.f.db, &l.f.admin, e).unwrap();
    }
    let c = l.f.db.conn();
    let (dr, cr) = ledger_repo::ledger_totals(&c).unwrap();
    assert_eq!(dr, cr);
    let numbers: Vec<i64> = c
        .prepare("SELECT entry_number FROM journal_entries ORDER BY entry_number")
        .unwrap()
        .query_map([], |r| r.get(0))
        .unwrap()
        .map(Result::unwrap)
        .collect();
    assert_eq!(numbers, (1..=50).collect::<Vec<_>>(), "numbering is sequential without gaps");
}
