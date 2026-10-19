import type { Dictionary } from "./ar";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]> };

/**
 * English dictionary (partial). Untranslated keys fall back to Arabic, so the
 * UI stays usable while translation is completed.
 */
export const en: DeepPartial<Dictionary> = {
  app: { name: "Hesabati", nameLatin: "حساباتي", tagline: "Saudi accounting for growing businesses", loading: "Loading…" },
  common: {
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    next: "Next",
    back: "Back",
    search: "Search…",
    all: "All",
    optional: "optional",
    noResults: "No matching results",
    showing: "Showing {from}–{to} of {total}",
    retry: "Retry",
    comingSoon: "Coming soon",
    saved: "Saved successfully",
    sar: "SAR",
  },
  theme: { light: "Light mode", dark: "Dark mode", toggle: "Toggle theme" },
  language: { label: "Language" },
  roles: { admin: "Administrator", accountant: "Accountant", cashier: "Cashier" },
  nav: {
    groups: {
      overview: "Overview",
      accounting: "Accounting",
      operations: "Operations",
      finance: "Finance & Tax",
      administration: "Administration",
    },
    dashboard: "Dashboard",
    chartOfAccounts: "Chart of Accounts",
    journal: "Journal Entries",
    ledger: "General Ledger",
    sales: "Sales & Invoices",
    purchases: "Purchases & Suppliers",
    customers: "Customers",
    inventory: "Warehouses & Inventory",
    pos: "Point of Sale",
    cashBank: "Cash & Banks",
    expenses: "Expenses",
    fixedAssets: "Fixed Assets",
    tax: "Tax & E-Invoicing",
    reports: "Financial Reports",
    users: "Users & Permissions",
    company: "Company & Branches",
    backup: "Backup & Restore",
    license: "Licensing & Updates",
  },
  topbar: { logout: "Sign out", offline: "Running locally" },
  auth: { title: "Sign in", username: "Username", password: "Password", submit: "Sign in" },
  dashboard: {
    title: "Dashboard",
    greeting: "Welcome, {name}",
    demoBanner: "Sample data for illustration only — not real financial data",
  },
};
