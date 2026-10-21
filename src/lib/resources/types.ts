/**
 * Serializable description of an editable content type. The same definition
 * drives the admin list, the editor form, server-side validation and the
 * database mapping, so adding a field means editing one place.
 */
export type Option = { value: string; label: string };

type Base = { name: string; label: string; hint?: string };

export type Field = Base &
  (
    | { type: "text"; required?: boolean; max?: number; dir?: "ltr" | "rtl"; pattern?: string; patternMessage?: string }
    | { type: "slug"; from: string }
    | { type: "localized"; required?: boolean; max?: number; multiline?: boolean; rows?: number; optional?: boolean }
    | { type: "rich" }
    | { type: "image"; required?: boolean; aspect?: "video" | "square" | "logo" }
    | { type: "gallery"; max?: number }
    | { type: "icon" }
    | { type: "select"; options: Option[] }
    | { type: "relation"; resource: string; required?: boolean }
    | { type: "number"; min: number; max: number; integer?: boolean }
    | { type: "boolean" }
    | { type: "date"; required?: boolean }
    | { type: "url"; required?: boolean }
    | { type: "localizedList"; max: number; itemLabel?: string }
    | { type: "features"; max: number }
  );

export type FieldType = Field["type"];

export type ResourceDef = {
  key: string;
  /** Prisma model delegate name, e.g. "service". */
  model: string;
  label: string;
  singular: string;
  description?: string;
  sections: { title: string; side?: boolean; fields: Field[] }[];
  list: {
    /** Localized field shown as the row title. */
    title: string;
    /** Optional secondary localized/text field. */
    subtitle?: string;
    image?: string;
    /** Fields rendered as badges: select values are mapped through their options. */
    badges?: string[];
    /** Relation field shown as a column. */
    relation?: string;
  };
  /** Field holding the manual sort index (enables drag-and-drop ordering). */
  orderField?: string;
  /** Default sort when there is no order field. */
  sort?: { field: string; dir: "asc" | "desc" };
  publishField?: string;
  featuredField?: string;
  defaults: Record<string, unknown>;
};
