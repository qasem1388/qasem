/**
 * ILLUSTRATIVE SAMPLE DATA — NOT REAL FINANCIAL DATA.
 * Shown on the dashboard only to demonstrate the layout until the accounting
 * modules (phase 2+) provide real balances. Never persisted, never posted.
 */
export const DEMO_STATS = [
  { key: "sales", value: "184250.00", change: 12.4, tone: "primary" },
  { key: "purchases", value: "96780.50", change: -3.1, tone: "neutral" },
  { key: "cash", value: "312640.75", change: 5.8, tone: "primary" },
  { key: "profit", value: "41320.00", change: 8.2, tone: "success" },
  { key: "receivables", value: "57900.00", change: -6.5, tone: "warning" },
  { key: "vat", value: "13122.45", change: 4.0, tone: "accent" },
] as const;

/** Monthly sales (SAR), oldest first. */
export const DEMO_MONTHLY_SALES = [
  { month: 5, value: 121400 },
  { month: 6, value: 138900 },
  { month: 7, value: 129300 },
  { month: 8, value: 152700 },
  { month: 9, value: 163900 },
  { month: 10, value: 184250 },
];

export type DemoTxType = "sale" | "purchase" | "receipt" | "payment";
export type DemoTxStatus = "paid" | "pending" | "overdue";

export interface DemoTx {
  id: string;
  number: string;
  date: string;
  type: DemoTxType;
  party: string;
  amount: string;
  status: DemoTxStatus;
}

export const DEMO_TRANSACTIONS: DemoTx[] = [
  { id: "1", number: "INV-1048", date: "2026-10-18", type: "sale", party: "مؤسسة الأفق للتجارة", amount: "11500.00", status: "paid" },
  { id: "2", number: "PUR-0391", date: "2026-10-17", type: "purchase", party: "شركة المورد الأول", amount: "28750.00", status: "pending" },
  { id: "3", number: "RCV-0220", date: "2026-10-16", type: "receipt", party: "متجر الواحة", amount: "4600.00", status: "paid" },
  { id: "4", number: "INV-1047", date: "2026-10-15", type: "sale", party: "شركة البناء الحديث", amount: "36225.00", status: "overdue" },
  { id: "5", number: "PAY-0117", date: "2026-10-14", type: "payment", party: "مكتب الخدمات المهنية", amount: "2300.00", status: "paid" },
  { id: "6", number: "INV-1046", date: "2026-10-12", type: "sale", party: "مطاعم الذوق الرفيع", amount: "8970.50", status: "pending" },
  { id: "7", number: "PUR-0390", date: "2026-10-10", type: "purchase", party: "مصنع الجودة", amount: "15400.00", status: "paid" },
  { id: "8", number: "INV-1045", date: "2026-10-09", type: "sale", party: "مؤسسة الأفق للتجارة", amount: "6325.00", status: "paid" },
  { id: "9", number: "RCV-0219", date: "2026-10-08", type: "receipt", party: "شركة البناء الحديث", amount: "20000.00", status: "paid" },
  { id: "10", number: "PAY-0116", date: "2026-10-06", type: "payment", party: "شركة الكهرباء", amount: "1840.25", status: "paid" },
  { id: "11", number: "INV-1044", date: "2026-10-05", type: "sale", party: "متجر الواحة", amount: "3450.00", status: "overdue" },
  { id: "12", number: "PUR-0389", date: "2026-10-03", type: "purchase", party: "شركة المورد الأول", amount: "9200.00", status: "paid" },
];
