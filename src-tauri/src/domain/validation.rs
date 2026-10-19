//! Field-level validation primitives shared by all domain inputs.

use serde::Serialize;

/// A single invalid field. `code` is a stable key translated by the UI
/// (e.g. `required`, `too_long`, `invalid_vat_number`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct FieldError {
    pub field: String,
    pub code: String,
}

impl FieldError {
    pub fn new(field: &str, code: &str) -> Self {
        Self { field: field.to_owned(), code: code.to_owned() }
    }
}

/// Collects errors so a form can show every problem at once.
#[derive(Debug, Default)]
pub struct Validator {
    errors: Vec<FieldError>,
}

impl Validator {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn add(&mut self, field: &str, code: &str) {
        self.errors.push(FieldError::new(field, code));
    }

    pub fn has(&self, field: &str) -> bool {
        self.errors.iter().any(|e| e.field == field)
    }

    pub fn required(&mut self, field: &str, value: &str, max_chars: usize) {
        let len = value.trim().chars().count();
        if len == 0 {
            self.add(field, "required");
        } else if len > max_chars {
            self.add(field, "too_long");
        }
    }

    pub fn optional_max(&mut self, field: &str, value: Option<&str>, max_chars: usize) {
        if let Some(v) = value {
            if v.trim().chars().count() > max_chars {
                self.add(field, "too_long");
            }
        }
    }

    /// Runs `check` only when the optional value is present and non-empty.
    pub fn optional_with(&mut self, field: &str, value: Option<&str>, code: &str, check: fn(&str) -> bool) {
        if let Some(v) = value.map(str::trim).filter(|v| !v.is_empty()) {
            if !check(v) {
                self.add(field, code);
            }
        }
    }

    pub fn finish(self) -> Result<(), Vec<FieldError>> {
        if self.errors.is_empty() {
            Ok(())
        } else {
            Err(self.errors)
        }
    }
}

fn all_ascii_digits(s: &str, len: usize) -> bool {
    s.len() == len && s.bytes().all(|b| b.is_ascii_digit())
}

/// Saudi VAT registration number: 15 digits, starting and ending with `3`.
pub fn is_valid_vat_number(s: &str) -> bool {
    all_ascii_digits(s, 15) && s.starts_with('3') && s.ends_with('3')
}

/// Commercial registration (السجل التجاري): 10 digits.
pub fn is_valid_cr_number(s: &str) -> bool {
    all_ascii_digits(s, 10)
}

/// Saudi national address postal code: 5 digits.
pub fn is_valid_postal_code(s: &str) -> bool {
    all_ascii_digits(s, 5)
}

/// National address building number: 4 digits.
pub fn is_valid_building_number(s: &str) -> bool {
    all_ascii_digits(s, 4)
}

/// Accepts Saudi mobile/landline numbers in local (05xxxxxxxx / 01xxxxxxxx)
/// or international (+9665xxxxxxxx / 009665xxxxxxxx) form. Spaces and dashes
/// are ignored.
pub fn is_valid_phone(s: &str) -> bool {
    let compact: String = s.chars().filter(|c| !matches!(c, ' ' | '-')).collect();
    let national = if let Some(rest) = compact.strip_prefix("+966") {
        format!("0{rest}")
    } else if let Some(rest) = compact.strip_prefix("00966") {
        format!("0{rest}")
    } else {
        compact
    };
    all_ascii_digits(&national, 10) && national.starts_with('0') && !national.starts_with("00")
}

/// Pragmatic e-mail check (one `@`, non-empty local part, dotted domain).
pub fn is_valid_email(s: &str) -> bool {
    let mut parts = s.split('@');
    let (Some(local), Some(domain), None) = (parts.next(), parts.next(), parts.next()) else {
        return false;
    };
    !local.is_empty()
        && !s.chars().any(char::is_whitespace)
        && domain.contains('.')
        && !domain.starts_with('.')
        && !domain.ends_with('.')
        && s.len() <= 254
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vat_number_rules() {
        assert!(is_valid_vat_number("300000000000003"));
        assert!(!is_valid_vat_number("300000000000001")); // must end with 3
        assert!(!is_valid_vat_number("100000000000003")); // must start with 3
        assert!(!is_valid_vat_number("30000000000003")); // 14 digits
        assert!(!is_valid_vat_number("3000000000000٠3")); // Arabic-Indic digit
    }

    #[test]
    fn cr_and_postal_and_building() {
        assert!(is_valid_cr_number("1010123456"));
        assert!(!is_valid_cr_number("101012345"));
        assert!(is_valid_postal_code("12345"));
        assert!(!is_valid_postal_code("1234a"));
        assert!(is_valid_building_number("7788"));
        assert!(!is_valid_building_number("778"));
    }

    #[test]
    fn phone_formats() {
        assert!(is_valid_phone("0551234567"));
        assert!(is_valid_phone("+966 55 123 4567"));
        assert!(is_valid_phone("00966551234567"));
        assert!(is_valid_phone("0112345678"));
        assert!(!is_valid_phone("12345"));
        assert!(!is_valid_phone("0055123456"));
    }

    #[test]
    fn email_format() {
        assert!(is_valid_email("info@example.sa"));
        assert!(!is_valid_email("info@example"));
        assert!(!is_valid_email("a b@example.sa"));
        assert!(!is_valid_email("a@@example.sa"));
    }

    #[test]
    fn validator_collects_all_errors() {
        let mut v = Validator::new();
        v.required("name", "  ", 10);
        v.required("city", "abcdefghijk", 10);
        let errs = v.finish().unwrap_err();
        assert_eq!(errs, vec![FieldError::new("name", "required"), FieldError::new("city", "too_long")]);
    }
}
