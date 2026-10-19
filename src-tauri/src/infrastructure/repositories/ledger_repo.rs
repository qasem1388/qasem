use chrono::NaiveDate;
use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;

use crate::domain::accounting::{AccountType, JournalEntryDraft, JournalLineDraft};
use crate::domain::money::Money;
use crate::error::AppResult;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FiscalPeriod {
    pub id: String,
    pub name: String,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub is_closed: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PostedEntry {
    pub id: String,
    pub entry_number: i64,
    pub status: String,
    pub reversal_of: Option<String>,
    pub total: Money,
    pub draft: JournalEntryDraft,
}

pub fn insert_account(
    conn: &Connection,
    id: &str,
    code: &str,
    name_ar: &str,
    account_type: AccountType,
    parent_id: Option<&str>,
    is_postable: bool,
) -> AppResult<()> {
    let now = crate::now_utc();
    conn.execute(
        "INSERT INTO accounts (id, code, name_ar, account_type, parent_id, is_postable, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
        params![id, code, name_ar, account_type.as_str(), parent_id, is_postable, now],
    )?;
    Ok(())
}

pub fn insert_period(conn: &Connection, id: &str, name: &str, start: NaiveDate, end: NaiveDate) -> AppResult<()> {
    conn.execute(
        "INSERT INTO fiscal_periods (id, name, start_date, end_date, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, name, start.to_string(), end.to_string(), crate::now_utc()],
    )?;
    Ok(())
}

pub fn set_period_closed(conn: &Connection, id: &str, closed_by: Option<&str>) -> AppResult<usize> {
    Ok(conn.execute(
        "UPDATE fiscal_periods SET status = 'closed', closed_at = ?2, closed_by = ?3 WHERE id = ?1 AND status = 'open'",
        params![id, crate::now_utc(), closed_by],
    )?)
}

pub fn find_period_for_date(conn: &Connection, date: NaiveDate) -> AppResult<Option<FiscalPeriod>> {
    Ok(conn
        .query_row(
            "SELECT id, name, start_date, end_date, status FROM fiscal_periods
             WHERE ?1 BETWEEN start_date AND end_date",
            [date.to_string()],
            |r| {
                let status: String = r.get(4)?;
                Ok(FiscalPeriod {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    start_date: r.get(2)?,
                    end_date: r.get(3)?,
                    is_closed: status == "closed",
                })
            },
        )
        .optional()?)
}

pub fn source_already_posted(conn: &Connection, source_type: &str, source_id: &str) -> AppResult<bool> {
    Ok(conn
        .query_row(
            "SELECT 1 FROM journal_entries WHERE source_type = ?1 AND source_id = ?2",
            params![source_type, source_id],
            |_| Ok(()),
        )
        .optional()?
        .is_some())
}

/// Gap-free numbering. Callers hold an IMMEDIATE transaction, so no other
/// writer can interleave between reading MAX and inserting.
pub fn next_entry_number(conn: &Connection) -> AppResult<i64> {
    Ok(conn.query_row("SELECT COALESCE(MAX(entry_number), 0) + 1 FROM journal_entries", [], |r| r.get(0))?)
}

#[allow(clippy::too_many_arguments)]
pub fn insert_entry_header(
    conn: &Connection,
    id: &str,
    entry_number: i64,
    period_id: &str,
    draft: &JournalEntryDraft,
    total: Money,
    reversal_of: Option<&str>,
    posted_by: &str,
) -> AppResult<()> {
    conn.execute(
        "INSERT INTO journal_entries (id, entry_number, entry_date, period_id, description, reference, source_type,
            source_id, line_count, total, reversal_of, posted_at, posted_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            id,
            entry_number,
            draft.entry_date.to_string(),
            period_id,
            draft.description,
            draft.reference,
            draft.source_type,
            draft.source_id,
            draft.lines.len() as i64,
            total.minor(),
            reversal_of,
            crate::now_utc(),
            posted_by
        ],
    )?;
    Ok(())
}

pub fn insert_line(
    conn: &Connection,
    id: &str,
    entry_id: &str,
    line_no: usize,
    line: &JournalLineDraft,
) -> AppResult<()> {
    conn.execute(
        "INSERT INTO journal_lines (id, entry_id, line_no, account_id, debit, credit, memo)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, entry_id, line_no as i64, line.account_id, line.debit.minor(), line.credit.minor(), line.memo],
    )?;
    Ok(())
}

pub fn mark_reversed(conn: &Connection, id: &str) -> AppResult<usize> {
    Ok(conn.execute("UPDATE journal_entries SET status = 'reversed' WHERE id = ?1 AND status = 'posted'", [id])?)
}

pub fn get_entry(conn: &Connection, id: &str) -> AppResult<Option<PostedEntry>> {
    let header = conn
        .query_row(
            "SELECT id, entry_number, entry_date, description, reference, source_type, source_id, total, status,
                    reversal_of
             FROM journal_entries WHERE id = ?1",
            [id],
            |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, i64>(1)?,
                    r.get::<_, NaiveDate>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, Option<String>>(4)?,
                    r.get::<_, Option<String>>(5)?,
                    r.get::<_, Option<String>>(6)?,
                    r.get::<_, i64>(7)?,
                    r.get::<_, String>(8)?,
                    r.get::<_, Option<String>>(9)?,
                ))
            },
        )
        .optional()?;
    let Some((
        id,
        entry_number,
        entry_date,
        description,
        reference,
        source_type,
        source_id,
        total,
        status,
        reversal_of,
    )) = header
    else {
        return Ok(None);
    };
    let mut stmt =
        conn.prepare("SELECT account_id, debit, credit, memo FROM journal_lines WHERE entry_id = ?1 ORDER BY line_no")?;
    let lines = stmt
        .query_map([&id], |r| {
            Ok(JournalLineDraft {
                account_id: r.get(0)?,
                debit: Money::from_minor(r.get(1)?),
                credit: Money::from_minor(r.get(2)?),
                memo: r.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(Some(PostedEntry {
        id,
        entry_number,
        status,
        reversal_of,
        total: Money::from_minor(total),
        draft: JournalEntryDraft { entry_date, description, reference, source_type, source_id, lines },
    }))
}

/// (total debit, total credit) posted to an account.
pub fn account_totals(conn: &Connection, account_id: &str) -> AppResult<(Money, Money)> {
    let (d, c): (i64, i64) = conn.query_row(
        "SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0) FROM journal_lines WHERE account_id = ?1",
        [account_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?;
    Ok((Money::from_minor(d), Money::from_minor(c)))
}

/// Ledger-wide (total debit, total credit). Always equal in a healthy ledger.
pub fn ledger_totals(conn: &Connection) -> AppResult<(Money, Money)> {
    let (d, c): (i64, i64) =
        conn.query_row("SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0) FROM journal_lines", [], |r| {
            Ok((r.get(0)?, r.get(1)?))
        })?;
    Ok((Money::from_minor(d), Money::from_minor(c)))
}

/// Entries whose stored line count/total disagree with their lines (should be empty).
pub fn inconsistent_entries(conn: &Connection) -> AppResult<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT e.id FROM journal_entries e
         LEFT JOIN journal_lines l ON l.entry_id = e.id
         GROUP BY e.id
         HAVING COUNT(l.id) <> e.line_count
             OR COALESCE(SUM(l.debit), 0) <> e.total
             OR COALESCE(SUM(l.credit), 0) <> e.total",
    )?;
    let rows = stmt.query_map([], |r| r.get(0))?;
    Ok(rows.collect::<Result<_, _>>()?)
}
