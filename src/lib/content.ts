import "server-only";
import { cache } from "react";
import { clients, news, projects, sectors, serviceCategories, services, testimonials } from "@/content/demo/collections";
import { aboutPage, branches, faqs, jobs, legalPages, photos, successStories, videos } from "@/content/demo/company";
import { newsBodies, projectDetails, sectorDetails, serviceDetails } from "@/content/demo/details";
import { homePage } from "@/content/demo/home";
import { siteSettings } from "@/content/demo/site";
import type { NewsKind } from "@/types/content";

/**
 * Content access layer. Every page reads data through these functions only,
 * so the demo source can be swapped for the database (phase 3) without
 * touching any UI component.
 */
export const getSiteSettings = cache(async () => siteSettings);

export const getHomePage = cache(async () => homePage);

export const getAboutPage = cache(async () => aboutPage);

/* Services */
export const getServices = cache(async (opts: { featured?: boolean } = {}) =>
  services.filter((s) => (opts.featured ? s.featured : true)).sort((a, b) => a.order - b.order),
);

export const getServiceCategories = cache(async () => serviceCategories);

export const getService = cache(async (slug: string) => {
  const service = services.find((s) => s.slug === slug);
  const detail = serviceDetails[slug];
  return service && detail ? { ...service, ...detail } : null;
});

/* Projects */
export const getProjects = cache(async (opts: { featured?: boolean; sectorId?: string } = {}) =>
  projects.filter((p) => (opts.featured ? p.featured : true) && (opts.sectorId ? p.sectorId === opts.sectorId : true)),
);

export const getProject = cache(async (slug: string) => {
  const project = projects.find((p) => p.slug === slug);
  const detail = projectDetails[slug];
  return project && detail ? { ...project, ...detail } : null;
});

/* Sectors */
export const getSectors = cache(async () => sectors);

export const getSector = cache(async (slug: string) => {
  const sector = sectors.find((s) => s.slug === slug);
  return sector ? { ...sector, ...sectorDetails[sector.id] } : null;
});

/* Clients & testimonials */
export const getClients = cache(async () => clients);

export const getTestimonials = cache(async () => testimonials);

export const getSuccessStories = cache(async () => successStories);

/* Media center */
export const getLatestNews = cache(async (limit = 3) =>
  [...news].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, limit),
);

export const getNews = cache(async (kind?: NewsKind) =>
  news.filter((n) => (kind ? n.kind === kind : true)).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
);

export const getNewsPost = cache(async (slug: string) => {
  const post = news.find((n) => n.slug === slug);
  return post ? { ...post, ...(newsBodies[slug] ?? { body: post.excerpt }) } : null;
});

export const getPhotos = cache(async () => photos);

export const getVideos = cache(async () => videos);

/* Careers */
export const getJobs = cache(async () => jobs.filter((j) => j.open).sort((a, b) => b.postedAt.localeCompare(a.postedAt)));

export const getJob = cache(async (slug: string) => jobs.find((j) => j.slug === slug && j.open) ?? null);

/* Contact & misc */
export const getBranches = cache(async () => branches);

export const getFaqs = cache(async () => faqs);

export const getLegalPage = cache(async (slug: string) => legalPages.find((p) => p.slug === slug) ?? null);
