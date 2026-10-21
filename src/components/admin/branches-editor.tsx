"use client";

import { useState } from "react";
import { saveBranches } from "@/app/admin/actions/branches";
import type { Branch } from "@/types/content";
import { AddButton, LocalizedInput, SaveBar, SortableList, TextInput, Toggle, err, useSave } from "./inputs";

type Row = Omit<Branch, "id"> & { id?: string; isMain: boolean };

export function BranchesEditor({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const s = useSave(saveBranches, rows);
  const e = s.errors;
  const set = (i: number, patch: Partial<Row>) =>
    setRows((p) => p.map((r, j) => (j === i ? { ...r, ...patch } : patch.isMain ? { ...r, isMain: false } : r)));
  const num = (v: string) => (v.trim() === "" ? 0 : Number(v));

  return (
    <div>
      <SortableList
        items={rows}
        getKey={(r, i) => r.id ?? `new-${i}`}
        itemLabel={(r) => r.name.ar || "فرع جديد"}
        onChange={setRows}
        onRemove={(i) => confirm("حذف هذا الفرع؟ يُطبق الحذف بعد الحفظ.") && setRows((p) => p.filter((_, j) => j !== i))}
        render={(r, i) => (
          <div className="space-y-4 p-2">
            <LocalizedInput
              label="اسم الفرع"
              value={r.name}
              onChange={(x) => set(i, { name: x })}
              errors={e}
              path={`${i}.name`}
            />
            <LocalizedInput
              label="العنوان"
              value={r.address}
              onChange={(x) => set(i, { address: x })}
              errors={e}
              path={`${i}.address`}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <TextInput
                label="الهاتف (للاتصال)"
                dir="ltr"
                value={r.phone}
                onChange={(x) => set(i, { phone: x })}
                error={err(e, `${i}.phone`)}
              />
              <TextInput
                label="الهاتف (كما يظهر)"
                dir="ltr"
                value={r.phoneDisplay}
                onChange={(x) => set(i, { phoneDisplay: x })}
                error={err(e, `${i}.phoneDisplay`)}
              />
              <TextInput
                label="البريد الإلكتروني"
                dir="ltr"
                value={r.email}
                onChange={(x) => set(i, { email: x })}
                error={err(e, `${i}.email`)}
              />
              <TextInput
                label="خط العرض"
                dir="ltr"
                type="number"
                value={r.lat}
                onChange={(x) => set(i, { lat: num(x) })}
                error={err(e, `${i}.lat`)}
              />
              <TextInput
                label="خط الطول"
                dir="ltr"
                type="number"
                value={r.lng}
                onChange={(x) => set(i, { lng: num(x) })}
                error={err(e, `${i}.lng`)}
              />
            </div>
            <LocalizedInput
              label="ساعات العمل"
              value={r.hours}
              onChange={(x) => set(i, { hours: x })}
              errors={e}
              path={`${i}.hours`}
            />
            <Toggle label="المقر الرئيسي" checked={r.isMain} onChange={(x) => set(i, { isMain: x })} />
          </div>
        )}
      />
      <AddButton
        onClick={() =>
          setRows((p) => [
            ...p,
            {
              name: { ar: "", en: "" },
              address: { ar: "", en: "" },
              phone: "",
              phoneDisplay: "",
              email: "",
              hours: { ar: "", en: "" },
              lat: 24.7136,
              lng: 46.6753,
              isMain: false,
            },
          ])
        }
      >
        إضافة فرع
      </AddButton>
      <SaveBar pending={s.pending} dirty={s.dirty} result={s.result} onSave={s.save} />
    </div>
  );
}
