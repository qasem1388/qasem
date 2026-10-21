/**
 * Seeds the database with the demo company «شركة الريادة التجارية».
 * Safe to re-run: content tables are cleared and re-created; users, sessions,
 * audit logs and inbox records are never touched.
 *
 * Usage: npx prisma db seed
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type JobType, type NewsKind } from "../src/generated/prisma/client";
import { clients, news, projects, sectors, serviceCategories, services, testimonials } from "../src/content/demo/collections";
import { aboutPage, branches, faqs, jobs, legalPages, photos, successStories, videos } from "../src/content/demo/company";
import { newsBodies, projectDetails, sectorDetails, serviceDetails } from "../src/content/demo/details";
import { homePage } from "../src/content/demo/home";
import { siteSettings } from "../src/content/demo/site";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const jobType: Record<string, JobType> = {
  "full-time": "FULL_TIME",
  "part-time": "PART_TIME",
  contract: "CONTRACT",
  internship: "INTERNSHIP",
};
const newsKind: Record<string, NewsKind> = { news: "NEWS", article: "ARTICLE", announcement: "ANNOUNCEMENT", event: "EVENT" };

async function main() {
  await db.$transaction(
    async (tx) => {
      // Children first to respect foreign keys.
      await tx.service.deleteMany();
      await tx.serviceCategory.deleteMany();
      await tx.successStory.deleteMany();
      await tx.project.deleteMany();
      await tx.sector.deleteMany();
      await tx.newsPost.deleteMany();
      await tx.client.deleteMany();
      await tx.testimonial.deleteMany();
      await tx.galleryPhoto.deleteMany();
      await tx.video.deleteMany();
      await tx.branch.deleteMany();
      await tx.faq.deleteMany();
      await tx.page.deleteMany();
      await tx.job.updateMany({ data: { open: false } });

      for (const [key, value] of Object.entries({ site: siteSettings, home: homePage, about: aboutPage })) {
        await tx.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
      }

      const categoryIds = new Map<string, string>();
      for (const [order, c] of serviceCategories.entries()) {
        const row = await tx.serviceCategory.create({ data: { slug: c.id, name: c.name, order } });
        categoryIds.set(c.id, row.id);
      }
      for (const s of services) {
        const d = serviceDetails[s.slug];
        await tx.service.create({
          data: {
            slug: s.slug,
            categoryId: categoryIds.get(s.categoryId)!,
            icon: s.icon,
            title: s.title,
            summary: s.summary,
            body: d?.body ?? s.summary,
            features: d?.features ?? [],
            gallery: d?.gallery ?? [],
            image: s.image,
            featured: s.featured,
            order: s.order,
          },
        });
      }

      const sectorIds = new Map<string, string>();
      for (const [order, s] of sectors.entries()) {
        const d = sectorDetails[s.id];
        const row = await tx.sector.create({
          data: {
            slug: s.slug,
            icon: s.icon,
            name: s.name,
            summary: s.summary,
            body: d?.body ?? s.summary,
            challenges: d?.challenges ?? [],
            order,
          },
        });
        sectorIds.set(s.id, row.id);
      }

      for (const [order, p] of projects.entries()) {
        const d = projectDetails[p.slug];
        await tx.project.create({
          data: {
            slug: p.slug,
            title: p.title,
            summary: p.summary,
            body: d?.body ?? p.summary,
            client: d?.client ?? { ar: "", en: "" },
            scope: d?.scope ?? [],
            gallery: d?.gallery ?? [],
            sectorId: sectorIds.get(p.sectorId),
            status: p.status === "completed" ? "COMPLETED" : "ONGOING",
            location: p.location,
            year: p.year,
            image: p.image,
            featured: p.featured,
            order,
          },
        });
      }

      for (const n of news) {
        const d = newsBodies[n.slug];
        await tx.newsPost.create({
          data: {
            slug: n.slug,
            kind: newsKind[n.kind],
            title: n.title,
            excerpt: n.excerpt,
            body: d?.body ?? n.excerpt,
            image: n.image,
            publishedAt: new Date(n.publishedAt),
            eventDate: d?.eventDate ? new Date(d.eventDate) : null,
            eventLocation: d?.eventLocation,
          },
        });
      }

      await tx.client.createMany({ data: clients.map((c, order) => ({ name: c.name, logo: c.logo, url: c.url, order })) });
      await tx.testimonial.createMany({
        data: testimonials.map((t, order) => ({ quote: t.quote, author: t.author, role: t.role, rating: t.rating, order })),
      });
      await tx.successStory.createMany({
        data: successStories.map((s, order) => ({
          title: s.title,
          sectorId: sectorIds.get(s.sectorId),
          challenge: s.challenge,
          solution: s.solution,
          result: s.result,
          metricValue: s.metric.value,
          metricLabel: s.metric.label,
          order,
        })),
      });
      await tx.galleryPhoto.createMany({
        data: photos.map((p, order) => ({ src: p.src, caption: p.caption, album: p.album, order })),
      });
      await tx.video.createMany({
        data: videos.map((v, order) => ({
          title: v.title,
          poster: v.poster,
          youtubeId: v.youtubeId,
          duration: v.duration,
          order,
        })),
      });
      await tx.branch.createMany({
        data: branches.map((b, order) => ({
          name: b.name,
          address: b.address,
          phone: b.phone,
          phoneDisplay: b.phoneDisplay,
          email: b.email,
          hours: b.hours,
          lat: b.lat,
          lng: b.lng,
          isMain: !!b.isMain,
          order,
        })),
      });
      await tx.faq.createMany({
        data: faqs.map((f, order) => ({ category: f.category, question: f.question, answer: f.answer, order })),
      });

      for (const j of jobs) {
        const data = {
          title: j.title,
          department: j.department,
          location: j.location,
          type: jobType[j.type],
          experience: j.experience,
          summary: j.summary,
          responsibilities: j.responsibilities,
          requirements: j.requirements,
          open: j.open,
          postedAt: new Date(j.postedAt),
        };
        // Jobs are upserted (not deleted) so existing applications keep their link.
        await tx.job.upsert({ where: { slug: j.slug }, create: { slug: j.slug, ...data }, update: data });
      }

      await tx.page.createMany({
        data: legalPages.map((p) => ({ slug: p.slug, title: p.title, body: p.body, updatedAt: new Date(p.updatedAt) })),
      });
    },
    { timeout: 60_000 },
  );

  console.log("✔ Demo content seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
