//! Argon2id password hashing (RFC 9106).

use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::{Algorithm, Argon2, Params, Version};

use crate::error::{AppError, AppResult};

/// 64 MiB memory, 3 passes, 1 lane — above the OWASP 2024 minimum
/// (19 MiB, t=2) while keeping login under ~0.5 s on office hardware.
const MEMORY_KIB: u32 = 64 * 1024;
const ITERATIONS: u32 = 3;
const PARALLELISM: u32 = 1;

fn hasher() -> Argon2<'static> {
    let params = Params::new(MEMORY_KIB, ITERATIONS, PARALLELISM, None).expect("static Argon2 params are valid");
    Argon2::new(Algorithm::Argon2id, Version::V0x13, params)
}

/// Returns a self-describing PHC string including a fresh random salt.
pub fn hash_password(password: &str) -> AppResult<String> {
    let salt = SaltString::generate(&mut OsRng);
    hasher()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| AppError::Internal(format!("argon2 hash: {e}")))
}

/// Constant-time verification. Parameters are read from the stored hash, so
/// old hashes keep working if the defaults above are raised later.
pub fn verify_password(password: &str, phc: &str) -> bool {
    match PasswordHash::new(phc) {
        Ok(parsed) => {
            parsed.algorithm.as_str() == "argon2id"
                && Argon2::default().verify_password(password.as_bytes(), &parsed).is_ok()
        }
        Err(_) => false,
    }
}

/// True when a stored hash uses weaker parameters than the current policy.
pub fn needs_rehash(phc: &str) -> bool {
    let Ok(parsed) = PasswordHash::new(phc) else { return true };
    let Ok(params) = Params::try_from(&parsed) else { return true };
    params.m_cost() < MEMORY_KIB || params.t_cost() < ITERATIONS
}

/// A valid hash of a random value, used to spend the same time verifying when
/// the username does not exist (prevents user enumeration by timing).
pub fn dummy_hash() -> &'static str {
    use std::sync::OnceLock;
    static DUMMY: OnceLock<String> = OnceLock::new();
    DUMMY.get_or_init(|| {
        let random = uuid::Uuid::new_v4().to_string();
        hash_password(&random).expect("hashing a random value succeeds")
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_and_verify() {
        let h = hash_password("Strong#Pass2026").unwrap();
        assert!(h.starts_with("$argon2id$v=19$m=65536,t=3,p=1$"));
        assert!(verify_password("Strong#Pass2026", &h));
        assert!(!verify_password("strong#pass2026", &h));
        assert!(!needs_rehash(&h));
    }

    #[test]
    fn salts_are_unique() {
        assert_ne!(hash_password("same").unwrap(), hash_password("same").unwrap());
    }

    #[test]
    fn garbage_hash_never_verifies() {
        assert!(!verify_password("x", "not-a-hash"));
        assert!(!verify_password("x", ""));
    }
}
