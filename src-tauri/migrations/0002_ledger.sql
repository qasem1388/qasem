-- 0002_ledger: general-ledger core (chart of accounts, fiscal periods, journal).
-- Amounts are INTEGER halalas (1 SAR = 100). No floating point anywhere.

CREATE TABLE accounts (
    id           TEXT PRIMARY KEY NOT NULL,
    code         TEXT NOT NULL UNIQUE CHECK (length(code) BETWEEN 1 AND 20),
    name_ar      TEXT NOT NULL CHECK (length(trim(name_ar)) BETWEEN 1 AND 150),
    name_en      TEXT,
    account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    parent_id    TEXT REFERENCES accounts (id) ON DELETE RESTRICT,
    -- Only leaf (postable) accounts receive journal lines; parents aggregate.
    is_postable  INTEGER NOT NULL DEFAULT 1 CHECK (is_postable IN (0, 1)),
    is_active    INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE fiscal_periods (
    id         TEXT PRIMARY KEY NOT NULL,
    name       TEXT NOT NULL,
    start_date TEXT NOT NULL CHECK (start_date = date(start_date)),
    end_date   TEXT NOT NULL CHECK (end_date = date(end_date)),
    status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    closed_at  TEXT,
    closed_by  TEXT REFERENCES users (id),
    created_at TEXT NOT NULL,
    CHECK (start_date <= end_date)
);

CREATE TRIGGER trg_period_no_overlap BEFORE INSERT ON fiscal_periods
WHEN EXISTS (SELECT 1 FROM fiscal_periods p WHERE p.start_date <= NEW.end_date AND p.end_date >= NEW.start_date)
BEGIN
    SELECT RAISE(ABORT, 'HESABATI:overlapping_period');
END;

-- Period boundaries are fixed once created; only status may change.
CREATE TRIGGER trg_period_dates_fixed BEFORE UPDATE OF start_date, end_date ON fiscal_periods
BEGIN
    SELECT RAISE(ABORT, 'HESABATI:posted_entry_immutable');
END;

CREATE TABLE journal_entries (
    id              TEXT PRIMARY KEY NOT NULL,
    entry_number    INTEGER NOT NULL UNIQUE CHECK (entry_number > 0),
    entry_date      TEXT NOT NULL CHECK (entry_date = date(entry_date)),
    period_id       TEXT NOT NULL REFERENCES fiscal_periods (id) ON DELETE RESTRICT,
    description     TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 500),
    reference       TEXT,
    source_type     TEXT,
    source_id       TEXT,
    -- Declared size and total; the line triggers below enforce that exactly
    -- `line_count` lines are attached and that they balance to `total`.
    line_count      INTEGER NOT NULL CHECK (line_count >= 2),
    total           INTEGER NOT NULL CHECK (total > 0),
    status          TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'reversed')),
    reversal_of     TEXT UNIQUE REFERENCES journal_entries (id) ON DELETE RESTRICT,
    posted_at       TEXT NOT NULL,
    posted_by       TEXT NOT NULL REFERENCES users (id),
    CHECK ((source_type IS NULL) = (source_id IS NULL))
);

-- One posting per source document: prevents double posting.
CREATE UNIQUE INDEX ux_journal_source ON journal_entries (source_type, source_id) WHERE source_type IS NOT NULL;
CREATE INDEX ix_journal_date ON journal_entries (entry_date);

CREATE TABLE journal_lines (
    id         TEXT PRIMARY KEY NOT NULL,
    entry_id   TEXT NOT NULL REFERENCES journal_entries (id) ON DELETE RESTRICT,
    line_no    INTEGER NOT NULL CHECK (line_no > 0),
    account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE RESTRICT,
    debit      INTEGER NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit     INTEGER NOT NULL DEFAULT 0 CHECK (credit >= 0),
    memo       TEXT,
    CHECK ((debit = 0) <> (credit = 0)),
    UNIQUE (entry_id, line_no)
);

CREATE INDEX ix_lines_account ON journal_lines (account_id);

-- Entry must fall inside an open fiscal period.
CREATE TRIGGER trg_entry_period_open BEFORE INSERT ON journal_entries
BEGIN
    SELECT CASE
        WHEN NOT EXISTS (SELECT 1 FROM fiscal_periods p WHERE p.id = NEW.period_id
                           AND NEW.entry_date BETWEEN p.start_date AND p.end_date)
            THEN RAISE(ABORT, 'HESABATI:no_open_period')
        WHEN EXISTS (SELECT 1 FROM fiscal_periods p WHERE p.id = NEW.period_id AND p.status = 'closed')
            THEN RAISE(ABORT, 'HESABATI:period_closed')
    END;
END;

-- Posted entries are immutable. The only permitted change is marking an entry
-- as reversed (status posted -> reversed), with every other column unchanged.
CREATE TRIGGER trg_entry_immutable BEFORE UPDATE ON journal_entries
WHEN NOT (
    OLD.status = 'posted' AND NEW.status = 'reversed'
    AND NEW.id IS OLD.id AND NEW.entry_number IS OLD.entry_number AND NEW.entry_date IS OLD.entry_date
    AND NEW.period_id IS OLD.period_id AND NEW.description IS OLD.description AND NEW.reference IS OLD.reference
    AND NEW.source_type IS OLD.source_type AND NEW.source_id IS OLD.source_id
    AND NEW.line_count IS OLD.line_count AND NEW.total IS OLD.total AND NEW.reversal_of IS OLD.reversal_of
    AND NEW.posted_at IS OLD.posted_at AND NEW.posted_by IS OLD.posted_by
)
BEGIN
    SELECT RAISE(ABORT, 'HESABATI:posted_entry_immutable');
END;

CREATE TRIGGER trg_entry_no_delete BEFORE DELETE ON journal_entries
BEGIN
    SELECT RAISE(ABORT, 'HESABATI:posted_entry_immutable');
END;

CREATE TRIGGER trg_line_no_update BEFORE UPDATE ON journal_lines
BEGIN
    SELECT RAISE(ABORT, 'HESABATI:posted_entry_immutable');
END;

CREATE TRIGGER trg_line_no_delete BEFORE DELETE ON journal_lines
BEGIN
    SELECT RAISE(ABORT, 'HESABATI:posted_entry_immutable');
END;

-- Lines: only into a postable, active account; never beyond the declared count.
CREATE TRIGGER trg_line_insert_guard BEFORE INSERT ON journal_lines
BEGIN
    SELECT CASE
        WHEN NOT EXISTS (SELECT 1 FROM accounts a WHERE a.id = NEW.account_id AND a.is_postable = 1 AND a.is_active = 1)
            THEN RAISE(ABORT, 'HESABATI:account_not_postable')
        WHEN (SELECT COUNT(*) FROM journal_lines l WHERE l.entry_id = NEW.entry_id)
             >= (SELECT e.line_count FROM journal_entries e WHERE e.id = NEW.entry_id)
            THEN RAISE(ABORT, 'HESABATI:posted_entry_immutable')
    END;
END;

-- When the last declared line arrives, the entry must balance to its total.
CREATE TRIGGER trg_line_balance_check AFTER INSERT ON journal_lines
WHEN (SELECT COUNT(*) FROM journal_lines l WHERE l.entry_id = NEW.entry_id)
     = (SELECT e.line_count FROM journal_entries e WHERE e.id = NEW.entry_id)
BEGIN
    SELECT CASE
        WHEN (SELECT SUM(debit) FROM journal_lines WHERE entry_id = NEW.entry_id)
             <> (SELECT total FROM journal_entries WHERE id = NEW.entry_id)
          OR (SELECT SUM(credit) FROM journal_lines WHERE entry_id = NEW.entry_id)
             <> (SELECT total FROM journal_entries WHERE id = NEW.entry_id)
            THEN RAISE(ABORT, 'HESABATI:unbalanced_entry')
    END;
END;
