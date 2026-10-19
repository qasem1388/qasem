#![allow(dead_code)]

use std::path::Path;

use hesabati_lib::application::auth_service::{self, LoginInput};
use hesabati_lib::application::session::{SessionManager, SessionUser};
use hesabati_lib::application::setup_service::{self, SetupInput};
use hesabati_lib::domain::company::{CalendarDisplay, CompanyInput};
use hesabati_lib::domain::user::NewAdminInput;
use hesabati_lib::infrastructure::db::Database;
use hesabati_lib::infrastructure::keystore::DbKey;

pub const ADMIN_USER: &str = "admin";
pub const ADMIN_PASS: &str = "Strong#Pass2026";

pub fn company() -> CompanyInput {
    CompanyInput {
        name_ar: "مؤسسة النخبة التجارية".into(),
        name_en: Some("Al Nukhba Trading".into()),
        vat_number: Some("310123456700003".into()),
        cr_number: Some("1010123456".into()),
        phone: Some("0551234567".into()),
        email: Some("info@nukhba.sa".into()),
        city: "الرياض".into(),
        district: Some("العليا".into()),
        street: None,
        building_number: Some("1234".into()),
        postal_code: Some("12211".into()),
        fiscal_year_start_month: 1,
        calendar_display: CalendarDisplay::Both,
    }
}

pub fn setup_input() -> SetupInput {
    SetupInput {
        company: company(),
        admin: NewAdminInput {
            username: ADMIN_USER.into(),
            full_name: "مدير النظام".into(),
            password: ADMIN_PASS.into(),
            password_confirm: ADMIN_PASS.into(),
        },
    }
}

pub fn open(path: &Path, key: &DbKey) -> Database {
    Database::open(path, key).expect("open encrypted database")
}

/// Fresh encrypted database with company + admin, and a logged-in admin.
pub struct Fixture {
    pub _dir: tempfile::TempDir,
    pub db: Database,
    pub sessions: SessionManager,
    pub admin: SessionUser,
    pub token: String,
}

pub fn initialized() -> Fixture {
    let dir = tempfile::tempdir().unwrap();
    let key = DbKey::generate();
    let db = open(&dir.path().join("t.db"), &key);
    setup_service::initialize(&db, setup_input()).unwrap();
    let sessions = SessionManager::default();
    let res =
        auth_service::login(&db, &sessions, LoginInput { username: ADMIN_USER.into(), password: ADMIN_PASS.into() })
            .unwrap();
    Fixture { _dir: dir, db, sessions, admin: res.user, token: res.token }
}
