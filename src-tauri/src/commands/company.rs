use tauri::State;

use super::Backend;
use crate::application::company_service;
use crate::domain::company::{Company, CompanyInput};
use crate::domain::user::Permission;
use crate::error::AppResult;

#[tauri::command]
pub async fn company_get(backend: State<'_, Backend>, token: String) -> AppResult<Company> {
    let s = backend.get()?;
    s.sessions.authorize(&token, Permission::DashboardView)?;
    company_service::get(&s.db)
}

#[tauri::command]
pub async fn company_update(backend: State<'_, Backend>, token: String, input: CompanyInput) -> AppResult<Company> {
    let s = backend.get()?;
    let actor = s.sessions.authorize(&token, Permission::CompanyManage)?;
    company_service::update(&s.db, &actor, input)
}
