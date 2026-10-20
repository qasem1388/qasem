import type { HomeSectionKey } from "@/types/content";
import { AboutSection } from "./about";
import { ClientsSection } from "./clients";
import { ContactSection } from "./contact";
import { HeroSection } from "./hero";
import { NewsSection } from "./news";
import { ProjectsSection } from "./projects";
import { QuoteSection } from "./quote";
import { SectorsSection } from "./sectors";
import { ServicesSection } from "./services";
import { StatsSection } from "./stats";
import { TestimonialsSection } from "./testimonials";
import type { SectionProps } from "./types";
import { VisionMissionSection } from "./vision-mission";
import { WhyUsSection } from "./why-us";

/**
 * Maps each configurable homepage block to its component. The order and
 * visibility come from content (`homePage.sections`), so the admin panel
 * can reorder or hide sections without code changes.
 */
export const homeSections: Record<HomeSectionKey, (props: SectionProps) => React.ReactNode | Promise<React.ReactNode>> = {
  hero: HeroSection,
  about: AboutSection,
  visionMission: VisionMissionSection,
  services: ServicesSection,
  stats: StatsSection,
  projects: ProjectsSection,
  sectors: SectorsSection,
  whyUs: WhyUsSection,
  clients: ClientsSection,
  testimonials: TestimonialsSection,
  news: NewsSection,
  quote: QuoteSection,
  contact: ContactSection,
};
