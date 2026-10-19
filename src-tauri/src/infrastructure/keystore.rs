//! Database encryption key management.
//!
//! The SQLCipher key is 256 random bits generated on first launch. It is never
//! derived from, or stored in, source code. Storage backends:
//!
//! * **Windows** — Windows Credential Manager (protected by DPAPI and bound to
//!   the signed-in Windows user).
//! * **Other OSes (development only)** — a key file with `0600` permissions in
//!   the app data directory. Production macOS/Linux builds should switch to the
//!   Keychain / Secret Service before release.
//!
//! A new key is only ever generated when the database file does not exist yet,
//! so a lost key can never silently produce a fresh, empty database next to
//! the user's real data.

use rand::rngs::OsRng;
use rand::RngCore;
use zeroize::{Zeroize, Zeroizing};

use crate::error::{AppError, AppResult};

pub const KEY_LEN: usize = 32;

pub struct DbKey(Zeroizing<[u8; KEY_LEN]>);

impl DbKey {
    pub fn generate() -> Self {
        let mut bytes = Zeroizing::new([0u8; KEY_LEN]);
        OsRng.fill_bytes(bytes.as_mut());
        DbKey(bytes)
    }

    pub fn from_hex(s: &str) -> AppResult<Self> {
        let mut raw = Zeroizing::new(hex::decode(s.trim()).map_err(|_| AppError::Security("malformed key".into()))?);
        if raw.len() != KEY_LEN {
            return Err(AppError::Security("wrong key length".into()));
        }
        let mut bytes = Zeroizing::new([0u8; KEY_LEN]);
        bytes.copy_from_slice(&raw);
        raw.zeroize();
        Ok(DbKey(bytes))
    }

    pub fn to_hex(&self) -> Zeroizing<String> {
        Zeroizing::new(hex::encode(self.0.as_ref()))
    }
}

impl std::fmt::Debug for DbKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("DbKey(<redacted>)")
    }
}

pub trait KeyStore: Send + Sync {
    fn load(&self) -> AppResult<Option<DbKey>>;
    fn store(&self, key: &DbKey) -> AppResult<()>;
}

/// Loads the key, creating one only for a brand-new database.
pub fn resolve_key(store: &dyn KeyStore, database_exists: bool) -> AppResult<DbKey> {
    if let Some(key) = store.load()? {
        return Ok(key);
    }
    if database_exists {
        return Err(AppError::Security("database exists but its encryption key is missing from secure storage".into()));
    }
    let key = DbKey::generate();
    store.store(&key)?;
    // Read back to make sure the key really persisted before any data is
    // encrypted with it.
    match store.load()? {
        Some(k) if k.to_hex() == key.to_hex() => Ok(k),
        _ => Err(AppError::Security("key store did not persist the key".into())),
    }
}

/// In-memory store for tests.
#[derive(Default)]
pub struct MemoryKeyStore(std::sync::Mutex<Option<Zeroizing<String>>>);

impl KeyStore for MemoryKeyStore {
    fn load(&self) -> AppResult<Option<DbKey>> {
        self.0.lock().unwrap().as_ref().map(|h| DbKey::from_hex(h)).transpose()
    }

    fn store(&self, key: &DbKey) -> AppResult<()> {
        *self.0.lock().unwrap() = Some(key.to_hex());
        Ok(())
    }
}

#[cfg(windows)]
pub struct WindowsCredentialStore {
    service: String,
    account: String,
}

#[cfg(windows)]
impl WindowsCredentialStore {
    pub fn new(service: &str, account: &str) -> Self {
        Self { service: service.to_owned(), account: account.to_owned() }
    }

    fn entry(&self) -> AppResult<keyring::Entry> {
        keyring::Entry::new(&self.service, &self.account).map_err(|e| AppError::Security(format!("keyring: {e}")))
    }
}

#[cfg(windows)]
impl KeyStore for WindowsCredentialStore {
    fn load(&self) -> AppResult<Option<DbKey>> {
        match self.entry()?.get_password() {
            Ok(hex) => {
                let hex = Zeroizing::new(hex);
                DbKey::from_hex(&hex).map(Some)
            }
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(AppError::Security(format!("keyring read: {e}"))),
        }
    }

    fn store(&self, key: &DbKey) -> AppResult<()> {
        self.entry()?.set_password(&key.to_hex()).map_err(|e| AppError::Security(format!("keyring write: {e}")))
    }
}

/// Development fallback for non-Windows systems.
#[cfg(not(windows))]
pub struct FileKeyStore {
    path: std::path::PathBuf,
}

#[cfg(not(windows))]
impl FileKeyStore {
    pub fn new(path: std::path::PathBuf) -> Self {
        Self { path }
    }
}

#[cfg(not(windows))]
impl KeyStore for FileKeyStore {
    fn load(&self) -> AppResult<Option<DbKey>> {
        match std::fs::read_to_string(&self.path) {
            Ok(s) => {
                let s = Zeroizing::new(s);
                DbKey::from_hex(&s).map(Some)
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(AppError::Security(format!("key file read: {e}"))),
        }
    }

    fn store(&self, key: &DbKey) -> AppResult<()> {
        use std::io::Write;
        use std::os::unix::fs::OpenOptionsExt;
        let mut f = std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o600)
            .open(&self.path)
            .map_err(|e| AppError::Security(format!("key file create: {e}")))?;
        f.write_all(key.to_hex().as_bytes())
            .and_then(|_| f.sync_all())
            .map_err(|e| AppError::Security(format!("key file write: {e}")))
    }
}

/// The platform's production key store.
pub fn platform_key_store(data_dir: &std::path::Path) -> Box<dyn KeyStore> {
    #[cfg(windows)]
    {
        let _ = data_dir;
        Box::new(WindowsCredentialStore::new("Hesabati", "database-encryption-key"))
    }
    #[cfg(not(windows))]
    {
        Box::new(FileKeyStore::new(data_dir.join(".hesabati-db.key")))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keys_are_random_and_hex_roundtrip() {
        let a = DbKey::generate();
        let b = DbKey::generate();
        assert_ne!(a.to_hex(), b.to_hex());
        assert_eq!(a.to_hex().len(), 64);
        assert_eq!(DbKey::from_hex(&a.to_hex()).unwrap().to_hex(), a.to_hex());
        assert!(DbKey::from_hex("abcd").is_err());
        assert_eq!(format!("{a:?}"), "DbKey(<redacted>)");
    }

    #[test]
    fn creates_key_only_for_new_database() {
        let store = MemoryKeyStore::default();
        assert!(matches!(resolve_key(&store, true), Err(AppError::Security(_))));
        let k1 = resolve_key(&store, false).unwrap();
        let k2 = resolve_key(&store, true).unwrap();
        assert_eq!(k1.to_hex(), k2.to_hex());
    }

    #[cfg(not(windows))]
    #[test]
    fn file_store_is_private() {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempfile::tempdir().unwrap();
        let store = FileKeyStore::new(dir.path().join("k"));
        assert!(store.load().unwrap().is_none());
        let key = resolve_key(&store, false).unwrap();
        let mode = std::fs::metadata(dir.path().join("k")).unwrap().permissions().mode();
        assert_eq!(mode & 0o777, 0o600);
        assert_eq!(store.load().unwrap().unwrap().to_hex(), key.to_hex());
    }
}
