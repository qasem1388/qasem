import {
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  DatabaseBackup,
  KeyRound,
  Landmark,
  LayoutDashboard,
  ListTree,
  NotebookPen,
  Package,
  Receipt,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { TKey } from "@/shared/i18n";
import type { Permission } from "@/shared/api/types";

export type ModuleGroup = "overview" | "accounting" | "operations" | "finance" | "administration";

export interface AppModule {
  key: string;
  path: string;
  label: TKey;
  icon: LucideIcon;
  group: ModuleGroup;
  permission: Permission;
  /** Implemented now, or planned for a later phase. */
  status: "ready" | "planned";
  phase?: number;
  /** Planned features shown on the placeholder page (Arabic). */
  planned?: string[];
}

/** The 18 planned modules, in sidebar order. Single source of truth for navigation. */
export const MODULES: AppModule[] = [
  { key: "dashboard", path: "/", label: "nav.dashboard", icon: LayoutDashboard, group: "overview", permission: "dashboard_view", status: "ready" },

  { key: "accounts", path: "/m/accounts", label: "nav.chartOfAccounts", icon: ListTree, group: "accounting", permission: "accounts_view", status: "planned", phase: 2,
    planned: ["دليل حسابات شجري متعدد المستويات", "دليل افتراضي متوافق مع المنشآت السعودية", "حسابات رئيسية وفرعية قابلة للترحيل"] },
  { key: "journal", path: "/m/journal", label: "nav.journal", icon: NotebookPen, group: "accounting", permission: "journal_view", status: "planned", phase: 2,
    planned: ["إدخال قيود يومية متعددة الأسطر", "منع ترحيل القيد غير المتوازن", "قيود عكسية وتصحيحية للقيود المرحّلة", "ترقيم تسلسلي دون فجوات"] },
  { key: "ledger", path: "/m/ledger", label: "nav.ledger", icon: BookOpen, group: "accounting", permission: "ledger_view", status: "planned", phase: 2,
    planned: ["كشف حساب تفصيلي", "أرصدة افتتاحية وختامية", "تصفية حسب الفترة والحساب"] },

  { key: "sales", path: "/m/sales", label: "nav.sales", icon: ReceiptText, group: "operations", permission: "sales_view", status: "planned", phase: 3,
    planned: ["فواتير ضريبية ومبسطة", "إشعارات دائنة ومدينة", "ترحيل آلي إلى القيود"] },
  { key: "purchases", path: "/m/purchases", label: "nav.purchases", icon: ShoppingCart, group: "operations", permission: "purchases_view", status: "planned", phase: 3,
    planned: ["فواتير المشتريات", "إدارة الموردين", "مرتجعات المشتريات"] },
  { key: "customers", path: "/m/customers", label: "nav.customers", icon: Users, group: "operations", permission: "customers_manage", status: "planned", phase: 3,
    planned: ["بطاقات العملاء وبياناتهم الضريبية", "كشوف حسابات العملاء", "حدود الائتمان"] },
  { key: "inventory", path: "/m/inventory", label: "nav.inventory", icon: Boxes, group: "operations", permission: "inventory_view", status: "planned", phase: 4,
    planned: ["مستودعات متعددة", "الأصناف ووحدات القياس", "حركات المخزون والجرد"] },
  { key: "pos", path: "/m/pos", label: "nav.pos", icon: Store, group: "operations", permission: "pos_operate", status: "planned", phase: 4,
    planned: ["شاشة بيع سريعة باللمس", "دعم قارئ الباركود والطابعات الحرارية", "إقفال الوردية"] },

  { key: "cash-bank", path: "/m/cash-bank", label: "nav.cashBank", icon: Landmark, group: "finance", permission: "cash_bank_manage", status: "planned", phase: 3,
    planned: ["سندات القبض والصرف", "الحسابات البنكية", "التسويات البنكية"] },
  { key: "expenses", path: "/m/expenses", label: "nav.expenses", icon: Wallet, group: "finance", permission: "expenses_manage", status: "planned", phase: 3,
    planned: ["تسجيل المصروفات وتصنيفها", "ضريبة المدخلات القابلة للاسترداد"] },
  { key: "fixed-assets", path: "/m/fixed-assets", label: "nav.fixedAssets", icon: Package, group: "finance", permission: "fixed_assets_manage", status: "planned", phase: 5,
    planned: ["سجل الأصول الثابتة", "حساب الإهلاك الدوري", "الاستبعاد والبيع"] },
  { key: "tax", path: "/m/tax", label: "nav.tax", icon: Receipt, group: "finance", permission: "tax_view", status: "planned", phase: 5,
    planned: ["إقرارات ضريبة القيمة المضافة", "طبقة تكامل مستقلة مع منصة فاتورة (ZATCA)", "رمز QR والفواتير بصيغة XML (UBL 2.1)", "لا يُدّعى التوافق قبل اجتياز اختبارات المطابقة"] },
  { key: "reports", path: "/m/reports", label: "nav.reports", icon: BarChart3, group: "finance", permission: "reports_view", status: "planned", phase: 4,
    planned: ["ميزان المراجعة", "قائمة الدخل والمركز المالي", "التدفقات النقدية", "تصدير PDF وExcel والطباعة"] },

  { key: "users", path: "/users", label: "nav.users", icon: ShieldCheck, group: "administration", permission: "users_manage", status: "ready" },
  { key: "company", path: "/company", label: "nav.company", icon: Building2, group: "administration", permission: "company_view", status: "ready" },
  { key: "backup", path: "/m/backup", label: "nav.backup", icon: DatabaseBackup, group: "administration", permission: "backup_manage", status: "planned", phase: 2,
    planned: ["نسخ احتياطي مشفّر", "التحقق من سلامة النسخة", "اختبار الاستعادة", "جدولة النسخ التلقائي"] },
  { key: "license", path: "/m/license", label: "nav.license", icon: KeyRound, group: "administration", permission: "license_manage", status: "planned", phase: 6,
    planned: ["تفعيل الترخيص", "تحديثات موقّعة رقميًا والتحقق منها"] },
];

export const MODULE_GROUPS: ModuleGroup[] = ["overview", "accounting", "operations", "finance", "administration"];

