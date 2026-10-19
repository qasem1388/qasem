//! Unified application error type.
//!
//! Every error crossing the Tauri boundary is serialised as
//! `{ code, message, fields }`. `code` is a stable machine-readable key the UI
//! translates; `message` is an Arabic fallback; internal details (SQL text,
//! file paths) are logged but never sent to the UI.

use serde::Serialize;

use crate::domain::accounting::AccountingError;
use crate::domain::validation::FieldError;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("بيانات غير صالحة")]
    Validation(Vec<FieldError>),
    #[error("اسم المستخدم أو كلمة المرور غير صحيحة")]
    InvalidCredentials,
    #[error("الحساب مقفل مؤقتًا بسبب محاولات دخول فاشلة متكررة")]
    AccountLocked { minutes_remaining: i64 },
    #[error("الحساب معطّل")]
    AccountDisabled,
    #[error("انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى")]
    Unauthenticated,
    #[error("ليست لديك صلاحية لتنفيذ هذا الإجراء")]
    Forbidden,
    #[error("العنصر المطلوب غير موجود")]
    NotFound,
    #[error("تم إعداد البرنامج مسبقًا")]
    AlreadyInitialized,
    #[error("لم يتم إعداد البرنامج بعد")]
    NotInitialized,
    #[error("{0}")]
    Accounting(#[from] AccountingError),
    #[error("تعذر الوصول إلى قاعدة البيانات")]
    Database(String),
    #[error("خطأ أمني: تعذر الوصول إلى مفتاح التشفير")]
    Security(String),
    #[error("حدث خطأ داخلي غير متوقع")]
    Internal(String),
}

impl AppError {
    pub fn code(&self) -> &'static str {
        match self {
            AppError::Validation(_) => "validation",
            AppError::InvalidCredentials => "invalid_credentials",
            AppError::AccountLocked { .. } => "account_locked",
            AppError::AccountDisabled => "account_disabled",
            AppError::Unauthenticated => "unauthenticated",
            AppError::Forbidden => "forbidden",
            AppError::NotFound => "not_found",
            AppError::AlreadyInitialized => "already_initialized",
            AppError::NotInitialized => "not_initialized",
            AppError::Accounting(e) => e.code(),
            AppError::Database(_) => "database",
            AppError::Security(_) => "security",
            AppError::Internal(_) => "internal",
        }
    }

    pub fn validation(field: &str, code: &str) -> Self {
        AppError::Validation(vec![FieldError::new(field, code)])
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        // Triggers raise errors prefixed with a known marker; map them back to
        // accounting errors so DB-level guards produce friendly messages too.
        let text = e.to_string();
        if let Some(acc) = AccountingError::from_db_message(&text) {
            return AppError::Accounting(acc);
        }
        log::error!("database error: {text}");
        AppError::Database(text)
    }
}

#[derive(Serialize)]
struct WireError<'a> {
    code: &'a str,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    fields: Option<&'a [FieldError]>,
    #[serde(skip_serializing_if = "Option::is_none")]
    minutes_remaining: Option<i64>,
}

impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let fields = match self {
            AppError::Validation(f) => Some(f.as_slice()),
            _ => None,
        };
        let minutes_remaining = match self {
            AppError::AccountLocked { minutes_remaining } => Some(*minutes_remaining),
            _ => None,
        };
        WireError { code: self.code(), message: self.to_string(), fields, minutes_remaining }.serialize(s)
    }
}

pub type AppResult<T> = Result<T, AppError>;
