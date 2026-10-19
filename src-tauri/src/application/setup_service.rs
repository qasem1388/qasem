//! First-run setup: creates the company profile and the first administrator
//! in a single transaction. Can only succeed once.

use rusqlite::TransactionBehavior;
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::domain::company::CompanyInput;
use crate::domain::user::{NewAdminInput, Role};
use crate::error::{AppError, AppResult};
use crate::infrastructure::db::Database;
use crate::infrastructure::password;
use crate::infrastructure::repositories::{audit_repo, company_repo, user_repo};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppStatus {
    pub initialized: bool,
    pub company_name: Option<String>,
    pub app_version: &'static str,
    pub schema_version: i64,
    pub database_encrypted: bool,
    pub cipher_version: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetupInput {
    pub company: CompanyInput,
    pub admin: NewAdminInput,
}

pub fn status(db: &Database) -> AppResult<AppStatus> {
    let conn = db.conn();
    let company = company_repo::get_default(&conn)?;
    let users = user_repo::count(&conn)?;
    Ok(AppStatus {
        initialized: company.is_some() && users > 0,
        company_name: company.map(|c| c.data.name_ar),
        app_version: env!("CARGO_PKG_VERSION"),
        schema_version: crate::infrastructure::migrations::current_version(&conn)?,
        database_encrypted: !db.cipher_version().is_empty(),
        cipher_version: db.cipher_version().to_owned(),
    })
}

pub fn initialize(db: &Database, input: SetupInput) -> AppResult<()> {
    let company = input.company.normalized();
    let mut errors = Vec::new();
    if let Err(e) = company.validate("company.") {
        errors.extend(e);
    }
    if let Err(e) = input.admin.validate() {
        errors.extend(e);
    }
    if !errors.is_empty() {
        return Err(AppError::Validation(errors));
    }

    // Cheap pre-check so we do not spend Argon2 time when already set up.
    if status(db)?.initialized {
        return Err(AppError::AlreadyInitialized);
    }
    let hash = password::hash_password(&input.admin.password)?;

    let mut conn = db.conn();
    let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    // Authoritative check inside the write lock.
    if user_repo::count(&tx)? > 0 || company_repo::get_default(&tx)?.is_some() {
        return Err(AppError::AlreadyInitialized);
    }
    let company_id = uuid::Uuid::now_v7().to_string();
    let user_id = uuid::Uuid::now_v7().to_string();
    let username = input.admin.username.trim();
    company_repo::insert_default(&tx, &company_id, &company)?;
    user_repo::insert(&tx, &user_id, username, input.admin.full_name.trim(), &hash, Role::Admin)?;
    audit_repo::append(
        &tx,
        audit_repo::NewAuditEvent {
            user_id: Some(&user_id),
            username: Some(username),
            action: "setup.completed",
            entity_type: Some("company"),
            entity_id: Some(&company_id),
            details: Some(json!({ "companyName": company.name_ar })),
        },
    )?;
    tx.commit()?;
    Ok(())
}
