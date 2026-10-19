/** Wire types mirroring the Rust structs (camelCase via serde). */

export type Role = "admin" | "accountant" | "cashier";
export type CalendarDisplay = "gregorian" | "hijri" | "both";

export type Permission =
  | "dashboard_view"
  | "company_view"
  | "company_manage"
  | "accounts_view"
  | "accounts_manage"
  | "journal_view"
  | "journal_post"
  | "ledger_view"
  | "sales_view"
  | "sales_manage"
  | "purchases_view"
  | "purchases_manage"
  | "customers_manage"
  | "inventory_view"
  | "inventory_manage"
  | "pos_operate"
  | "cash_bank_manage"
  | "expenses_manage"
  | "fixed_assets_manage"
  | "tax_view"
  | "tax_manage"
  | "reports_view"
  | "users_manage"
  | "audit_view"
  | "periods_close"
  | "backup_manage"
  | "license_manage";

export interface AppStatus {
  initialized: boolean;
  companyName: string | null;
  appVersion: string;
  schemaVersion: number;
  databaseEncrypted: boolean;
  cipherVersion: string;
}

export interface CompanyInput {
  nameAr: string;
  nameEn: string | null;
  vatNumber: string | null;
  crNumber: string | null;
  phone: string | null;
  email: string | null;
  city: string;
  district: string | null;
  street: string | null;
  buildingNumber: string | null;
  postalCode: string | null;
  fiscalYearStartMonth: number;
  calendarDisplay: CalendarDisplay;
}

export interface Company extends CompanyInput {
  id: string;
  baseCurrency: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewAdminInput {
  username: string;
  fullName: string;
  password: string;
  passwordConfirm: string;
}

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  permissions: Permission[];
}

export interface LoginResult {
  token: string;
  user: SessionUser;
}

export interface UserSummary {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuditRecord {
  id: number;
  occurredAt: string;
  userId: string | null;
  username: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  prevHash: string;
  hash: string;
}
