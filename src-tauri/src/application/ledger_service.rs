//! Journal posting engine.
//!
//! Posting is atomic: header, every line and the audit record are written in
//! one IMMEDIATE transaction. Any failure (validation, closed period, DB
//! trigger) rolls the whole entry back. Posted entries are never edited — they
//! are corrected with a reversing entry.

use chrono::NaiveDate;
use rusqlite::{Connection, TransactionBehavior};
use serde_json::json;

use crate::domain::accounting::{AccountingError, BalancedEntry, JournalEntryDraft};
use crate::error::{AppError, AppResult};
use crate::infrastructure::db::Database;
use crate::infrastructure::repositories::audit_repo;
use crate::infrastructure::repositories::ledger_repo::{self, FiscalPeriod, PostedEntry};

use super::session::SessionUser;

fn is_unique_violation(e: &AppError) -> bool {
    matches!(e, AppError::Database(msg) if msg.contains("UNIQUE constraint failed: journal_entries.source_type"))
}

fn open_period_for(conn: &Connection, date: NaiveDate) -> AppResult<FiscalPeriod> {
    match ledger_repo::find_period_for_date(conn, date)? {
        None => Err(AccountingError::NoOpenPeriod.into()),
        Some(p) if p.is_closed => Err(AccountingError::PeriodClosed.into()),
        Some(p) => Ok(p),
    }
}

fn post_in_tx(
    conn: &Connection,
    actor: &SessionUser,
    entry: &BalancedEntry,
    reversal_of: Option<&str>,
) -> AppResult<String> {
    let draft = entry.draft();
    if let (Some(t), Some(id)) = (&draft.source_type, &draft.source_id) {
        if ledger_repo::source_already_posted(conn, t, id)? {
            return Err(AccountingError::DuplicatePosting.into());
        }
    }
    let period = open_period_for(conn, draft.entry_date)?;
    let entry_id = uuid::Uuid::now_v7().to_string();
    let number = ledger_repo::next_entry_number(conn)?;
    ledger_repo::insert_entry_header(conn, &entry_id, number, &period.id, draft, entry.total(), reversal_of, &actor.id)
        .map_err(|e| if is_unique_violation(&e) { AccountingError::DuplicatePosting.into() } else { e })?;
    for (i, line) in draft.lines.iter().enumerate() {
        ledger_repo::insert_line(conn, &uuid::Uuid::now_v7().to_string(), &entry_id, i + 1, line)?;
    }
    audit_repo::append(
        conn,
        audit_repo::NewAuditEvent {
            user_id: Some(&actor.id),
            username: Some(&actor.username),
            action: if reversal_of.is_some() { "journal.reversed" } else { "journal.posted" },
            entity_type: Some("journal_entry"),
            entity_id: Some(&entry_id),
            details: Some(json!({ "number": number, "total": entry.total(), "reversalOf": reversal_of })),
        },
    )?;
    Ok(entry_id)
}

pub fn post_entry(db: &Database, actor: &SessionUser, draft: JournalEntryDraft) -> AppResult<PostedEntry> {
    if draft.description.trim().is_empty() {
        return Err(AppError::validation("description", "required"));
    }
    let balanced = draft.validate()?;
    let mut conn = db.conn();
    let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let id = post_in_tx(&tx, actor, &balanced, None)?;
    let posted = ledger_repo::get_entry(&tx, &id)?.ok_or(AppError::NotFound)?;
    tx.commit()?;
    Ok(posted)
}

pub fn reverse_entry(
    db: &Database,
    actor: &SessionUser,
    entry_id: &str,
    reversal_date: NaiveDate,
    description: String,
) -> AppResult<PostedEntry> {
    let mut conn = db.conn();
    let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let original = ledger_repo::get_entry(&tx, entry_id)?.ok_or(AppError::NotFound)?;
    if original.status != "posted" {
        return Err(AccountingError::AlreadyReversed.into());
    }
    let balanced = original.draft.reversed(reversal_date, description).validate()?;
    let id = post_in_tx(&tx, actor, &balanced, Some(&original.id)).map_err(|e| match e {
        AppError::Database(msg) if msg.contains("journal_entries.reversal_of") => {
            AccountingError::AlreadyReversed.into()
        }
        other => other,
    })?;
    ledger_repo::mark_reversed(&tx, &original.id)?;
    let posted = ledger_repo::get_entry(&tx, &id)?.ok_or(AppError::NotFound)?;
    tx.commit()?;
    Ok(posted)
}

pub fn create_period(db: &Database, name: &str, start: NaiveDate, end: NaiveDate) -> AppResult<String> {
    if start > end {
        return Err(AppError::validation("endDate", "end_before_start"));
    }
    let id = uuid::Uuid::now_v7().to_string();
    ledger_repo::insert_period(&db.conn(), &id, name, start, end)?;
    Ok(id)
}

pub fn close_period(db: &Database, actor: &SessionUser, period_id: &str) -> AppResult<()> {
    let mut conn = db.conn();
    let tx = conn.transaction()?;
    if ledger_repo::set_period_closed(&tx, period_id, Some(&actor.id))? == 0 {
        return Err(AppError::NotFound);
    }
    audit_repo::append(
        &tx,
        audit_repo::NewAuditEvent {
            user_id: Some(&actor.id),
            username: Some(&actor.username),
            action: "period.closed",
            entity_type: Some("fiscal_period"),
            entity_id: Some(period_id),
            details: None,
        },
    )?;
    tx.commit()?;
    Ok(())
}
