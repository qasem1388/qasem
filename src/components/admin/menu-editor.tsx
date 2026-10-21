"use client";

import { Eye, EyeOff, IndentIncrease, Outdent } from "lucide-react";
import { useState } from "react";
import { saveMenu } from "@/app/admin/actions/settings";
import { cn } from "@/lib/utils";
import type { LinkItem, NavItem } from "@/types/content";
import { AddButton, SaveBar, Section, SortableList, controlClass, type Errors, useSave } from "./inputs";
import { LinksEditor } from "./settings-editors";

type Menu = { navigation: NavItem[]; headerCta: LinkItem };
export type LinkOption = { href: string; label: string };

const newId = () => Math.random().toString(36).slice(2, 10);
const blank = (): NavItem => ({ id: newId(), label: { ar: "", en: "" }, href: "/", visible: true });

export function MenuEditor({ initial, options }: { initial: Menu; options: LinkOption[] }) {
  const [v, setV] = useState(initial);
  const s = useSave(saveMenu, v);
  const e = s.errors;
  const nav = v.navigation;
  const setNav = (navigation: NavItem[]) => setV((p) => ({ ...p, navigation }));

  const indent = (i: number) => {
    if (i === 0 || nav[i].children?.length) return;
    const parent = nav[i - 1];
    setNav(
      nav
        .filter((_, j) => j !== i)
        .map((x, j) =>
          j === i - 1 ? { ...parent, children: [...(parent.children ?? []), { ...nav[i], children: undefined }] } : x,
        ),
    );
  };
  const outdent = (pi: number, ci: number) => {
    const parent = nav[pi];
    const child = parent.children![ci];
    const next = [...nav];
    next[pi] = { ...parent, children: parent.children!.filter((_, j) => j !== ci) };
    next.splice(pi + 1, 0, child);
    setNav(next);
  };

  return (
    <div className="space-y-6">
      <datalist id="site-links">
        {options.map((o) => (
          <option key={o.href} value={o.href}>
            {o.label}
          </option>
        ))}
      </datalist>

      <Section
        title="القائمة الرئيسية"
        description="اسحب العناصر أو استخدم الأسهم للترتيب. زر «فرعي» يضع العنصر تحت العنصر الذي يسبقه كقائمة منسدلة."
      >
        <SortableList
          items={nav}
          getKey={(x) => x.id}
          itemLabel={(x) => x.label.ar || "رابط"}
          onChange={setNav}
          onRemove={(i) => confirm("حذف هذا الرابط وروابطه الفرعية؟") && setNav(nav.filter((_, j) => j !== i))}
          render={(item, i) => (
            <div className="space-y-2 py-1">
              <ItemFields
                item={item}
                errors={e}
                path={`navigation.${i}`}
                onChange={(patch) => setNav(nav.map((x, j) => (j === i ? { ...x, ...patch } : x)))}
                extra={
                  i > 0 && !item.children?.length ? (
                    <button
                      type="button"
                      onClick={() => indent(i)}
                      className="rounded-brand text-primary hover:bg-primary-50 inline-flex h-9 items-center gap-1 px-2 text-xs font-semibold"
                      title="جعله عنصرًا فرعيًا تحت العنصر السابق"
                    >
                      <IndentIncrease className="size-4 rtl:-scale-x-100" aria-hidden />
                      فرعي
                    </button>
                  ) : null
                }
              />
              {!!item.children?.length && (
                <div className="border-secondary/40 ms-6 border-s-2 ps-3">
                  <SortableList
                    items={item.children}
                    getKey={(c) => c.id}
                    itemLabel={(c) => c.label.ar || "رابط فرعي"}
                    onChange={(children) => setNav(nav.map((x, j) => (j === i ? { ...x, children } : x)))}
                    onRemove={(ci) =>
                      setNav(nav.map((x, j) => (j === i ? { ...x, children: x.children!.filter((_, k) => k !== ci) } : x)))
                    }
                    render={(child, ci) => (
                      <ItemFields
                        item={child}
                        errors={e}
                        path={`navigation.${i}.children.${ci}`}
                        onChange={(patch) =>
                          setNav(
                            nav.map((x, j) =>
                              j === i ? { ...x, children: x.children!.map((c, k) => (k === ci ? { ...c, ...patch } : c)) } : x,
                            ),
                          )
                        }
                        extra={
                          <button
                            type="button"
                            onClick={() => outdent(i, ci)}
                            className="rounded-brand text-primary hover:bg-primary-50 inline-flex h-9 items-center gap-1 px-2 text-xs font-semibold"
                            title="إخراجه إلى المستوى الأول"
                          >
                            <Outdent className="size-4 rtl:-scale-x-100" aria-hidden />
                            رئيسي
                          </button>
                        }
                      />
                    )}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setNav(nav.map((x, j) => (j === i ? { ...x, children: [...(x.children ?? []), blank()] } : x)))}
                className="text-accent ms-6 text-xs font-semibold hover:underline"
              >
                + إضافة رابط فرعي
              </button>
            </div>
          )}
        />
        <AddButton onClick={() => setNav([...nav, blank()])}>إضافة رابط للقائمة</AddButton>
      </Section>

      <Section title="زر الدعوة في الهيدر" description="الزر البارز بجانب القائمة (مثل «اطلب عرض سعر»).">
        <LinksEditor
          single
          links={[v.headerCta]}
          onChange={(l) => l[0] && setV((p) => ({ ...p, headerCta: l[0] }))}
          errors={e}
          path="headerCta"
        />
      </Section>

      <SaveBar pending={s.pending} dirty={s.dirty} result={s.result} onSave={s.save} />
    </div>
  );
}

function ItemFields({
  item,
  onChange,
  errors,
  path,
  extra,
}: {
  item: NavItem;
  onChange: (p: Partial<NavItem>) => void;
  errors?: Errors;
  path: string;
  extra?: React.ReactNode;
}) {
  const error = errors?.[`${path}.label.ar`] ?? errors?.[`${path}.href`];
  return (
    <div>
      <div className="grid grid-cols-2 items-center gap-2 lg:grid-cols-[1fr_1fr_1.3fr_auto_auto]">
        <input
          aria-label="النص (عربي)"
          value={item.label.ar}
          onChange={(ev) => onChange({ label: { ...item.label, ar: ev.target.value } })}
          placeholder="النص بالعربية"
          className={cn(controlClass, "h-9")}
          aria-invalid={errors?.[`${path}.label.ar`] ? true : undefined}
        />
        <input
          aria-label="النص (English)"
          dir="ltr"
          value={item.label.en}
          onChange={(ev) => onChange({ label: { ...item.label, en: ev.target.value } })}
          placeholder="English"
          className={cn(controlClass, "h-9 text-left")}
        />
        <input
          aria-label="الرابط"
          dir="ltr"
          list="site-links"
          value={item.href}
          onChange={(ev) => onChange({ href: ev.target.value })}
          className={cn(controlClass, "col-span-2 h-9 text-left lg:col-span-1")}
          aria-invalid={errors?.[`${path}.href`] ? true : undefined}
        />
        <button
          type="button"
          aria-pressed={item.visible}
          onClick={() => onChange({ visible: !item.visible })}
          className={cn(
            "inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold",
            item.visible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
          )}
        >
          {item.visible ? <Eye className="size-3.5" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}
          {item.visible ? "ظاهر" : "مخفي"}
        </button>
        {extra}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
