import type { Role } from "@/generated/prisma/enums";

export type Permission =
  | "dashboard.view"
  | "content.view"
  | "content.edit"
  | "inbox.view"
  | "inbox.manage"
  | "settings.manage"
  | "users.manage"
  | "audit.view";

/** Fixed role → permission matrix, enforced on the server for every page and action. */
const matrix: Record<Role, Permission[]> = {
  ADMIN: [
    "dashboard.view",
    "content.view",
    "content.edit",
    "inbox.view",
    "inbox.manage",
    "settings.manage",
    "users.manage",
    "audit.view",
  ],
  EDITOR: ["dashboard.view", "content.view", "content.edit", "inbox.view", "inbox.manage"],
  VIEWER: ["dashboard.view", "content.view", "inbox.view"],
};

export function can(role: Role, permission: Permission) {
  return matrix[role].includes(permission);
}

export const roleLabels: Record<Role, string> = {
  ADMIN: "مدير رئيسي",
  EDITOR: "محرر محتوى",
  VIEWER: "قراءة ومتابعة",
};

export const roleDescriptions: Record<Role, string> = {
  ADMIN: "صلاحيات كاملة: المحتوى، الإعدادات، المستخدمون، وسجل العمليات.",
  EDITOR: "إدارة المحتوى والرد على الرسائل والطلبات، دون الإعدادات أو المستخدمين.",
  VIEWER: "عرض المحتوى والرسائل والطلبات فقط دون أي تعديل.",
};
