use tauri::State;

use super::Backend;
use crate::application::auth_service::{self, LoginInput, LoginResult};
use crate::application::session::SessionUser;
use crate::error::AppResult;

#[tauri::command]
pub async fn auth_login(backend: State<'_, Backend>, input: LoginInput) -> AppResult<LoginResult> {
    let s = backend.get()?;
    auth_service::login(&s.db, &s.sessions, input)
}

#[tauri::command]
pub async fn auth_logout(backend: State<'_, Backend>, token: String) -> AppResult<()> {
    let s = backend.get()?;
    auth_service::logout(&s.db, &s.sessions, &token);
    Ok(())
}

#[tauri::command]
pub async fn auth_session(backend: State<'_, Backend>, token: String) -> AppResult<SessionUser> {
    backend.get()?.sessions.current(&token)
}
