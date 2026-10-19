//! Company (المنشأة) profile.

use serde::{Deserialize, Serialize};

use super::validation::{
    is_valid_building_number, is_valid_cr_number, is_valid_email, is_valid_phone, is_valid_postal_code,
    is_valid_vat_number, FieldError, Validator,
};

/// How dates are *displayed*. Storage is always Gregorian ISO-8601.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CalendarDisplay {
    Gregorian,
    Hijri,
    Both,
}

impl CalendarDisplay {
    pub fn as_str(self) -> &'static str {
        match self {
            CalendarDisplay::Gregorian => "gregorian",
            CalendarDisplay::Hijri => "hijri",
            CalendarDisplay::Both => "both",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "gregorian" => Some(Self::Gregorian),
            "hijri" => Some(Self::Hijri),
            "both" => Some(Self::Both),
            _ => None,
        }
    }
}

/// Editable company data, as submitted by the setup wizard and settings page.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CompanyInput {
    pub name_ar: String,
    pub name_en: Option<String>,
    pub vat_number: Option<String>,
    pub cr_number: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub city: String,
    pub district: Option<String>,
    pub street: Option<String>,
    pub building_number: Option<String>,
    pub postal_code: Option<String>,
    pub fiscal_year_start_month: u8,
    pub calendar_display: CalendarDisplay,
}

/// Stored company, returned to the UI.
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Company {
    pub id: String,
    #[serde(flatten)]
    pub data: CompanyInput,
    pub base_currency: String,
    pub created_at: String,
    pub updated_at: String,
}

fn clean(o: &Option<String>) -> Option<String> {
    o.as_deref().map(str::trim).filter(|s| !s.is_empty()).map(str::to_owned)
}

impl CompanyInput {
    /// Trims whitespace and turns empty optional fields into `None`.
    pub fn normalized(&self) -> CompanyInput {
        CompanyInput {
            name_ar: self.name_ar.trim().to_owned(),
            name_en: clean(&self.name_en),
            vat_number: clean(&self.vat_number),
            cr_number: clean(&self.cr_number),
            phone: clean(&self.phone),
            email: clean(&self.email).map(|e| e.to_lowercase()),
            city: self.city.trim().to_owned(),
            district: clean(&self.district),
            street: clean(&self.street),
            building_number: clean(&self.building_number),
            postal_code: clean(&self.postal_code),
            fiscal_year_start_month: self.fiscal_year_start_month,
            calendar_display: self.calendar_display,
        }
    }

    /// `prefix` lets the same rules report `company.nameAr` in the setup
    /// wizard and `nameAr` on the settings page.
    pub fn validate(&self, prefix: &str) -> Result<(), Vec<FieldError>> {
        let f = |name: &str| format!("{prefix}{name}");
        let mut v = Validator::new();
        v.required(&f("nameAr"), &self.name_ar, 150);
        v.optional_max(&f("nameEn"), self.name_en.as_deref(), 150);
        v.optional_with(&f("vatNumber"), self.vat_number.as_deref(), "invalid_vat_number", is_valid_vat_number);
        v.optional_with(&f("crNumber"), self.cr_number.as_deref(), "invalid_cr_number", is_valid_cr_number);
        v.optional_with(&f("phone"), self.phone.as_deref(), "invalid_phone", is_valid_phone);
        v.optional_with(&f("email"), self.email.as_deref(), "invalid_email", is_valid_email);
        v.required(&f("city"), &self.city, 80);
        v.optional_max(&f("district"), self.district.as_deref(), 80);
        v.optional_max(&f("street"), self.street.as_deref(), 120);
        v.optional_with(
            &f("buildingNumber"),
            self.building_number.as_deref(),
            "invalid_building_number",
            is_valid_building_number,
        );
        v.optional_with(&f("postalCode"), self.postal_code.as_deref(), "invalid_postal_code", is_valid_postal_code);
        if !(1..=12).contains(&self.fiscal_year_start_month) {
            v.add(&f("fiscalYearStartMonth"), "invalid_month");
        }
        v.finish()
    }
}

#[cfg(test)]
pub(crate) fn sample_company() -> CompanyInput {
    CompanyInput {
        name_ar: "مؤسسة النخبة التجارية".into(),
        name_en: Some("Al Nukhba Trading Est.".into()),
        vat_number: Some("310123456700003".into()),
        cr_number: Some("1010123456".into()),
        phone: Some("0551234567".into()),
        email: Some("Info@Nukhba.sa".into()),
        city: "الرياض".into(),
        district: Some("العليا".into()),
        street: Some("طريق الملك فهد".into()),
        building_number: Some("1234".into()),
        postal_code: Some("12211".into()),
        fiscal_year_start_month: 1,
        calendar_display: CalendarDisplay::Both,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_company_passes() {
        assert!(sample_company().normalized().validate("").is_ok());
    }

    #[test]
    fn normalization_trims_and_drops_empty() {
        let mut c = sample_company();
        c.name_ar = "  اسم  ".into();
        c.name_en = Some("   ".into());
        let n = c.normalized();
        assert_eq!(n.name_ar, "اسم");
        assert_eq!(n.name_en, None);
        assert_eq!(n.email.as_deref(), Some("info@nukhba.sa"));
    }

    #[test]
    fn invalid_fields_reported_with_prefix() {
        let mut c = sample_company();
        c.name_ar = String::new();
        c.vat_number = Some("123".into());
        c.fiscal_year_start_month = 13;
        let errs = c.validate("company.").unwrap_err();
        let fields: Vec<_> = errs.iter().map(|e| (e.field.as_str(), e.code.as_str())).collect();
        assert_eq!(
            fields,
            vec![
                ("company.nameAr", "required"),
                ("company.vatNumber", "invalid_vat_number"),
                ("company.fiscalYearStartMonth", "invalid_month"),
            ]
        );
    }
}
