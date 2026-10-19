use super::session::SessionManager;
use crate::infrastructure::db::Database;

/// Shared state managed by Tauri.
pub struct AppState {
    pub db: Database,
    pub sessions: SessionManager,
}

impl AppState {
    pub fn new(db: Database) -> Self {
        Self { db, sessions: SessionManager::default() }
    }
}
