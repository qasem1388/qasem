"use client";

import { useEffect, useState } from "react";
import { ImageInput, readJson } from "./ImageInput";

export type Field =
  | { key: string; label: string; type: "text" | "number" | "textarea" | "date"; placeholder?: string }
  | { key: string; label: string; type: "select"; options: [string, string][] }
  | { key: string; label: string; type: "image"; folder?: string }
  | { key: string; label: string; type: "checkbox" };

type Item = Record<string, unknown> & { id: string };

export function CrudManager({ resource, fields, columns, defaults, canCreate = true }: {
  resource: string;
  fields: Field[];
  columns: { key: string; label: string; render?: "image" | "bool" | "date" }[];
  defaults: Record<string, unknown>;
  canCreate?: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  const load = () => fetch(`/api/admin/crud/${resource}`).then((r) => r.json()).then((d) => setItems(d.items ?? []));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  const save = async () => {
    if (!editing) return;
    setError("");
    const id = editing.id as string | undefined;
    const body = Object.fromEntries(fields.map((f) => [f.key, f.type === "date" ? (editing[f.key] ? String(editing[f.key]).slice(0, 10) : undefined) : editing[f.key]]));
    const res = await fetch(id ? `/api/admin/crud/${resource}/${id}` : `/api/admin/crud/${resource}`, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return setError((await readJson(res)).error);
    setEditing(null);
    load();
  };

  const patch = async (id: string, data: Record<string, unknown>) => {
    await fetch(`/api/admin/crud/${resource}/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("تأكيد الحذف؟")) return;
    await fetch(`/api/admin/crud/${resource}/${id}`, { method: "DELETE" });
    load();
  };

  const cell = (item: Item, c: (typeof columns)[number]) => {
    const v = c.key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], item);
    if (c.render === "image") return v ? <img src={String(v)} alt="" className="h-12 w-16 rounded-lg object-cover" /> : "—";
    if (c.render === "bool") return v ? <span className="badge bg-brand-50 text-brand-700">نعم</span> : <span className="badge bg-neutral-100 text-neutral-500">لا</span>;
    if (c.render === "date") return v ? new Date(String(v)).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn") : "—";
    return String(v ?? "—");
  };

  return (
    <div className="space-y-4">
      {canCreate && <button onClick={() => setEditing({ ...defaults })} className="btn-primary">+ إضافة جديد</button>}

      {editing && (
        <div className="card space-y-4 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.type === "textarea" || f.type === "image" ? "md:col-span-2" : ""}>
                {f.type !== "checkbox" && <label className="label">{f.label}</label>}
                {f.type === "select" ? (
                  <select value={String(editing[f.key] ?? "")} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} className="input">
                    {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                ) : f.type === "image" ? (
                  <ImageInput value={String(editing[f.key] ?? "")} onChange={(url) => setEditing({ ...editing, [f.key]: url })} folder={f.folder} />
                ) : f.type === "checkbox" ? (
                  <label className="flex items-center gap-2 pt-7 font-bold"><input type="checkbox" checked={Boolean(editing[f.key])} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.checked })} className="h-5 w-5 accent-ink" /> {f.label}</label>
                ) : f.type === "textarea" ? (
                  <textarea value={String(editing[f.key] ?? "")} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} rows={3} className="input" />
                ) : (
                  <input
                    type={f.type}
                    value={f.type === "date" ? String(editing[f.key] ?? "").slice(0, 10) : String(editing[f.key] ?? "")}
                    placeholder={"placeholder" in f ? f.placeholder : undefined}
                    onChange={(e) => setEditing({ ...editing, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })}
                    className="input"
                  />
                )}
              </div>
            ))}
          </div>
          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary">حفظ</button>
            <button onClick={() => setEditing(null)} className="btn-outline">إلغاء</button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-start text-neutral-500">
            <tr>
              {columns.map((c) => <th key={c.key} className="p-3 text-start font-bold">{c.label}</th>)}
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={item.id}>
                {columns.map((c) => <td key={c.key} className="max-w-xs p-3 align-middle">{cell(item, c)}</td>)}
                <td className="whitespace-nowrap p-3 text-end">
                  {resource === "reviews" ? (
                    <button onClick={() => patch(item.id, { approved: !item.approved })} className="btn-ghost py-1.5 text-brand-700">{item.approved ? "إخفاء" : "اعتماد"}</button>
                  ) : (
                    <button onClick={() => setEditing(item)} className="btn-ghost py-1.5">تعديل</button>
                  )}
                  <button onClick={() => remove(item.id)} className="btn-ghost py-1.5 text-red-600">حذف</button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr><td colSpan={columns.length + 1} className="p-8 text-center text-neutral-500">لا توجد عناصر</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
