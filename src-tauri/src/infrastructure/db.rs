//! Encrypted SQLite (SQLCipher 4, AES-256) connection management.

use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};

use rusqlite::Connection;

use super::keystore::DbKey;
use super::migrations;
use crate::error::{AppError, AppResult};

pub struct Database {
    conn: Mutex<Connection>,
    path: PathBuf,
    cipher_version: String,
}

impl Database {
    /// Opens (or creates) the database at `path`, unlocks it with `key`,
    /// verifies SQLCipher is active and applies pending migrations.
    pub fn open(path: &Path, key: &DbKey) -> AppResult<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| AppError::Internal(format!("create data dir: {e}")))?;
        }
        let conn = Connection::open(path)?;
        // The key is hex of random bytes, so interpolation cannot inject SQL.
        // `x'..'` makes SQLCipher use it as a raw 256-bit key (no KDF needed).
        let pragma = zeroize::Zeroizing::new(format!("PRAGMA key = \"x'{}'\";", key.to_hex().as_str()));
        conn.execute_batch(&pragma)?;

        let cipher_version: String = conn
            .query_row("PRAGMA cipher_version", [], |r| r.get(0))
            .map_err(|_| AppError::Security("SQLCipher is not available in this build".into()))?;
        if cipher_version.trim().is_empty() {
            return Err(AppError::Security("SQLCipher is not available in this build".into()));
        }

        // First real read: fails with "file is not a database" on a wrong key.
        conn.query_row("SELECT count(*) FROM sqlite_master", [], |r| r.get::<_, i64>(0))
            .map_err(|_| AppError::Security("wrong encryption key or corrupted database".into()))?;

        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA synchronous = FULL;
             PRAGMA secure_delete = ON;
             PRAGMA busy_timeout = 5000;",
        )?;

        let fk: i64 = conn.query_row("PRAGMA foreign_keys", [], |r| r.get(0))?;
        if fk != 1 {
            return Err(AppError::Internal("foreign keys could not be enabled".into()));
        }

        let mut db = Database { conn: Mutex::new(conn), path: path.to_owned(), cipher_version };
        migrations::run(db.conn.get_mut().expect("fresh mutex"))?;
        Ok(db)
    }

    pub fn conn(&self) -> MutexGuard<'_, Connection> {
        // A panic while holding the lock leaves SQLite itself consistent
        // (transactions roll back on drop), so recovering the guard is safe.
        self.conn.lock().unwrap_or_else(|p| p.into_inner())
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn cipher_version(&self) -> &str {
        &self.cipher_version
    }

    /// Runs SQLite's full integrity check plus SQLCipher's HMAC page check.
    pub fn integrity_check(&self) -> AppResult<bool> {
        let conn = self.conn();
        let quick: String = conn.query_row("PRAGMA integrity_check", [], |r| r.get(0))?;
        let mut stmt = conn.prepare("PRAGMA cipher_integrity_check")?;
        let cipher_errors = stmt.query_map([], |r| r.get::<_, String>(0))?.count();
        Ok(quick == "ok" && cipher_errors == 0)
    }
}
