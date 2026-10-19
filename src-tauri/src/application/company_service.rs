use serde_json::json;

use super::session::SessionUser;
use crate::domain::company::{Company, CompanyInput};
use crate::error::{AppError, AppResult};
use crate::infrastructure::db::Database;
use crate::infrastructure::repositories::{audit_repo, company_repo};

pub fn get(db: &Database) -> AppResult<Company> {
    company_repo::get_default(&db.conn())?.ok_or(AppError::NotInitialized)
}

pub fn update(db: &Database, actor: &SessionUser, input: CompanyInput) -> AppResult<Company> {
    let input = input.normalized();
    input.validate("").map_err(AppError::Validation)?;

    let mut conn = db.conn();
    let tx = conn.transaction()?;
    let current = company_repo::get_default(&tx)?.ok_or(AppError::NotInitialized)?;
    company_repo::update(&tx, &current.id, &input)?;
    audit_repo::append(
        &tx,
        audit_repo::NewAuditEvent {
            user_id: Some(&actor.id),
            username: Some(&actor.username),
            action: "company.updated",
            entity_type: Some("company"),
            entity_id: Some(&current.id),
            details: Some(json!({ "before": current.data, "after": input })),
        },
    )?;
    let updated = company_repo::get_default(&tx)?.ok_or(AppError::NotInitialized)?;
    tx.commit()?;
    Ok(updated)
}
