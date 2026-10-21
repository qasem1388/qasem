import { GA4_ID, PLAUSIBLE_DOMAIN } from "@/lib/analytics";
import { z } from "zod";
import { hexColor, href, httpsUrl, iconName, imageSrc, localized } from "./common";

export const identitySchema = z.object({
  name: localized(120),
  tagline: localized(160),
  description: localized(600),
  logo: z.object({
    src: imageSrc.optional(),
    footerSrc: imageSrc.optional(),
    favicon: imageSrc.optional(),
    mark: imageSrc,
  }),
  brand: z.object({
    primary: hexColor,
    secondary: hexColor,
    accent: hexColor,
    surface: hexColor,
    text: hexColor,
    button: hexColor,
    buttonText: hexColor,
    radius: z.number().min(0).max(32),
    font: z.enum(["plex", "tajawal", "cairo", "almarai"]),
    fontScale: z.number().min(0.9).max(1.15),
  }),
});

const phone = z
  .string()
  .trim()
  .regex(/^\+?\d{6,15}$/, "رقم غير صالح (أرقام فقط مع رمز الدولة).");

export const companySchema = z.object({
  legal: z.object({
    crNumber: z.string().trim().max(30),
    vatNumber: z.string().trim().max(30).optional(),
  }),
  contact: z.object({
    phone,
    phoneDisplay: z.string().trim().min(3).max(30),
    email: z.string().trim().email("بريد إلكتروني غير صالح.").max(160),
    whatsapp: z
      .string()
      .trim()
      .regex(/^\d{8,15}$/, "رقم واتساب بصيغة دولية دون + (مثال 9665xxxxxxxx)."),
    address: localized(300),
    city: localized(120),
    region: localized(120, { optional: true }).optional(),
    workingHours: localized(160),
    mapUrl: httpsUrl,
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  }),
  social: z
    .array(
      z.object({ platform: z.enum(["x", "linkedin", "instagram", "youtube", "snapchat", "tiktok", "facebook"]), url: httpsUrl }),
    )
    .max(10),
});

export const branchSchema = z.object({
  name: localized(120),
  address: localized(300),
  phone,
  phoneDisplay: z.string().trim().min(3).max(30),
  email: z.string().trim().email("بريد إلكتروني غير صالح.").max(160),
  hours: localized(160),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  isMain: z.boolean(),
});

const link = z.object({ label: localized(80), href });

export const footerSchema = z.object({
  about: localized(600),
  columns: z.array(z.object({ title: localized(60), links: z.array(link).max(15) })).max(4),
  copyright: localized(200),
});

export const generalSchema = z.object({
  demoMode: z.boolean(),
  pages: z.object({
    sectors: z.boolean(),
    media: z.boolean(),
    clients: z.boolean(),
    careers: z.boolean(),
    faq: z.boolean(),
  }),
  seo: z.object({
    shareImage: imageSrc.optional(),
    schemaType: z.enum(["Organization", "LocalBusiness", "ProfessionalService", "GeneralContractor", "Corporation"]),
    indexable: z.boolean(),
    analytics: z.object({
      ga4Id: z.union([z.string().trim().regex(GA4_ID, "المعرّف بالصيغة G-XXXXXXXXXX"), z.literal("")]).optional(),
      plausibleDomain: z
        .union([z.string().trim().toLowerCase().regex(PLAUSIBLE_DOMAIN, "اكتب النطاق فقط مثل example.sa"), z.literal("")])
        .optional(),
    }),
  }),
});

type NavNode = { id: string; label: { ar: string; en: string }; href: string; visible: boolean; children?: NavNode[] };

const navLeaf = z.object({ id: z.string().min(1).max(40), label: localized(60), href, visible: z.boolean() });

export const menuSchema = z.object({
  navigation: z.array(navLeaf.extend({ children: z.array(navLeaf).max(12).optional() })).max(12) as z.ZodType<NavNode[]>,
  headerCta: link,
});

export const homeItem = z.object({ icon: iconName, title: localized(80), body: localized(300) });
export const sectionCopy = z.object({
  eyebrow: localized(80),
  title: localized(160),
  subtitle: localized(400, { optional: true }).optional(),
});
