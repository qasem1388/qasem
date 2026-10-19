//! The database file must be unreadable without the key, and data must
//! survive closing and reopening the program.

mod common;

use hesabati_lib::application::{company_service, setup_service};
use hesabati_lib::error::AppError;
use hesabati_lib::infrastructure::db::Database;
use hesabati_lib::infrastructure::keystore::{resolve_key, DbKey, MemoryKeyStore};

#[test]
fn file_is_encrypted_at_rest() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("enc.db");
    let key = DbKey::generate();
    {
        let db = common::open(&path, &key);
        setup_service::initialize(&db, common::setup_input()).unwrap();
        db.conn().execute_batch("PRAGMA wal_checkpoint(TRUNCATE);").unwrap();
        assert!(!db.cipher_version().is_empty(), "SQLCipher must be linked");
    }
    let bytes = std::fs::read(&path).unwrap();
    assert!(!bytes.starts_with(b"SQLite format 3"), "plain SQLite header found: file is NOT encrypted");
    let needle = "مؤسسة النخبة".as_bytes();
    assert!(!bytes.windows(needle.len()).any(|w| w == needle), "company name readable in file");
    assert!(!bytes.windows(5).any(|w| w == b"admin"), "username readable in file");
}

#[test]
fn wrong_key_is_rejected() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("enc.db");
    drop(common::open(&path, &DbKey::generate()));
    let err = Database::open(&path, &DbKey::generate()).err().expect("must fail with wrong key");
    assert!(matches!(err, AppError::Security(_)), "got {err:?}");
}

#[test]
fn company_settings_persist_across_restarts() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("persist.db");
    let store = MemoryKeyStore::default();

    {
        let key = resolve_key(&store, path.exists()).unwrap();
        let db = common::open(&path, &key);
        setup_service::initialize(&db, common::setup_input()).unwrap();
    } // "close the program"

    let key = resolve_key(&store, path.exists()).unwrap();
    let db = common::open(&path, &key);
    let status = setup_service::status(&db).unwrap();
    assert!(status.initialized);
    assert_eq!(status.company_name.as_deref(), Some("مؤسسة النخبة التجارية"));
    let company = company_service::get(&db).unwrap();
    assert_eq!(company.data.vat_number.as_deref(), Some("310123456700003"));
    assert_eq!(company.base_currency, "SAR");
    assert!(db.integrity_check().unwrap());
}

#[test]
fn existing_database_without_key_is_not_replaced() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("x.db");
    drop(common::open(&path, &DbKey::generate()));
    // Key store was wiped (e.g. different Windows user): must not mint a new key.
    let empty = MemoryKeyStore::default();
    assert!(matches!(resolve_key(&empty, path.exists()), Err(AppError::Security(_))));
}
