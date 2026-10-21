import { z } from "zod";
import { localized, slug } from "./common";

/** First path segments used by built-in routes; custom pages can't take them. */
export const RESERVED_SLUGS = [
  "about",
  "services",
  "projects",
  "sectors",
  "media",
  "clients",
  "careers",
  "quote",
  "contact",
  "faq",
  "sitemap",
  "admin",
  "api",
  "uploads",
  "ar",
  "en",
];

/** Built-in pages stored in the Page table: editable, but their address is fixed and they can't be deleted. */
export const SYSTEM_PAGES = ["privacy", "terms", "cookies"];

export const pageSchema = z.object({
  title: localized(160),
  slug,
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  seoDescription: localized(300, { optional: true }),
  body: z.object({ ar: z.string().max(200_000), en: z.string().max(200_000) }),
});

export type PageInput = z.infer<typeof pageSchema>;
