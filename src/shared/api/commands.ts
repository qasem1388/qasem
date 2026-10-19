import { call } from "./client";
import type {
  AppStatus,
  AuditRecord,
  Company,
  CompanyInput,
  LoginResult,
  NewAdminInput,
  SessionUser,
  UserSummary,
} from "./types";

/** One function per backend command — the only place command names appear. */
export const api = {
  appStatus: () => call<AppStatus>("app_status"),
  setupInitialize: (input: { company: CompanyInput; admin: NewAdminInput }) =>
    call<void>("setup_initialize", { input }),

  login: (username: string, password: string) => call<LoginResult>("auth_login", { input: { username, password } }),
  logout: (token: string) => call<void>("auth_logout", { token }),
  session: (token: string) => call<SessionUser>("auth_session", { token }),

  companyGet: (token: string) => call<Company>("company_get", { token }),
  companyUpdate: (token: string, input: CompanyInput) => call<Company>("company_update", { token, input }),

  usersList: (token: string) => call<UserSummary[]>("users_list", { token }),
  auditRecent: (token: string, limit = 200) => call<AuditRecord[]>("audit_recent", { token, limit }),
  auditVerify: (token: string) => call<number | null>("audit_verify", { token }),
};
