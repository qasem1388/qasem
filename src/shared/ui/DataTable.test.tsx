import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@/shared/i18n";
import { applyTableState, DataTable, type Column } from "./DataTable";

interface Row { id: string; name: string; amount: number; kind: string }
const rows: Row[] = [
  { id: "1", name: "مؤسسة الأفق", amount: 300, kind: "sale" },
  { id: "2", name: "شركة البناء", amount: 100, kind: "purchase" },
  { id: "3", name: "متجر الواحة", amount: 200, kind: "sale" },
];
const columns: Column<Row>[] = [
  { key: "name", header: "الاسم", value: (r) => r.name, sortable: true },
  { key: "amount", header: "المبلغ", value: (r) => r.amount, sortable: true },
  { key: "kind", header: "النوع", value: (r) => r.kind, filterOptions: [{ value: "sale", label: "بيع" }, { value: "purchase", label: "شراء" }] },
];

describe("applyTableState", () => {
  it("searches across columns", () => {
    expect(applyTableState(rows, columns, "الواحة", {}, null).map((r) => r.id)).toEqual(["3"]);
  });
  it("filters and sorts numerically", () => {
    const out = applyTableState(rows, columns, "", { kind: "sale" }, { key: "amount", dir: "asc" });
    expect(out.map((r) => r.id)).toEqual(["3", "1"]);
  });
});

describe("<DataTable>", () => {
  it("sorts when a header is clicked and shows empty state", async () => {
    const user = userEvent.setup();
    render(<I18nProvider lang="ar"><DataTable rows={rows} columns={columns} rowKey={(r) => r.id} /></I18nProvider>);
    await user.click(screen.getByRole("button", { name: /المبلغ/ }));
    const body = screen.getAllByRole("row").slice(1);
    expect(within(body[0]!).getByText("100")).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox"), "غير موجود");
    expect(screen.getByText("لا توجد نتائج مطابقة")).toBeInTheDocument();
  });
});
