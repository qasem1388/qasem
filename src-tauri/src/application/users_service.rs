use crate::error::AppResult;
use crate::infrastructure::db::Database;
use crate::infrastructure::repositories::audit_repo::{self, AuditRecord};
use crate::infrastructure::repositories::user_repo::{self, UserSummary};

pub fn list(db: &Database) -> AppResult<Vec<UserSummary>> {
    Ok(user_repo::list(&db.conn())?.iter().map(UserSummary::from).collect())
}

pub fn recent_audit(db: &Database, limit: u32) -> AppResult<Vec<AuditRecord>> {
    audit_repo::recent(&db.conn(), limit.clamp(1, 500))
}

/// `Ok(None)` when the chain is intact, `Ok(Some(id))` for the first broken record.
pub fn verify_audit_chain(db: &Database) -> AppResult<Option<i64>> {
    Ok(audit_repo::verify_chain(&db.conn())?.err())
}
