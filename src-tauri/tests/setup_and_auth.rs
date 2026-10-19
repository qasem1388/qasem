mod common;

use hesabati_lib::application::auth_service::{self, LoginInput, MAX_FAILED_ATTEMPTS};
use hesabati_lib::application::session::SessionManager;
use hesabati_lib::application::{company_service, setup_service, users_service};
use hesabati_lib::domain::accounting::AccountingError;
use hesabati_lib::domain::user::{Permission, Role};
use hesabati_lib::error::AppError;
use hesabati_lib::infrastructure::keystore::DbKey;

fn login(f: &common::Fixture, user: &str, pass: &str) -> Result<auth_service::LoginResult, AppError> {
    auth_service::login(&f.db, &f.sessions, LoginInput { username: user.into(), password: pass.into() })
}

#[test]
fn setup_runs_exactly_once() {
    let f = common::initialized();
    let err = setup_service::initialize(&f.db, common::setup_input()).unwrap_err();
    assert!(matches!(err, AppError::AlreadyInitialized));
    assert_eq!(users_service::list(&f.db).unwrap().len(), 1);
}

#[test]
fn setup_validates_all_fields_together() {
    let dir = tempfile::tempdir().unwrap();
    let db = common::open(&dir.path().join("v.db"), &DbKey::generate());
    let mut input = common::setup_input();
    input.company.name_ar = " ".into();
    input.company.vat_number = Some("123456789012345".into());
    input.admin.password = "weak".into();
    input.admin.password_confirm = "weak".into();
    let AppError::Validation(errors) = setup_service::initialize(&db, input).unwrap_err() else {
        panic!("expected validation error")
    };
    let fields: Vec<_> = errors.iter().map(|e| e.field.as_str()).collect();
    assert_eq!(fields, vec!["company.nameAr", "company.vatNumber", "admin.password"]);
    assert!(!setup_service::status(&db).unwrap().initialized, "nothing must be written");
}

#[test]
fn password_is_stored_as_argon2id_only() {
    let f = common::initialized();
    let hash: String =
        f.db.conn().query_row("SELECT password_hash FROM users WHERE username = 'admin'", [], |r| r.get(0)).unwrap();
    assert!(hash.starts_with("$argon2id$"));
    assert!(!hash.contains(common::ADMIN_PASS));
}

#[test]
fn login_success_and_session() {
    let f = common::initialized();
    assert_eq!(f.admin.role, Role::Admin);
    assert_eq!(f.admin.full_name, "مدير النظام");
    assert!(f.sessions.authorize(&f.token, Permission::CompanyManage).is_ok());
    // Username lookup is case-insensitive.
    assert!(login(&f, "ADMIN", common::ADMIN_PASS).is_ok());
    auth_service::logout(&f.db, &f.sessions, &f.token);
    assert!(matches!(f.sessions.current(&f.token), Err(AppError::Unauthenticated)));
}

#[test]
fn wrong_password_and_unknown_user_look_identical() {
    let f = common::initialized();
    assert!(matches!(login(&f, "admin", "Wrong#Pass2026"), Err(AppError::InvalidCredentials)));
    assert!(matches!(login(&f, "ghost", "Wrong#Pass2026"), Err(AppError::InvalidCredentials)));
    assert!(matches!(login(&f, "", ""), Err(AppError::InvalidCredentials)));
}

#[test]
fn account_locks_after_repeated_failures() {
    let f = common::initialized();
    for _ in 0..MAX_FAILED_ATTEMPTS - 1 {
        assert!(matches!(login(&f, "admin", "bad-password-1"), Err(AppError::InvalidCredentials)));
    }
    assert!(matches!(login(&f, "admin", "bad-password-1"), Err(AppError::AccountLocked { .. })));
    // Even the correct password is refused while locked.
    assert!(matches!(login(&f, "admin", common::ADMIN_PASS), Err(AppError::AccountLocked { .. })));
}

#[test]
fn company_update_requires_permission_and_is_audited() {
    let f = common::initialized();
    let mut input = common::company();
    input.name_ar = "شركة النخبة المحدودة".into();
    let updated = company_service::update(&f.db, &f.admin, input).unwrap();
    assert_eq!(updated.data.name_ar, "شركة النخبة المحدودة");

    // A cashier session may not change company settings.
    let sessions = SessionManager::default();
    let mut cashier = f.admin.clone();
    cashier.role = Role::Cashier;
    let t = sessions.create(cashier);
    assert!(matches!(sessions.authorize(&t, Permission::CompanyManage), Err(AppError::Forbidden)));

    let actions: Vec<String> = users_service::recent_audit(&f.db, 50).unwrap().into_iter().map(|a| a.action).collect();
    assert!(actions.contains(&"company.updated".to_string()));
    assert!(actions.contains(&"auth.login".to_string()));
    assert!(actions.contains(&"setup.completed".to_string()));
}

#[test]
fn audit_log_is_append_only_and_hash_chained() {
    let f = common::initialized();
    assert_eq!(users_service::verify_audit_chain(&f.db).unwrap(), None);

    let upd = f.db.conn().execute("UPDATE audit_log SET action = 'x'", []);
    let del = f.db.conn().execute("DELETE FROM audit_log", []);
    for res in [upd, del] {
        let err: AppError = res.unwrap_err().into();
        assert!(matches!(err, AppError::Accounting(AccountingError::AuditImmutable)), "got {err:?}");
    }

    // Simulate an attacker bypassing triggers with the key in hand.
    let conn = f.db.conn();
    conn.execute_batch("DROP TRIGGER trg_audit_no_update; UPDATE audit_log SET details = '{}' WHERE id = 1;").unwrap();
    drop(conn);
    assert_eq!(users_service::verify_audit_chain(&f.db).unwrap(), Some(1));
}
