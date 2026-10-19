//! In-memory login sessions. Tokens are 256-bit random values that only live
//! in process memory; the UI keeps them in memory too (never localStorage), so
//! closing the program always ends the session.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use rand::rngs::OsRng;
use rand::RngCore;
use serde::Serialize;

use crate::domain::user::{Permission, Role};
use crate::error::{AppError, AppResult};

pub const IDLE_TIMEOUT: Duration = Duration::from_secs(30 * 60);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionUser {
    pub id: String,
    pub username: String,
    pub full_name: String,
    pub role: Role,
    pub permissions: Vec<Permission>,
}

#[derive(Debug, Clone)]
struct Session {
    user: SessionUser,
    last_seen: Instant,
}

pub struct SessionManager {
    sessions: Mutex<HashMap<String, Session>>,
    idle_timeout: Duration,
}

impl Default for SessionManager {
    fn default() -> Self {
        Self::with_timeout(IDLE_TIMEOUT)
    }
}

impl SessionManager {
    pub fn with_timeout(idle_timeout: Duration) -> Self {
        Self { sessions: Mutex::new(HashMap::new()), idle_timeout }
    }

    pub fn create(&self, user: SessionUser) -> String {
        let mut raw = [0u8; 32];
        OsRng.fill_bytes(&mut raw);
        let token = hex::encode(raw);
        let mut map = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
        map.retain(|_, s| s.last_seen.elapsed() < self.idle_timeout);
        map.insert(token.clone(), Session { user, last_seen: Instant::now() });
        token
    }

    /// Validates the token, refreshes its idle timer and returns the user.
    pub fn current(&self, token: &str) -> AppResult<SessionUser> {
        let mut map = self.sessions.lock().unwrap_or_else(|p| p.into_inner());
        match map.get_mut(token) {
            Some(s) if s.last_seen.elapsed() < self.idle_timeout => {
                s.last_seen = Instant::now();
                Ok(s.user.clone())
            }
            Some(_) => {
                map.remove(token);
                Err(AppError::Unauthenticated)
            }
            None => Err(AppError::Unauthenticated),
        }
    }

    pub fn authorize(&self, token: &str, permission: Permission) -> AppResult<SessionUser> {
        let user = self.current(token)?;
        if user.role.has(permission) {
            Ok(user)
        } else {
            Err(AppError::Forbidden)
        }
    }

    pub fn revoke(&self, token: &str) -> Option<SessionUser> {
        self.sessions.lock().unwrap_or_else(|p| p.into_inner()).remove(token).map(|s| s.user)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn user(role: Role) -> SessionUser {
        SessionUser {
            id: "u1".into(),
            username: "u".into(),
            full_name: "U".into(),
            role,
            permissions: role.permissions().to_vec(),
        }
    }

    #[test]
    fn token_lifecycle() {
        let m = SessionManager::default();
        let t = m.create(user(Role::Cashier));
        assert_eq!(t.len(), 64);
        assert!(m.current(&t).is_ok());
        assert!(matches!(m.authorize(&t, Permission::CompanyManage), Err(AppError::Forbidden)));
        assert!(m.authorize(&t, Permission::PosOperate).is_ok());
        m.revoke(&t);
        assert!(matches!(m.current(&t), Err(AppError::Unauthenticated)));
        assert!(matches!(m.current("forged"), Err(AppError::Unauthenticated)));
    }

    #[test]
    fn idle_sessions_expire() {
        let m = SessionManager::with_timeout(Duration::from_millis(1));
        let t = m.create(user(Role::Admin));
        std::thread::sleep(Duration::from_millis(5));
        assert!(matches!(m.current(&t), Err(AppError::Unauthenticated)));
    }
}
