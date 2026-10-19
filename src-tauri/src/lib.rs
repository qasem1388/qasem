//! حساباتي | Hesabati — backend library.
//!
//! Layering (dependencies point inwards only):
//!
//! ```text
//! commands  ->  application  ->  domain
//!                   |
//!                   v
//!            infrastructure (db, keystore, password, repositories)
//! ```

pub mod application;
pub mod commands;
pub mod domain;
pub mod error;
pub mod infrastructure;

use std::path::Path;

use chrono::{DateTime, SecondsFormat, Utc};
use tauri::Manager;

use application::state::AppState;
use error::AppResult;
use infrastructure::db::Database;
use infrastructure::keystore;

pub const DB_FILE_NAME: &str = "hesabati.db";

/// Current time as an RFC 3339 UTC string with millisecond precision.
pub fn now_utc() -> String {
    to_rfc3339(Utc::now())
}

pub fn to_rfc3339(t: DateTime<Utc>) -> String {
    t.to_rfc3339_opts(SecondsFormat::Millis, true)
}

/// Opens the encrypted database inside `data_dir`, creating key and file on first run.
pub fn open_database(data_dir: &Path) -> AppResult<Database> {
    std::fs::create_dir_all(data_dir).map_err(|e| error::AppError::Internal(format!("create data dir: {e}")))?;
    let db_path = data_dir.join(DB_FILE_NAME);
    let store = keystore::platform_key_store(data_dir);
    let key = keystore::resolve_key(store.as_ref(), db_path.exists())?;
    Database::open(&db_path, &key)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().level(log::LevelFilter::Info).build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // A second launch focuses the running window instead of opening
            // the database twice.
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .setup(|app| {
            let state = app
                .path()
                .app_data_dir()
                .map_err(|e| error::AppError::Internal(format!("resolve data dir: {e}")))
                .and_then(|dir| open_database(&dir))
                .map(AppState::new);
            if let Err(e) = &state {
                log::error!("startup failed: {e:?}");
            }
            app.manage(commands::Backend(state));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::app::app_status,
            commands::app::setup_initialize,
            commands::auth::auth_login,
            commands::auth::auth_logout,
            commands::auth::auth_session,
            commands::company::company_get,
            commands::company::company_update,
            commands::users::users_list,
            commands::users::audit_recent,
            commands::users::audit_verify,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Hesabati");
}
