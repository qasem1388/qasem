//! Login / logout with brute-force protection.

use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;

use super::session::{SessionManager, SessionUser};
use crate::error::{AppError, AppResult};
use crate::infrastructure::db::Database;
use crate::infrastructure::password;
use crate::infrastructure::repositories::{audit_repo, user_repo};

pub const MAX_FAILED_ATTEMPTS: i64 = 5;
pub const LOCKOUT_MINUTES: i64 = 15;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginInput {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResult {
    pub token: String,
    pub user: SessionUser,
}

fn audit(db: &Database, user_id: Option<&str>, username: &str, action: &str, details: serde_json::Value) {
    let conn = db.conn();
    let res = audit_repo::append(
        &conn,
        audit_repo::NewAuditEvent {
            user_id,
            username: Some(username),
            action,
            entity_type: Some("user"),
            entity_id: user_id,
            details: Some(details),
        },
    );
    if let Err(e) = res {
        log::error!("audit append failed: {e:?}");
    }
}

pub fn login(db: &Database, sessions: &SessionManager, input: LoginInput) -> AppResult<LoginResult> {
    let username = input.username.trim();
    if username.is_empty() || input.password.is_empty() || username.len() > 64 || input.password.len() > 1024 {
        return Err(AppError::InvalidCredentials);
    }

    let user = user_repo::find_by_username(&db.conn(), username)?;
    let Some(user) = user else {
        // Same cost as a real check, so response time does not reveal
        // whether the username exists.
        let _ = password::verify_password(&input.password, password::dummy_hash());
        audit(db, None, username, "auth.login_failed", json!({ "reason": "unknown_user" }));
        return Err(AppError::InvalidCredentials);
    };

    let now = Utc::now();
    if let Some(until) = user.locked_until.as_deref().and_then(|s| DateTime::parse_from_rfc3339(s).ok()) {
        let until = until.with_timezone(&Utc);
        if until > now {
            let minutes = (until - now).num_minutes() + 1;
            return Err(AppError::AccountLocked { minutes_remaining: minutes });
        }
    }

    // Argon2 runs without holding the DB lock.
    if !password::verify_password(&input.password, &user.password_hash) {
        let attempts = user.failed_attempts + 1;
        let (stored_attempts, locked_until) = if attempts >= MAX_FAILED_ATTEMPTS {
            (0, Some(crate::to_rfc3339(now + Duration::minutes(LOCKOUT_MINUTES))))
        } else {
            (attempts, None)
        };
        user_repo::record_failed_login(&db.conn(), &user.id, stored_attempts, locked_until.as_deref())?;
        audit(db, Some(&user.id), &user.username, "auth.login_failed", json!({ "attempt": attempts }));
        if locked_until.is_some() {
            audit(db, Some(&user.id), &user.username, "auth.account_locked", json!({ "minutes": LOCKOUT_MINUTES }));
            return Err(AppError::AccountLocked { minutes_remaining: LOCKOUT_MINUTES });
        }
        return Err(AppError::InvalidCredentials);
    }

    if !user.is_active {
        return Err(AppError::AccountDisabled);
    }

    let new_hash = if password::needs_rehash(&user.password_hash) {
        Some(password::hash_password(&input.password)?)
    } else {
        None
    };
    user_repo::record_successful_login(&db.conn(), &user.id, new_hash.as_deref())?;
    audit(db, Some(&user.id), &user.username, "auth.login", json!({}));

    let session_user = SessionUser {
        id: user.id.clone(),
        username: user.username.clone(),
        full_name: user.full_name.clone(),
        role: user.role,
        permissions: user.role.permissions().to_vec(),
    };
    let token = sessions.create(session_user.clone());
    Ok(LoginResult { token, user: session_user })
}

pub fn logout(db: &Database, sessions: &SessionManager, token: &str) {
    if let Some(user) = sessions.revoke(token) {
        audit(db, Some(&user.id), &user.username, "auth.logout", json!({}));
    }
}
