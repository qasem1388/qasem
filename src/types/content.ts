import type { Locale } from "@/i18n/config";
import type { IconName } from "@/components/ui/icon";

/** A string stored in both supported languages. */
export type Localized = Record<Locale, string>;

export type LinkItem = { label: Localized; href: string };

export type NavItem = LinkItem & {
  id: string;
  visible: boolean;
  children?: NavItem[];
};

export type SocialPlatform = "x" | "linkedin" | "instagram" | "youtube" | "snapchat" | "tiktok" | "facebook";

export type BrandTheme = {
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  text: string;
  /** Base corner radius in px. */
  radius: number;
};

export type SiteSettings = {
  name: Localized;
  tagline: Localized;
  description: Localized;
  logo: { src?: string; footerSrc?: string; mark: string };
  brand: BrandTheme;
  contact: {
    phone: string;
    phoneDisplay: string;
    email: string;
    whatsapp: string;
    address: Localized;
    city: Localized;
    workingHours: Localized;
    mapUrl: string;
  };
  legal: { crNumber: string; vatNumber?: string };
  social: { platform: SocialPlatform; url: string }[];
  navigation: NavItem[];
  headerCta: LinkItem;
  footer: {
    about: Localized;
    columns: { title: Localized; links: LinkItem[] }[];
    copyright: Localized;
  };
  /** Shows a notice that the content is sample data. */
  demoMode: boolean;
};

export type HomeSectionKey =
  | "hero"
  | "about"
  | "visionMission"
  | "services"
  | "stats"
  | "projects"
  | "sectors"
  | "whyUs"
  | "clients"
  | "testimonials"
  | "news"
  | "quote"
  | "contact";

export type SectionCopy = { eyebrow: Localized; title: Localized; subtitle?: Localized };

export type HomePage = {
  sections: { key: HomeSectionKey; enabled: boolean }[];
  hero: {
    eyebrow: Localized;
    title: Localized;
    subtitle: Localized;
    image: string;
    ctas: (LinkItem & { variant: "primary" | "secondary" | "ghost" })[];
    highlights: Localized[];
  };
  about: SectionCopy & { body: Localized; image: string; points: Localized[]; cta: LinkItem };
  visionMission: SectionCopy & {
    items: { icon: IconName; title: Localized; body: Localized }[];
  };
  services: SectionCopy & { cta: LinkItem };
  stats: { items: { icon: IconName; value: number; suffix?: string; label: Localized }[] };
  projects: SectionCopy & { cta: LinkItem };
  sectors: SectionCopy;
  whyUs: SectionCopy & { image: string; items: { icon: IconName; title: Localized; body: Localized }[] };
  clients: SectionCopy;
  testimonials: SectionCopy;
  news: SectionCopy & { cta: LinkItem };
  quote: SectionCopy & { points: Localized[] };
  contact: SectionCopy;
};

export type ServiceCategory = { id: string; name: Localized };

export type Service = {
  slug: string;
  categoryId: string;
  icon: IconName;
  title: Localized;
  summary: Localized;
  image: string;
  featured: boolean;
  order: number;
};

export type ProjectStatus = "completed" | "ongoing";

export type Project = {
  slug: string;
  title: Localized;
  summary: Localized;
  sectorId: string;
  status: ProjectStatus;
  location: Localized;
  year: number;
  image: string;
  featured: boolean;
};

export type Sector = {
  id: string;
  slug: string;
  icon: IconName;
  name: Localized;
  summary: Localized;
};

export type Client = { id: string; name: Localized; logo: string; url?: string };

export type Testimonial = {
  id: string;
  quote: Localized;
  author: Localized;
  role: Localized;
  rating: number;
};

export type NewsKind = "news" | "article" | "announcement" | "event";

export type NewsPost = {
  slug: string;
  kind: NewsKind;
  title: Localized;
  excerpt: Localized;
  image: string;
  publishedAt: string;
};
