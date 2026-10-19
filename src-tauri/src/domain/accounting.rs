//! Double-entry bookkeeping rules.
//!
//! A journal entry is only ever persisted after passing [`JournalEntryDraft::validate`],
//! which guarantees it is balanced. The database repeats the critical checks in
//! triggers (see `migrations/0002_ledger.sql`) so a bug in the application
//! layer still cannot store an unbalanced or modified posted entry.

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

use super::money::Money;

/// Prefix used by database triggers in `RAISE(ABORT, ...)` messages.
pub const DB_GUARD_PREFIX: &str = "HESABATI:";

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum AccountingError {
    #[error("القيد غير متوازن: مجموع المدين {debit} لا يساوي مجموع الدائن {credit}")]
    Unbalanced { debit: Money, credit: Money },
    #[error("يجب أن يحتوي القيد على سطرين على الأقل")]
    TooFewLines,
    #[error("السطر رقم {line} يجب أن يحتوي على مبلغ مدين أو دائن فقط وأكبر من صفر")]
    InvalidLine { line: usize },
    #[error("المبالغ تتجاوز الحد المسموح")]
    Overflow,
    #[error("الفترة المالية لهذا التاريخ مقفلة ولا يجوز الترحيل إليها")]
    PeriodClosed,
    #[error("لا توجد فترة مالية مفتوحة تشمل تاريخ القيد")]
    NoOpenPeriod,
    #[error("تم ترحيل هذا المستند مسبقًا")]
    DuplicatePosting,
    #[error("تم عكس هذا القيد مسبقًا")]
    AlreadyReversed,
    #[error("لا يجوز تعديل أو حذف قيد مرحّل؛ استخدم قيدًا عكسيًا أو تصحيحيًا")]
    PostedEntryImmutable,
    #[error("الحساب غير موجود أو غير قابل للترحيل إليه")]
    AccountNotPostable,
    #[error("الفترات المالية متداخلة")]
    OverlappingPeriod,
    #[error("سجل التدقيق غير قابل للتعديل أو الحذف")]
    AuditImmutable,
}

impl AccountingError {
    pub fn code(&self) -> &'static str {
        match self {
            AccountingError::Unbalanced { .. } => "unbalanced_entry",
            AccountingError::TooFewLines => "too_few_lines",
            AccountingError::InvalidLine { .. } => "invalid_line",
            AccountingError::Overflow => "amount_overflow",
            AccountingError::PeriodClosed => "period_closed",
            AccountingError::NoOpenPeriod => "no_open_period",
            AccountingError::DuplicatePosting => "duplicate_posting",
            AccountingError::AlreadyReversed => "already_reversed",
            AccountingError::PostedEntryImmutable => "posted_entry_immutable",
            AccountingError::AccountNotPostable => "account_not_postable",
            AccountingError::OverlappingPeriod => "overlapping_period",
            AccountingError::AuditImmutable => "audit_immutable",
        }
    }

    /// Maps a trigger message such as `HESABATI:period_closed` back to an error.
    pub fn from_db_message(msg: &str) -> Option<Self> {
        let idx = msg.find(DB_GUARD_PREFIX)?;
        let code = msg[idx + DB_GUARD_PREFIX.len()..].split_whitespace().next()?;
        Some(match code {
            "period_closed" => Self::PeriodClosed,
            "no_open_period" => Self::NoOpenPeriod,
            "posted_entry_immutable" => Self::PostedEntryImmutable,
            "account_not_postable" => Self::AccountNotPostable,
            "audit_immutable" => Self::AuditImmutable,
            "overlapping_period" => Self::OverlappingPeriod,
            "unbalanced_entry" => Self::Unbalanced { debit: Money::ZERO, credit: Money::ZERO },
            _ => return None,
        })
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AccountType {
    Asset,
    Liability,
    Equity,
    Revenue,
    Expense,
}

impl AccountType {
    pub fn as_str(self) -> &'static str {
        match self {
            AccountType::Asset => "asset",
            AccountType::Liability => "liability",
            AccountType::Equity => "equity",
            AccountType::Revenue => "revenue",
            AccountType::Expense => "expense",
        }
    }

    /// Assets and expenses increase with debits; the rest with credits.
    pub fn is_debit_normal(self) -> bool {
        matches!(self, AccountType::Asset | AccountType::Expense)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JournalLineDraft {
    pub account_id: String,
    pub debit: Money,
    pub credit: Money,
    pub memo: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JournalEntryDraft {
    /// Gregorian accounting date. Hijri is a display concern only.
    pub entry_date: NaiveDate,
    pub description: String,
    pub reference: Option<String>,
    /// Origin document (e.g. `sales_invoice`) — together with `source_id`
    /// forms the idempotency key that prevents double posting.
    pub source_type: Option<String>,
    pub source_id: Option<String>,
    pub lines: Vec<JournalLineDraft>,
}

/// Proof that a draft passed validation; only obtainable through `validate`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BalancedEntry {
    draft: JournalEntryDraft,
    total: Money,
}

impl BalancedEntry {
    pub fn draft(&self) -> &JournalEntryDraft {
        &self.draft
    }

    pub fn total(&self) -> Money {
        self.total
    }
}

impl JournalEntryDraft {
    pub fn validate(self) -> Result<BalancedEntry, AccountingError> {
        if self.lines.len() < 2 {
            return Err(AccountingError::TooFewLines);
        }
        let mut debit = Money::ZERO;
        let mut credit = Money::ZERO;
        for (i, line) in self.lines.iter().enumerate() {
            let one_sided = (line.debit.is_zero()) != (line.credit.is_zero());
            if !one_sided || line.debit.is_negative() || line.credit.is_negative() || line.account_id.trim().is_empty()
            {
                return Err(AccountingError::InvalidLine { line: i + 1 });
            }
            debit = debit.checked_add(line.debit).ok_or(AccountingError::Overflow)?;
            credit = credit.checked_add(line.credit).ok_or(AccountingError::Overflow)?;
        }
        if debit != credit {
            return Err(AccountingError::Unbalanced { debit, credit });
        }
        Ok(BalancedEntry { total: debit, draft: self })
    }

    /// Builds the reversing entry: same accounts, debit and credit swapped.
    pub fn reversed(&self, entry_date: NaiveDate, description: String) -> JournalEntryDraft {
        JournalEntryDraft {
            entry_date,
            description,
            reference: self.reference.clone(),
            source_type: None,
            source_id: None,
            lines: self
                .lines
                .iter()
                .map(|l| JournalLineDraft {
                    account_id: l.account_id.clone(),
                    debit: l.credit,
                    credit: l.debit,
                    memo: l.memo.clone(),
                })
                .collect(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn line(acc: &str, d: &str, c: &str) -> JournalLineDraft {
        JournalLineDraft { account_id: acc.into(), debit: d.parse().unwrap(), credit: c.parse().unwrap(), memo: None }
    }

    fn draft(lines: Vec<JournalLineDraft>) -> JournalEntryDraft {
        JournalEntryDraft {
            entry_date: NaiveDate::from_ymd_opt(2026, 1, 15).unwrap(),
            description: "قيد اختبار".into(),
            reference: None,
            source_type: None,
            source_id: None,
            lines,
        }
    }

    #[test]
    fn balanced_entry_is_accepted() {
        let e = draft(vec![line("cash", "1150.00", "0"), line("sales", "0", "1000"), line("vat", "0", "150")])
            .validate()
            .unwrap();
        assert_eq!(e.total().to_string(), "1150.00");
    }

    #[test]
    fn unbalanced_entry_is_rejected() {
        let err = draft(vec![line("cash", "100", "0"), line("sales", "0", "99.99")]).validate().unwrap_err();
        assert_eq!(
            err,
            AccountingError::Unbalanced { debit: "100".parse().unwrap(), credit: "99.99".parse().unwrap() }
        );
    }

    #[test]
    fn line_rules() {
        assert_eq!(draft(vec![line("a", "1", "0")]).validate(), Err(AccountingError::TooFewLines));
        // both sides on one line
        assert_eq!(
            draft(vec![line("a", "1", "1"), line("b", "0", "0")]).validate(),
            Err(AccountingError::InvalidLine { line: 1 })
        );
        // zero line
        assert_eq!(
            draft(vec![line("a", "1", "0"), line("b", "0", "0"), line("c", "0", "1")]).validate(),
            Err(AccountingError::InvalidLine { line: 2 })
        );
        // negative amount
        assert_eq!(
            draft(vec![line("a", "-1", "0"), line("b", "0", "-1")]).validate(),
            Err(AccountingError::InvalidLine { line: 1 })
        );
        // missing account
        assert_eq!(
            draft(vec![line("a", "1", "0"), line(" ", "0", "1")]).validate(),
            Err(AccountingError::InvalidLine { line: 2 })
        );
    }

    #[test]
    fn reversal_swaps_sides_and_stays_balanced() {
        let d = draft(vec![line("cash", "50", "0"), line("sales", "0", "50")]);
        let r = d.reversed(NaiveDate::from_ymd_opt(2026, 2, 1).unwrap(), "عكس".into());
        assert_eq!(r.lines[0].credit.to_string(), "50.00");
        assert_eq!(r.lines[1].debit.to_string(), "50.00");
        assert!(r.validate().is_ok());
    }

    #[test]
    fn db_guard_messages_map_back() {
        assert_eq!(AccountingError::from_db_message("HESABATI:period_closed"), Some(AccountingError::PeriodClosed));
        assert_eq!(AccountingError::from_db_message("UNIQUE constraint failed"), None);
    }
}
