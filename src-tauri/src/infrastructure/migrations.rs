//! Forward-only, checksummed schema migrations.
//!
//! Migrations are embedded into the binary. Each one runs inside its own
//! transaction together with its bookkeeping row. The SHA-256 of every applied
//! script is stored; if a shipped script is later edited, startup fails
//! instead of leaving databases in diverging states.

use rusqlite::{params, Connection};
use sha2::{Digest, Sha256};

use crate::error::{AppError, AppResult};

pub struct Migration {
    pub version: i64,
    pub name: &'static str,
    pub sql: &'static str,
}

pub const MIGRATIONS: &[Migration] = &[
    Migration { version: 1, name: "core", sql: include_str!("../../migrations/0001_core.sql") },
    Migration { version: 2, name: "ledger", sql: include_str!("../../migrations/0002_ledger.sql") },
];

fn checksum(sql: &str) -> String {
    hex::encode(Sha256::digest(sql.as_bytes()))
}

pub fn run(conn: &mut Connection) -> AppResult<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version    INTEGER PRIMARY KEY NOT NULL,
            name       TEXT NOT NULL,
            checksum   TEXT NOT NULL,
            applied_at TEXT NOT NULL
        );",
    )?;

    let applied: Vec<(i64, String)> = {
        let mut stmt = conn.prepare("SELECT version, checksum FROM schema_migrations ORDER BY version")?;
        let rows = stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?;
        rows.collect::<Result<_, _>>()?
    };

    if let Some((max, _)) = applied.last() {
        if *max > MIGRATIONS.last().map_or(0, |m| m.version) {
            return Err(AppError::Internal(format!(
                "database schema version {max} is newer than this application; please update the program"
            )));
        }
    }

    for m in MIGRATIONS {
        let sum = checksum(m.sql);
        if let Some((_, stored)) = applied.iter().find(|(v, _)| *v == m.version) {
            if *stored != sum {
                return Err(AppError::Internal(format!("migration {} ({}) checksum mismatch", m.version, m.name)));
            }
            continue;
        }
        let tx = conn.transaction()?;
        tx.execute_batch(m.sql)?;
        tx.execute(
            "INSERT INTO schema_migrations (version, name, checksum, applied_at) VALUES (?1, ?2, ?3, ?4)",
            params![m.version, m.name, sum, crate::now_utc()],
        )?;
        tx.commit()?;
        log::info!("applied migration {} ({})", m.version, m.name);
    }
    Ok(())
}

pub fn current_version(conn: &Connection) -> AppResult<i64> {
    Ok(conn.query_row("SELECT COALESCE(MAX(version), 0) FROM schema_migrations", [], |r| r.get(0))?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn versions_are_strictly_increasing() {
        for w in MIGRATIONS.windows(2) {
            assert!(w[0].version < w[1].version);
        }
    }

    #[test]
    fn migrations_apply_and_are_idempotent() {
        let mut conn = Connection::open_in_memory().unwrap();
        run(&mut conn).unwrap();
        run(&mut conn).unwrap();
        assert_eq!(current_version(&conn).unwrap(), MIGRATIONS.last().unwrap().version);
    }

    #[test]
    fn tampered_migration_is_detected() {
        let mut conn = Connection::open_in_memory().unwrap();
        run(&mut conn).unwrap();
        conn.execute("UPDATE schema_migrations SET checksum = 'x' WHERE version = 1", []).unwrap();
        assert!(run(&mut conn).is_err());
    }
}
