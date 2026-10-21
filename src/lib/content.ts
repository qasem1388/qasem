import "server-only";
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import type { IconName } from "@/components/ui/icon";
import type {
  AboutPage,
  Branch,
  Client,
  Faq,
  GalleryPhoto,
  HomePage,
  Job,
  LegalPage,
  Localized,
  NewsKind,
  NewsPost,
  Project,
  Sector,
  Service,
  ServiceCategory,
  SiteSettings,
  SuccessStory,
  Testimonial,
  Video,
} from "@/types/content";
import { defaultBrand, defaultLogo } from "@/content/defaults/brand";
import { defaultPageToggles } from "@/content/defaults/pages";
import { db } from "./db";

/**
 * Content access layer. Every page reads data through these functions only,
 * mapping database rows to the view types in `@/types/content`.
 * Wrapped in React `cache` so a request never queries the same data twice.
 */

const L = (v: Prisma.JsonValue | null | undefined): Localized => (v ?? { ar: "", en: "" }) as Localized;
const LL = (v: Prisma.JsonValue | null | undefined): Localized[] => (Array.isArray(v) ? (v as Localized[]) : []);
const day = (d: Date) => d.toISOString().slice(0, 10);

async function setting<T>(key: string): Promise<T> {
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) throw new Error(`Missing "${key}" settings. Run: npx prisma db seed`);
  return row.value as T;
}

/** Site settings merged over factory defaults, so fields added in newer versions always exist. */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const stored = await setting<SiteSettings>("site");
  return {
    ...stored,
    brand: { ...defaultBrand, ...stored.brand },
    logo: { ...defaultLogo, ...stored.logo },
    pages: { ...defaultPageToggles, ...stored.pages },
    seo: { ...stored.seo },
  };
});
export const getHomePage = cache(() => setting<HomePage>("home"));
export const getAboutPage = cache(() => setting<AboutPage>("about"));

/* Services */
type ServiceRow = Prisma.ServiceGetPayload<object>;
const toService = (s: ServiceRow) => ({
  slug: s.slug,
  categoryId: s.categoryId,
  icon: s.icon as IconName,
  title: L(s.title),
  summary: L(s.summary),
  image: s.image,
  featured: s.featured,
  order: s.order,
  body: L(s.body),
  features: (s.features ?? []) as { title: Localized; body: Localized }[],
  gallery: s.gallery,
});

export const getServices = cache(async (opts: { featured?: boolean } = {}): Promise<Service[]> => {
  const rows = await db.service.findMany({
    where: { published: true, ...(opts.featured ? { featured: true } : {}) },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toService);
});

export const getServiceCategories = cache(async (): Promise<ServiceCategory[]> => {
  const rows = await db.serviceCategory.findMany({ orderBy: { order: "asc" } });
  return rows.map((c) => ({ id: c.id, name: L(c.name) }));
});

export const getService = cache(async (slug: string) => {
  const row = await db.service.findFirst({ where: { slug, published: true } });
  return row ? toService(row) : null;
});

/* Projects */
type ProjectRow = Prisma.ProjectGetPayload<object>;
const toProject = (p: ProjectRow) => ({
  slug: p.slug,
  title: L(p.title),
  summary: L(p.summary),
  sectorId: p.sectorId ?? "",
  status: p.status === "COMPLETED" ? ("completed" as const) : ("ongoing" as const),
  location: L(p.location),
  year: p.year,
  image: p.image,
  featured: p.featured,
  client: L(p.client),
  body: L(p.body),
  scope: LL(p.scope),
  gallery: p.gallery,
});

export const getProjects = cache(async (opts: { featured?: boolean; sectorId?: string } = {}): Promise<Project[]> => {
  const rows = await db.project.findMany({
    where: {
      published: true,
      ...(opts.featured ? { featured: true } : {}),
      ...(opts.sectorId ? { sectorId: opts.sectorId } : {}),
    },
    orderBy: [{ order: "asc" }, { year: "desc" }],
  });
  return rows.map(toProject);
});

export const getProject = cache(async (slug: string) => {
  const row = await db.project.findFirst({ where: { slug, published: true } });
  return row ? toProject(row) : null;
});

/* Sectors */
type SectorRow = Prisma.SectorGetPayload<object>;
const toSector = (s: SectorRow) => ({
  id: s.id,
  slug: s.slug,
  icon: s.icon as IconName,
  name: L(s.name),
  summary: L(s.summary),
  body: L(s.body),
  challenges: LL(s.challenges),
});

export const getSectors = cache(async (): Promise<Sector[]> => {
  const rows = await db.sector.findMany({ where: { published: true }, orderBy: { order: "asc" } });
  return rows.map(toSector);
});

export const getSector = cache(async (slug: string) => {
  const row = await db.sector.findFirst({ where: { slug, published: true } });
  return row ? toSector(row) : null;
});

/* Clients, testimonials & stories */
export const getClients = cache(async (): Promise<Client[]> => {
  const rows = await db.client.findMany({ where: { published: true }, orderBy: { order: "asc" } });
  return rows.map((c) => ({ id: c.id, name: L(c.name), logo: c.logo, url: c.url ?? undefined }));
});

export const getTestimonials = cache(async (): Promise<Testimonial[]> => {
  const rows = await db.testimonial.findMany({ where: { published: true }, orderBy: { order: "asc" } });
  return rows.map((t) => ({ id: t.id, quote: L(t.quote), author: L(t.author), role: L(t.role), rating: t.rating }));
});

export const getSuccessStories = cache(async (): Promise<SuccessStory[]> => {
  const rows = await db.successStory.findMany({ where: { published: true }, orderBy: { order: "asc" } });
  return rows.map((s) => ({
    id: s.id,
    title: L(s.title),
    sectorId: s.sectorId ?? "",
    challenge: L(s.challenge),
    solution: L(s.solution),
    result: L(s.result),
    metric: { value: s.metricValue, label: L(s.metricLabel) },
  }));
});

/* Media center */
const kindFromDb = { NEWS: "news", ARTICLE: "article", ANNOUNCEMENT: "announcement", EVENT: "event" } as const;
const kindToDb = { news: "NEWS", article: "ARTICLE", announcement: "ANNOUNCEMENT", event: "EVENT" } as const;

type NewsRow = Prisma.NewsPostGetPayload<object>;
const toNews = (n: NewsRow) => ({
  slug: n.slug,
  kind: kindFromDb[n.kind],
  title: L(n.title),
  excerpt: L(n.excerpt),
  image: n.image,
  publishedAt: day(n.publishedAt),
  body: L(n.body),
  eventDate: n.eventDate ? day(n.eventDate) : undefined,
  eventLocation: n.eventLocation && L(n.eventLocation).ar ? L(n.eventLocation) : undefined,
});

const visibleNews = () => ({ published: true, publishedAt: { lte: new Date() } });

export const getNews = cache(async (kind?: NewsKind): Promise<NewsPost[]> => {
  const rows = await db.newsPost.findMany({
    where: { ...visibleNews(), ...(kind ? { kind: kindToDb[kind] } : {}) },
    orderBy: { publishedAt: "desc" },
  });
  return rows.map(toNews);
});

export const getLatestNews = cache(async (limit = 3): Promise<NewsPost[]> => {
  const rows = await db.newsPost.findMany({ where: visibleNews(), orderBy: { publishedAt: "desc" }, take: limit });
  return rows.map(toNews);
});

export const getNewsPost = cache(async (slug: string) => {
  const row = await db.newsPost.findFirst({ where: { slug, ...visibleNews() } });
  return row ? toNews(row) : null;
});

export const getPhotos = cache(async (): Promise<GalleryPhoto[]> => {
  const rows = await db.galleryPhoto.findMany({ orderBy: { order: "asc" } });
  return rows.map((p) => ({ id: p.id, src: p.src, caption: L(p.caption), album: L(p.album) }));
});

export const getVideos = cache(async (): Promise<Video[]> => {
  const rows = await db.video.findMany({ orderBy: { order: "asc" } });
  return rows.map((v) => ({
    id: v.id,
    title: L(v.title),
    poster: v.poster,
    youtubeId: v.youtubeId ?? undefined,
    duration: v.duration,
  }));
});

/* Careers */
const jobTypeFromDb = { FULL_TIME: "full-time", PART_TIME: "part-time", CONTRACT: "contract", INTERNSHIP: "internship" } as const;

type JobRow = Prisma.JobGetPayload<object>;
const toJob = (j: JobRow): Job => ({
  slug: j.slug,
  title: L(j.title),
  department: L(j.department),
  location: L(j.location),
  type: jobTypeFromDb[j.type],
  experience: L(j.experience),
  postedAt: day(j.postedAt),
  summary: L(j.summary),
  responsibilities: LL(j.responsibilities),
  requirements: LL(j.requirements),
  open: j.open,
});

export const getJobs = cache(async (): Promise<Job[]> => {
  const rows = await db.job.findMany({ where: { open: true }, orderBy: { postedAt: "desc" } });
  return rows.map(toJob);
});

export const getJob = cache(async (slug: string) => {
  const row = await db.job.findFirst({ where: { slug, open: true } });
  return row ? toJob(row) : null;
});

/* Contact & misc */
export const getBranches = cache(async (): Promise<Branch[]> => {
  const rows = await db.branch.findMany({ orderBy: [{ isMain: "desc" }, { order: "asc" }] });
  return rows.map((b) => ({
    id: b.id,
    name: L(b.name),
    address: L(b.address),
    phone: b.phone,
    phoneDisplay: b.phoneDisplay,
    email: b.email,
    hours: L(b.hours),
    lat: b.lat,
    lng: b.lng,
    isMain: b.isMain,
  }));
});

export const getFaqs = cache(async (): Promise<Faq[]> => {
  const rows = await db.faq.findMany({ orderBy: { order: "asc" } });
  return rows.map((f) => ({ id: f.id, category: L(f.category), question: L(f.question), answer: L(f.answer) }));
});

export const getLegalPage = cache(async (slug: string): Promise<LegalPage | null> => {
  const row = await db.page.findFirst({ where: { slug, status: "PUBLISHED" } });
  if (!row) return null;
  return { slug: row.slug as LegalPage["slug"], title: L(row.title), updatedAt: day(row.updatedAt), body: L(row.body) };
});

/** A published custom page by slug (built-in legal pages use getLegalPage). */
export const getCustomPage = cache(async (slug: string) => {
  const row = await db.page.findFirst({ where: { slug, status: "PUBLISHED" } });
  if (!row) return null;
  return {
    slug: row.slug,
    title: L(row.title),
    body: L(row.body),
    seoDescription: row.seoDescription ? L(row.seoDescription) : undefined,
    updatedAt: day(row.updatedAt),
  };
});

export const getCustomPageSlugs = cache(async () => {
  const rows = await db.page.findMany({
    where: { status: "PUBLISHED", slug: { notIn: ["privacy", "terms", "cookies"] } },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
});
