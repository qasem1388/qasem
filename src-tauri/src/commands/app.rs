use tauri::State;

use super::Backend;
use crate::application::setup_service::{self, AppStatus, SetupInput};
use crate::error::AppResult;

#[tauri::command]
pub async fn app_status(backend: State<'_, Backend>) -> AppResult<AppStatus> {
    setup_service::status(&backend.get()?.db)
}

#[tauri::command]
pub async fn setup_initialize(backend: State<'_, Backend>, input: SetupInput) -> AppResult<()> {
    setup_service::initialize(&backend.get()?.db, input)
}
