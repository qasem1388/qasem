use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use sha2::{Digest, Sha256};

use crate::error::AppResult;

pub const GENESIS_HASH: &str = "0000000000000000000000000000000000000000000000000000000000000000";

pub struct NewAuditEvent<'a> {
    pub user_id: Option<&'a str>,
    pub username: Option<&'a str>,
    pub action: &'a str,
    pub entity_type: Option<&'a str>,
    pub entity_id: Option<&'a str>,
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditRecord {
    pub id: i64,
    pub occurred_at: String,
    pub user_id: Option<String>,
    pub username: Option<String>,
    pub action: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub details: Option<String>,
    pub prev_hash: String,
    pub hash: String,
}

/// Hash over, in order: prev_hash, occurred_at, user_id, username, action,
/// entity_type, entity_id, details. Length-prefixed fields make the input
/// unambiguous.
fn compute_hash(fields: [Option<&str>; 8]) -> String {
    let mut h = Sha256::new();
    for field in fields {
        match field {
            Some(v) => h.update(format!("{}:{}|", v.len(), v).as_bytes()),
            None => h.update(b"-|"),
        }
    }
    hex::encode(h.finalize())
}

/// Appends an event. Call inside the same transaction as the audited change so
/// both commit or neither does.
pub fn append(conn: &Connection, ev: NewAuditEvent<'_>) -> AppResult<()> {
    let prev: String = conn
        .query_row("SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1", [], |r| r.get(0))
        .optional()?
        .unwrap_or_else(|| GENESIS_HASH.to_owned());
    let occurred_at = crate::now_utc();
    let details = ev.details.map(|d| d.to_string());
    let hash = compute_hash([
        Some(&prev),
        Some(&occurred_at),
        ev.user_id,
        ev.username,
        Some(ev.action),
        ev.entity_type,
        ev.entity_id,
        details.as_deref(),
    ]);
    conn.execute(
        "INSERT INTO audit_log (occurred_at, user_id, username, action, entity_type, entity_id, details, prev_hash, hash)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![occurred_at, ev.user_id, ev.username, ev.action, ev.entity_type, ev.entity_id, details, prev, hash],
    )?;
    Ok(())
}

fn row_to_record(r: &rusqlite::Row<'_>) -> rusqlite::Result<AuditRecord> {
    Ok(AuditRecord {
        id: r.get(0)?,
        occurred_at: r.get(1)?,
        user_id: r.get(2)?,
        username: r.get(3)?,
        action: r.get(4)?,
        entity_type: r.get(5)?,
        entity_id: r.get(6)?,
        details: r.get(7)?,
        prev_hash: r.get(8)?,
        hash: r.get(9)?,
    })
}

const SELECT: &str =
    "SELECT id, occurred_at, user_id, username, action, entity_type, entity_id, details, prev_hash, hash FROM audit_log";

pub fn recent(conn: &Connection, limit: u32) -> AppResult<Vec<AuditRecord>> {
    let mut stmt = conn.prepare(&format!("{SELECT} ORDER BY id DESC LIMIT ?1"))?;
    let rows = stmt.query_map([limit], row_to_record)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

/// Recomputes the whole chain. Returns the id of the first broken record.
pub fn verify_chain(conn: &Connection) -> AppResult<Result<(), i64>> {
    let mut stmt = conn.prepare(&format!("{SELECT} ORDER BY id ASC"))?;
    let rows = stmt.query_map([], row_to_record)?;
    let mut expected_prev = GENESIS_HASH.to_owned();
    for row in rows {
        let r = row?;
        let recomputed = compute_hash([
            Some(&r.prev_hash),
            Some(&r.occurred_at),
            r.user_id.as_deref(),
            r.username.as_deref(),
            Some(&r.action),
            r.entity_type.as_deref(),
            r.entity_id.as_deref(),
            r.details.as_deref(),
        ]);
        if r.prev_hash != expected_prev || recomputed != r.hash {
            return Ok(Err(r.id));
        }
        expected_prev = r.hash;
    }
    Ok(Ok(()))
}
