//! Data access. Functions take a `&Connection` so callers decide the
//! transaction boundary (`rusqlite::Transaction` derefs to `Connection`).

pub mod audit_repo;
pub mod company_repo;
pub mod ledger_repo;
pub mod user_repo;
