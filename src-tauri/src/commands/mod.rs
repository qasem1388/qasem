//! Thin Tauri command adapters: deserialize input, authorise, call a service.
//! No business logic lives here.

pub mod app;
pub mod auth;
pub mod company;
pub mod users;

use crate::application::state::AppState;
use crate::error::{AppError, AppResult};

/// Startup either produced a usable state or a fatal error that the UI shows.
pub struct Backend(pub Result<AppState, AppError>);

impl Backend {
    pub fn get(&self) -> AppResult<&AppState> {
        match &self.0 {
            Ok(s) => Ok(s),
            Err(e) => Err(match e {
                AppError::Security(m) => AppError::Security(m.clone()),
                AppError::Database(m) => AppError::Database(m.clone()),
                other => AppError::Internal(other.to_string()),
            }),
        }
    }
}
