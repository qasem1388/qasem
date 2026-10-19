use rusqlite::{params, Connection, OptionalExtension};

use crate::domain::company::{CalendarDisplay, Company, CompanyInput};
use crate::error::AppResult;

const COLUMNS: &str = "id, name_ar, name_en, vat_number, cr_number, phone, email, city, district, street,
    building_number, postal_code, fiscal_year_start_month, calendar_display, base_currency, created_at, updated_at";

fn row_to_company(r: &rusqlite::Row<'_>) -> rusqlite::Result<Company> {
    let calendar: String = r.get(13)?;
    Ok(Company {
        id: r.get(0)?,
        data: CompanyInput {
            name_ar: r.get(1)?,
            name_en: r.get(2)?,
            vat_number: r.get(3)?,
            cr_number: r.get(4)?,
            phone: r.get(5)?,
            email: r.get(6)?,
            city: r.get(7)?,
            district: r.get(8)?,
            street: r.get(9)?,
            building_number: r.get(10)?,
            postal_code: r.get(11)?,
            fiscal_year_start_month: r.get(12)?,
            calendar_display: CalendarDisplay::parse(&calendar).unwrap_or(CalendarDisplay::Both),
        },
        base_currency: r.get(14)?,
        created_at: r.get(15)?,
        updated_at: r.get(16)?,
    })
}

pub fn get_default(conn: &Connection) -> AppResult<Option<Company>> {
    Ok(conn
        .query_row(&format!("SELECT {COLUMNS} FROM companies WHERE is_default = 1"), [], row_to_company)
        .optional()?)
}

pub fn insert_default(conn: &Connection, id: &str, c: &CompanyInput) -> AppResult<()> {
    let now = crate::now_utc();
    conn.execute(
        "INSERT INTO companies (id, name_ar, name_en, vat_number, cr_number, phone, email, city, district, street,
            building_number, postal_code, fiscal_year_start_month, calendar_display, is_default, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, 1, ?15, ?15)",
        params![
            id,
            c.name_ar,
            c.name_en,
            c.vat_number,
            c.cr_number,
            c.phone,
            c.email,
            c.city,
            c.district,
            c.street,
            c.building_number,
            c.postal_code,
            c.fiscal_year_start_month,
            c.calendar_display.as_str(),
            now
        ],
    )?;
    Ok(())
}

pub fn update(conn: &Connection, id: &str, c: &CompanyInput) -> AppResult<usize> {
    Ok(conn.execute(
        "UPDATE companies SET name_ar = ?2, name_en = ?3, vat_number = ?4, cr_number = ?5, phone = ?6, email = ?7,
            city = ?8, district = ?9, street = ?10, building_number = ?11, postal_code = ?12,
            fiscal_year_start_month = ?13, calendar_display = ?14, updated_at = ?15
         WHERE id = ?1",
        params![
            id,
            c.name_ar,
            c.name_en,
            c.vat_number,
            c.cr_number,
            c.phone,
            c.email,
            c.city,
            c.district,
            c.street,
            c.building_number,
            c.postal_code,
            c.fiscal_year_start_month,
            c.calendar_display.as_str(),
            crate::now_utc()
        ],
    )?)
}
