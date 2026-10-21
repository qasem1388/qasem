import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { allFields, resourceByKey } from "@/lib/resources/definitions";
import type { Field, ResourceDef } from "@/lib/resources/types";
import { sanitizeRichText } from "@/lib/sanitize";
import { httpsUrl, iconName, imageSrc, localized, slug } from "@/lib/schemas/common";

type Row = Record<string, unknown> & { id: string };

/** Minimal shape shared by every Prisma model delegate used by the content manager. */
type Delegate = {
  findMany(args?: object): Promise<Row[]>;
  findUnique(args: object): Promise<Row | null>;
  findFirst(args: object): Promise<Row | null>;
  create(args: object): Promise<Row>;
  update(args: object): Promise<Row>;
  delete(args: object): Promise<Row>;
  aggregate(args: object): Promise<{ _max: Record<string, number | null> }>;
};

export function getResource(key: string): ResourceDef | null {
  return resourceByKey[key] ?? null;
}

export function delegateOf(def: ResourceDef): Delegate {
  return (db as unknown as Record<string, Delegate>)[def.model];
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function fieldSchema(f: Field): z.ZodTypeAny {
  switch (f.type) {
    case "text": {
      const base = z
        .string()
        .trim()
        .max(f.max ?? 300);
      const s = f.required ? base.min(1, "هذا الحقل مطلوب.") : base;
      if (!f.pattern) return s;
      const re = new RegExp(f.pattern);
      return s.refine((v) => v === "" || re.test(v), f.patternMessage ?? "صيغة غير صحيحة.");
    }
    case "slug":
      return slug;
    case "localized":
      return localized(f.max ?? 300, { optional: !f.required });
    case "rich":
      return z.object({ ar: z.string().max(200_000), en: z.string().max(200_000) });
    case "image":
      return f.required ? imageSrc : z.union([imageSrc, z.literal("")]);
    case "gallery":
      return z.array(imageSrc).max(f.max ?? 20);
    case "icon":
      return iconName;
    case "select":
      return z.enum(f.options.map((o) => o.value) as [string, ...string[]]);
    case "relation":
      return f.required ? z.string().min(1, "اختر قيمة.").max(40) : z.string().max(40);
    case "number": {
      const n = z.number({ message: "أدخل رقمًا." }).min(f.min, `الحد الأدنى ${f.min}.`).max(f.max, `الحد الأقصى ${f.max}.`);
      return f.integer ? n.int("أدخل رقمًا صحيحًا.") : n;
    }
    case "boolean":
      return z.boolean();
    case "date":
      return f.required ? z.string().regex(DATE, "اختر التاريخ.") : z.union([z.string().regex(DATE), z.literal("")]);
    case "url":
      return f.required ? httpsUrl : z.union([httpsUrl, z.literal("")]);
    case "localizedList":
      return z.array(localized(300)).max(f.max);
    case "features":
      return z.array(z.object({ title: localized(100), body: localized(400) })).max(f.max);
  }
}

export function schemaFor(def: ResourceDef) {
  return z.object(Object.fromEntries(allFields(def).map((f) => [f.name, fieldSchema(f)])));
}

/** Converts validated form values to database column values. */
export function toDb(def: ResourceDef, data: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of allFields(def)) {
    const v = data[f.name];
    switch (f.type) {
      case "date":
        out[f.name] = v ? new Date(`${v}T00:00:00Z`) : null;
        break;
      case "relation":
        out[f.name] = v || null;
        break;
      case "url":
        out[f.name] = v || null;
        break;
      case "text":
        out[f.name] = v === "" && !f.required ? null : v;
        break;
      case "rich": {
        const r = v as { ar: string; en: string };
        out[f.name] = { ar: sanitizeRichText(r.ar), en: sanitizeRichText(r.en) };
        break;
      }
      default:
        out[f.name] = v;
    }
  }
  return out;
}

/** Converts a database row to editor values (dates as YYYY-MM-DD, nulls as empty). */
export function fromDb(def: ResourceDef, row: Row) {
  const out: Record<string, unknown> = { id: row.id };
  for (const f of allFields(def)) {
    const v = row[f.name];
    if (f.type === "date") out[f.name] = v instanceof Date ? v.toISOString().slice(0, 10) : "";
    else if (v === null || v === undefined) out[f.name] = def.defaults[f.name] ?? "";
    else out[f.name] = v;
  }
  return out;
}

export async function relationOptions(def: ResourceDef) {
  const result: Record<string, { value: string; label: string }[]> = {};
  for (const f of allFields(def)) {
    if (f.type !== "relation") continue;
    const target = resourceByKey[f.resource];
    const rows = await delegateOf(target).findMany({ orderBy: target.orderField ? { [target.orderField]: "asc" } : undefined });
    result[f.name] = rows.map((r) => ({ value: r.id, label: (r[target.list.title] as { ar: string }).ar }));
  }
  return result;
}

const publicPaths: Record<string, (r: Row) => string> = {
  services: (r) => `/ar/services/${r.slug}`,
  projects: (r) => `/ar/projects/${r.slug}`,
  sectors: (r) => `/ar/sectors/${r.slug}`,
  news: (r) => `/ar/media/news/${r.slug}`,
  jobs: (r) => `/ar/careers/${r.slug}`,
  photos: () => "/ar/media/photos",
  videos: () => "/ar/media/videos",
  clients: () => "/ar/clients",
  testimonials: () => "/ar/clients",
  stories: () => "/ar/clients#stories",
  faqs: () => "/ar/faq",
  "service-categories": () => "/ar/services",
};

export function publicPath(def: ResourceDef, row: Row) {
  return publicPaths[def.key]?.(row);
}

export type { Row };
