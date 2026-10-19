use tauri::State;

use super::Backend;
use crate::application::users_service;
use crate::domain::user::Permission;
use crate::error::AppResult;
use crate::infrastructure::repositories::audit_repo::AuditRecord;
use crate::infrastructure::repositories::user_repo::UserSummary;

#[tauri::command]
pub async fn users_list(backend: State<'_, Backend>, token: String) -> AppResult<Vec<UserSummary>> {
    let s = backend.get()?;
    s.sessions.authorize(&token, Permission::UsersManage)?;
    users_service::list(&s.db)
}

#[tauri::command]
pub async fn audit_recent(backend: State<'_, Backend>, token: String, limit: u32) -> AppResult<Vec<AuditRecord>> {
    let s = backend.get()?;
    s.sessions.authorize(&token, Permission::AuditView)?;
    users_service::recent_audit(&s.db, limit)
}

/// Returns `null` when intact, otherwise the id of the first tampered record.
#[tauri::command]
pub async fn audit_verify(backend: State<'_, Backend>, token: String) -> AppResult<Option<i64>> {
    let s = backend.get()?;
    s.sessions.authorize(&token, Permission::AuditView)?;
    users_service::verify_audit_chain(&s.db)
}
