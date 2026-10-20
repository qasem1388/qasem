import "server-only";
import { cache } from "react";
import { clients, news, projects, sectors, serviceCategories, services, testimonials } from "@/content/demo/collections";
import { homePage } from "@/content/demo/home";
import { siteSettings } from "@/content/demo/site";

/**
 * Content access layer. Every page reads data through these functions only,
 * so the demo source can be swapped for the database (phase 3) without
 * touching any UI component.
 */
export const getSiteSettings = cache(async () => siteSettings);

export const getHomePage = cache(async () => homePage);

export const getServices = cache(async (opts: { featured?: boolean } = {}) =>
  services.filter((s) => (opts.featured ? s.featured : true)).sort((a, b) => a.order - b.order),
);

export const getServiceCategories = cache(async () => serviceCategories);

export const getProjects = cache(async (opts: { featured?: boolean } = {}) =>
  projects.filter((p) => (opts.featured ? p.featured : true)),
);

export const getSectors = cache(async () => sectors);

export const getClients = cache(async () => clients);

export const getTestimonials = cache(async () => testimonials);

export const getLatestNews = cache(async (limit = 3) =>
  [...news].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, limit),
);
