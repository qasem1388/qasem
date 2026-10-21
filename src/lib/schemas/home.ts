import { z } from "zod";
import { href, iconName, imageSrc, localized } from "./common";
import { homeItem, sectionCopy } from "./settings";

const link = z.object({ label: localized(80), href });
const points = z.array(localized(160)).max(8);

export const homeKeys = [
  "hero",
  "about",
  "visionMission",
  "services",
  "stats",
  "projects",
  "sectors",
  "whyUs",
  "clients",
  "testimonials",
  "news",
  "quote",
  "contact",
] as const;

export const homeSchema = z.object({
  sections: z
    .array(z.object({ key: z.enum(homeKeys), enabled: z.boolean() }))
    .length(homeKeys.length)
    .refine((l) => new Set(l.map((s) => s.key)).size === homeKeys.length, "ترتيب الأقسام غير صالح."),
  hero: z.object({
    eyebrow: localized(120),
    title: localized(160),
    subtitle: localized(400),
    image: imageSrc,
    ctas: z.array(link.extend({ variant: z.enum(["primary", "secondary", "ghost"]) })).max(3),
    highlights: points,
  }),
  about: sectionCopy.extend({ body: localized(1500), image: imageSrc, points, cta: link }),
  visionMission: sectionCopy.extend({ items: z.array(homeItem).max(6) }),
  services: sectionCopy.extend({ cta: link }),
  stats: z.object({
    items: z
      .array(
        z.object({
          icon: iconName,
          value: z.number().int().min(0).max(1_000_000),
          suffix: z.string().max(4).optional(),
          label: localized(60),
        }),
      )
      .max(6),
  }),
  projects: sectionCopy.extend({ cta: link }),
  sectors: sectionCopy,
  whyUs: sectionCopy.extend({ image: imageSrc, items: z.array(homeItem).max(8) }),
  clients: sectionCopy,
  testimonials: sectionCopy,
  news: sectionCopy.extend({ cta: link }),
  quote: sectionCopy.extend({ points }),
  contact: sectionCopy,
});
