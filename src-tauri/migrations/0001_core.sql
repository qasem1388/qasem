-- 0001_core: companies, users, audit log.
-- Dates/times are ISO-8601 UTC text (Gregorian). Hijri is display-only.

CREATE TABLE companies (
    id                      TEXT PRIMARY KEY NOT NULL,
    name_ar                 TEXT NOT NULL CHECK (length(trim(name_ar)) BETWEEN 1 AND 150),
    name_en                 TEXT CHECK (name_en IS NULL OR length(name_en) <= 150),
    vat_number              TEXT CHECK (vat_number IS NULL OR (length(vat_number) = 15 AND vat_number GLOB '3*3' AND vat_number NOT GLOB '*[^0-9]*')),
    cr_number               TEXT CHECK (cr_number IS NULL OR (length(cr_number) = 10 AND cr_number NOT GLOB '*[^0-9]*')),
    phone                   TEXT CHECK (phone IS NULL OR length(phone) <= 20),
    email                   TEXT CHECK (email IS NULL OR length(email) <= 254),
    city                    TEXT NOT NULL CHECK (length(trim(city)) BETWEEN 1 AND 80),
    district                TEXT,
    street                  TEXT,
    building_number         TEXT CHECK (building_number IS NULL OR (length(building_number) = 4 AND building_number NOT GLOB '*[^0-9]*')),
    postal_code             TEXT CHECK (postal_code IS NULL OR (length(postal_code) = 5 AND postal_code NOT GLOB '*[^0-9]*')),
    base_currency           TEXT NOT NULL DEFAULT 'SAR' CHECK (base_currency = 'SAR'),
    fiscal_year_start_month INTEGER NOT NULL DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
    calendar_display        TEXT NOT NULL DEFAULT 'both' CHECK (calendar_display IN ('gregorian', 'hijri', 'both')),
    is_default              INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
    created_at              TEXT NOT NULL,
    updated_at              TEXT NOT NULL
);

-- At most one default company (multi-company support is prepared, not yet exposed).
CREATE UNIQUE INDEX ux_companies_default ON companies (is_default) WHERE is_default = 1;

CREATE TABLE users (
    id                  TEXT PRIMARY KEY NOT NULL,
    username            TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(username) BETWEEN 3 AND 32),
    full_name           TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 100),
    -- Argon2id PHC string ($argon2id$v=19$m=...,t=...,p=...$salt$hash). Never plaintext.
    password_hash       TEXT NOT NULL CHECK (password_hash LIKE '$argon2id$%'),
    role                TEXT NOT NULL CHECK (role IN ('admin', 'accountant', 'cashier')),
    is_active           INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    failed_attempts     INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
    locked_until        TEXT,
    last_login_at       TEXT,
    password_changed_at TEXT NOT NULL,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

-- Append-only, hash-chained audit trail. Each row's hash covers the previous
-- row's hash, so removing or editing a row (even with direct file access and
-- the key) is detectable by `audit_repo::verify_chain`.
CREATE TABLE audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    occurred_at TEXT NOT NULL,
    user_id     TEXT,
    username    TEXT,
    action      TEXT NOT NULL,
    entity_type TEXT,
    entity_id   TEXT,
    details     TEXT,
    prev_hash   TEXT NOT NULL,
    hash        TEXT NOT NULL UNIQUE
);

CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON audit_log
BEGIN
    SELECT RAISE(ABORT, 'HESABATI:audit_immutable');
END;

CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON audit_log
BEGIN
    SELECT RAISE(ABORT, 'HESABATI:audit_immutable');
END;

CREATE TABLE app_settings (
    key        TEXT PRIMARY KEY NOT NULL,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
