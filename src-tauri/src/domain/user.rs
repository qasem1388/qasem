//! Users, roles and permissions.

use serde::{Deserialize, Serialize};

use super::validation::{FieldError, Validator};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Role {
    /// مدير النظام
    Admin,
    /// محاسب
    Accountant,
    /// كاشير
    Cashier,
}

impl Role {
    pub fn as_str(self) -> &'static str {
        match self {
            Role::Admin => "admin",
            Role::Accountant => "accountant",
            Role::Cashier => "cashier",
        }
    }

    pub fn parse(s: &str) -> Option<Role> {
        match s {
            "admin" => Some(Role::Admin),
            "accountant" => Some(Role::Accountant),
            "cashier" => Some(Role::Cashier),
            _ => None,
        }
    }

    pub fn permissions(self) -> &'static [Permission] {
        use Permission::*;
        match self {
            Role::Admin => Permission::ALL,
            Role::Accountant => &[
                DashboardView,
                CompanyView,
                AccountsView,
                AccountsManage,
                JournalView,
                JournalPost,
                LedgerView,
                SalesView,
                SalesManage,
                PurchasesView,
                PurchasesManage,
                CustomersManage,
                InventoryView,
                InventoryManage,
                CashBankManage,
                ExpensesManage,
                FixedAssetsManage,
                TaxView,
                ReportsView,
            ],
            Role::Cashier => &[DashboardView, PosOperate, SalesView, CustomersManage, InventoryView],
        }
    }

    pub fn has(self, p: Permission) -> bool {
        self.permissions().contains(&p)
    }
}

/// Fine-grained permissions. Commands check a permission, never a role, so
/// custom roles can be added later without touching command code.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Permission {
    DashboardView,
    CompanyView,
    CompanyManage,
    AccountsView,
    AccountsManage,
    JournalView,
    JournalPost,
    LedgerView,
    SalesView,
    SalesManage,
    PurchasesView,
    PurchasesManage,
    CustomersManage,
    InventoryView,
    InventoryManage,
    PosOperate,
    CashBankManage,
    ExpensesManage,
    FixedAssetsManage,
    TaxView,
    TaxManage,
    ReportsView,
    UsersManage,
    AuditView,
    PeriodsClose,
    BackupManage,
    LicenseManage,
}

impl Permission {
    pub const ALL: &'static [Permission] = &[
        Permission::DashboardView,
        Permission::CompanyView,
        Permission::CompanyManage,
        Permission::AccountsView,
        Permission::AccountsManage,
        Permission::JournalView,
        Permission::JournalPost,
        Permission::LedgerView,
        Permission::SalesView,
        Permission::SalesManage,
        Permission::PurchasesView,
        Permission::PurchasesManage,
        Permission::CustomersManage,
        Permission::InventoryView,
        Permission::InventoryManage,
        Permission::PosOperate,
        Permission::CashBankManage,
        Permission::ExpensesManage,
        Permission::FixedAssetsManage,
        Permission::TaxView,
        Permission::TaxManage,
        Permission::ReportsView,
        Permission::UsersManage,
        Permission::AuditView,
        Permission::PeriodsClose,
        Permission::BackupManage,
        Permission::LicenseManage,
    ];
}

pub const PASSWORD_MIN_CHARS: usize = 10;
pub const PASSWORD_MAX_CHARS: usize = 128;

/// Username: 3–32 chars, ASCII letters, digits, `.`, `_`, `-`, starting with a letter.
pub fn is_valid_username(s: &str) -> bool {
    let len = s.len();
    (3..=32).contains(&len)
        && s.chars().next().is_some_and(|c| c.is_ascii_alphabetic())
        && s.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-'))
}

/// Password policy: at least 10 characters, at least one letter (any script)
/// and one digit, not containing the username.
pub fn validate_password(field: &str, password: &str, username: &str, v: &mut Validator) {
    let chars = password.chars().count();
    if chars == 0 {
        v.add(field, "required");
        return;
    }
    if chars < PASSWORD_MIN_CHARS {
        v.add(field, "password_too_short");
    } else if chars > PASSWORD_MAX_CHARS {
        v.add(field, "too_long");
    } else if !password.chars().any(char::is_alphabetic) || !password.chars().any(|c| c.is_ascii_digit()) {
        v.add(field, "password_weak");
    } else if !username.is_empty() && password.to_lowercase().contains(&username.to_lowercase()) {
        v.add(field, "password_contains_username");
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewAdminInput {
    pub username: String,
    pub full_name: String,
    pub password: String,
    pub password_confirm: String,
}

impl NewAdminInput {
    pub fn validate(&self) -> Result<(), Vec<FieldError>> {
        let mut v = Validator::new();
        if self.username.trim().is_empty() {
            v.add("admin.username", "required");
        } else if !is_valid_username(self.username.trim()) {
            v.add("admin.username", "invalid_username");
        }
        v.required("admin.fullName", &self.full_name, 100);
        validate_password("admin.password", &self.password, self.username.trim(), &mut v);
        if self.password != self.password_confirm {
            v.add("admin.passwordConfirm", "password_mismatch");
        }
        v.finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn role_permissions_are_separated() {
        assert!(Role::Admin.has(Permission::UsersManage));
        assert!(!Role::Accountant.has(Permission::UsersManage));
        assert!(Role::Accountant.has(Permission::JournalPost));
        assert!(!Role::Cashier.has(Permission::JournalPost));
        assert!(Role::Cashier.has(Permission::PosOperate));
        assert!(!Role::Cashier.has(Permission::CompanyManage));
    }

    #[test]
    fn username_rules() {
        assert!(is_valid_username("admin"));
        assert!(is_valid_username("a.ali_2"));
        assert!(!is_valid_username("ab"));
        assert!(!is_valid_username("1admin"));
        assert!(!is_valid_username("مدير"));
        assert!(!is_valid_username("ad min"));
    }

    fn pw_errors(pw: &str, user: &str) -> Vec<String> {
        let mut v = Validator::new();
        validate_password("p", pw, user, &mut v);
        v.finish().err().unwrap_or_default().into_iter().map(|e| e.code).collect()
    }

    #[test]
    fn password_policy() {
        assert!(pw_errors("Strong#Pass2026", "admin").is_empty());
        assert!(pw_errors("كلمةمرور2026قوية", "admin").is_empty()); // Arabic letters accepted
        assert_eq!(pw_errors("short1", "x"), vec!["password_too_short"]);
        assert_eq!(pw_errors("onlyletterspassword", "x"), vec!["password_weak"]);
        assert_eq!(pw_errors("1234567890123", "x"), vec!["password_weak"]);
        assert_eq!(pw_errors("myadmin12345", "admin"), vec!["password_contains_username"]);
    }

    #[test]
    fn admin_input_mismatch() {
        let input = NewAdminInput {
            username: "admin".into(),
            full_name: "مدير النظام".into(),
            password: "Strong#Pass2026".into(),
            password_confirm: "Other#Pass2026".into(),
        };
        let errs = input.validate().unwrap_err();
        assert_eq!(errs, vec![FieldError::new("admin.passwordConfirm", "password_mismatch")]);
    }
}
