use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;

use crate::domain::user::Role;
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone)]
pub struct UserRow {
    pub id: String,
    pub username: String,
    pub full_name: String,
    pub password_hash: String,
    pub role: Role,
    pub is_active: bool,
    pub failed_attempts: i64,
    pub locked_until: Option<String>,
    pub last_login_at: Option<String>,
    pub created_at: String,
}

/// Safe projection for the UI (no password hash).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserSummary {
    pub id: String,
    pub username: String,
    pub full_name: String,
    pub role: Role,
    pub is_active: bool,
    pub last_login_at: Option<String>,
    pub created_at: String,
}

impl From<&UserRow> for UserSummary {
    fn from(u: &UserRow) -> Self {
        UserSummary {
            id: u.id.clone(),
            username: u.username.clone(),
            full_name: u.full_name.clone(),
            role: u.role,
            is_active: u.is_active,
            last_login_at: u.last_login_at.clone(),
            created_at: u.created_at.clone(),
        }
    }
}

const COLUMNS: &str = "id, username, full_name, password_hash, role, is_active, failed_attempts, locked_until,
    last_login_at, created_at";

fn row_to_user(r: &rusqlite::Row<'_>) -> rusqlite::Result<UserRow> {
    let role: String = r.get(4)?;
    Ok(UserRow {
        id: r.get(0)?,
        username: r.get(1)?,
        full_name: r.get(2)?,
        password_hash: r.get(3)?,
        role: Role::parse(&role).ok_or_else(|| {
            rusqlite::Error::FromSqlConversionFailure(4, rusqlite::types::Type::Text, "unknown role".into())
        })?,
        is_active: r.get(5)?,
        failed_attempts: r.get(6)?,
        locked_until: r.get(7)?,
        last_login_at: r.get(8)?,
        created_at: r.get(9)?,
    })
}

pub fn count(conn: &Connection) -> AppResult<i64> {
    Ok(conn.query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))?)
}

pub fn insert(
    conn: &Connection,
    id: &str,
    username: &str,
    full_name: &str,
    password_hash: &str,
    role: Role,
) -> AppResult<()> {
    let now = crate::now_utc();
    conn.execute(
        "INSERT INTO users (id, username, full_name, password_hash, role, password_changed_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?6)",
        params![id, username, full_name, password_hash, role.as_str(), now],
    )
    .map_err(|e| match e {
        rusqlite::Error::SqliteFailure(f, _) if f.code == rusqlite::ErrorCode::ConstraintViolation => {
            AppError::validation("username", "username_taken")
        }
        other => other.into(),
    })?;
    Ok(())
}

pub fn find_by_username(conn: &Connection, username: &str) -> AppResult<Option<UserRow>> {
    Ok(conn
        .query_row(&format!("SELECT {COLUMNS} FROM users WHERE username = ?1"), [username], row_to_user)
        .optional()?)
}

pub fn find_by_id(conn: &Connection, id: &str) -> AppResult<Option<UserRow>> {
    Ok(conn.query_row(&format!("SELECT {COLUMNS} FROM users WHERE id = ?1"), [id], row_to_user).optional()?)
}

pub fn list(conn: &Connection) -> AppResult<Vec<UserRow>> {
    let mut stmt = conn.prepare(&format!("SELECT {COLUMNS} FROM users ORDER BY created_at"))?;
    let rows = stmt.query_map([], row_to_user)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn record_failed_login(conn: &Connection, id: &str, attempts: i64, locked_until: Option<&str>) -> AppResult<()> {
    conn.execute(
        "UPDATE users SET failed_attempts = ?2, locked_until = ?3, updated_at = ?4 WHERE id = ?1",
        params![id, attempts, locked_until, crate::now_utc()],
    )?;
    Ok(())
}

pub fn record_successful_login(conn: &Connection, id: &str, new_hash: Option<&str>) -> AppResult<()> {
    let now = crate::now_utc();
    conn.execute(
        "UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = ?2, updated_at = ?2,
            password_hash = COALESCE(?3, password_hash)
         WHERE id = ?1",
        params![id, now, new_hash],
    )?;
    Ok(())
}
