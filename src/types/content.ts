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
  /** Main call-to-action button colours. */
  button: string;
  buttonText: string;
  /** Base corner radius in px. */
  radius: number;
  font: "plex" | "tajawal" | "cairo" | "almarai";
  /** Global text size multiplier (0.9 – 1.15). */
  fontScale: number;
};

export type SiteSettings = {
  name: Localized;
  tagline: Localized;
  description: Localized;
  logo: { src?: string; footerSrc?: string; favicon?: string; mark: string };
  brand: BrandTheme;
  contact: {
    region?: Localized;
    lat?: number;
    lng?: number;
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
  /** Optional public sections that can be disabled. */
  pages: Record<OptionalPage, boolean>;
  /** Search, sharing and analytics settings. */
  seo: {
    shareImage?: string;
    titleSuffix?: Localized;
    /** Schema.org type describing the business on the homepage. */
    schemaType?: SchemaType;
    /** When false: robots.txt disallows everything and pages send noindex (e.g. staging). */
    indexable?: boolean;
    /** Loaded only after the visitor accepts analytics cookies. */
    analytics?: { ga4Id?: string; plausibleDomain?: string };
  };
};

export type SchemaType = "Organization" | "LocalBusiness" | "ProfessionalService" | "GeneralContractor" | "Corporation";

export type OptionalPage = "sectors" | "media" | "clients" | "careers" | "faq";

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

/* ---------- Phase 2: inner pages ---------- */

/** Long-form text. Paragraphs are separated by blank lines; lines starting with "- " become list items. */
export type RichText = Localized;

export type ServiceDetail = {
  body: RichText;
  features: { title: Localized; body: Localized }[];
  gallery: string[];
};

export type ProjectDetail = {
  client: Localized;
  body: RichText;
  scope: Localized[];
  gallery: string[];
};

export type SectorDetail = { body: RichText; challenges: Localized[] };

export type NewsBody = { body: RichText; eventDate?: string; eventLocation?: Localized };

export type TeamMember = { id: string; name: Localized; role: Localized; bio: Localized };

export type Certification = { id: string; title: Localized; issuer: Localized; year: number; icon: IconName };

export type Milestone = { year: number; title: Localized; body: Localized };

export type OrgUnit = { id: string; title: Localized; children?: OrgUnit[] };

export type AboutPage = {
  intro: RichText;
  image: string;
  values: { icon: IconName; title: Localized; body: Localized }[];
  goals: Localized[];
  history: Milestone[];
  leaderMessage: { name: Localized; role: Localized; body: RichText };
  team: TeamMember[];
  orgChart: OrgUnit;
  certifications: Certification[];
};

export type Branch = {
  id: string;
  name: Localized;
  address: Localized;
  phone: string;
  phoneDisplay: string;
  email: string;
  hours: Localized;
  lat: number;
  lng: number;
  isMain?: boolean;
};

export type Job = {
  slug: string;
  title: Localized;
  department: Localized;
  location: Localized;
  type: "full-time" | "part-time" | "contract" | "internship";
  experience: Localized;
  postedAt: string;
  summary: Localized;
  responsibilities: Localized[];
  requirements: Localized[];
  open: boolean;
};

export type GalleryPhoto = { id: string; src: string; caption: Localized; album: Localized };

export type Video = { id: string; title: Localized; poster: string; youtubeId?: string; duration: string };

export type SuccessStory = {
  id: string;
  title: Localized;
  sectorId: string;
  challenge: Localized;
  solution: Localized;
  result: Localized;
  metric: { value: string; label: Localized };
};

export type Faq = { id: string; category: Localized; question: Localized; answer: Localized };

export type LegalPage = { slug: "privacy" | "terms" | "cookies"; title: Localized; updatedAt: string; body: RichText };
