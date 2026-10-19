//! Adapters to the outside world: the encrypted database, OS secret storage,
//! password hashing.

pub mod db;
pub mod keystore;
pub mod migrations;
pub mod password;
pub mod repositories;
