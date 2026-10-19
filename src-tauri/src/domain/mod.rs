//! Pure business rules. Nothing in this module touches the database, the file
//! system or Tauri, which keeps it trivially unit-testable.

pub mod accounting;
pub mod company;
pub mod money;
pub mod user;
pub mod validation;
