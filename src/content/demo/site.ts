import type { SiteSettings } from "@/types/content";

/**
 * Default identity for the demo company «شركة الريادة التجارية».
 * All registration numbers, phones and addresses are placeholders — replace
 * them from the admin panel (phase 4) before going live.
 */
export const siteSettings: SiteSettings = {
  name: { ar: "شركة الريادة التجارية", en: "Al-Riyada Trading Company" },
  tagline: {
    ar: "حلول تجارية متكاملة بمعايير عالمية",
    en: "Integrated business solutions to global standards",
  },
  description: {
    ar: "شركة سعودية تقدم حلول التوريد والمقاولات والخدمات اللوجستية والاستشارات للقطاعين العام والخاص، بفريق متخصص والتزام بالجودة والمواعيد.",
    en: "A Saudi company delivering procurement, contracting, logistics and advisory solutions to the public and private sectors, with a specialised team committed to quality and on-time delivery.",
  },
  logo: { mark: "/brand/logo-mark.svg" },
  brand: {
    primary: "#0b1f3a",
    secondary: "#c8a24a",
    accent: "#1d4e89",
    surface: "#f5f7fa",
    text: "#0f172a",
    button: "#c8a24a",
    buttonText: "#0b1f3a",
    radius: 14,
    font: "plex",
    fontScale: 1,
  },
  contact: {
    phone: "+966110000000",
    phoneDisplay: "011 000 0000",
    email: "info@example.com",
    whatsapp: "966500000000",
    address: {
      ar: "طريق الملك فهد، حي العليا، الرياض 12211",
      en: "King Fahd Road, Al Olaya District, Riyadh 12211",
    },
    city: { ar: "الرياض، المملكة العربية السعودية", en: "Riyadh, Saudi Arabia" },
    region: { ar: "منطقة الرياض", en: "Riyadh Region" },
    lat: 24.7136,
    lng: 46.6753,
    workingHours: {
      ar: "الأحد – الخميس: 8:00 ص – 5:00 م",
      en: "Sun – Thu: 8:00 AM – 5:00 PM",
    },
    mapUrl: "https://maps.google.com/?q=24.7136,46.6753",
  },
  legal: { crNumber: "0000000000", vatNumber: "300000000000003" },
  social: [
    { platform: "x", url: "https://x.com/" },
    { platform: "linkedin", url: "https://www.linkedin.com/" },
    { platform: "instagram", url: "https://www.instagram.com/" },
    { platform: "youtube", url: "https://www.youtube.com/" },
  ],
  navigation: [
    { id: "home", label: { ar: "الرئيسية", en: "Home" }, href: "/", visible: true },
    {
      id: "about",
      label: { ar: "من نحن", en: "About" },
      href: "/about",
      visible: true,
      children: [
        { id: "about-company", label: { ar: "نبذة عن الشركة", en: "Company Overview" }, href: "/about", visible: true },
        { id: "about-team", label: { ar: "فريق العمل", en: "Our Team" }, href: "/about/team", visible: true },
        {
          id: "about-certs",
          label: { ar: "الشهادات والاعتمادات", en: "Certifications" },
          href: "/about/certifications",
          visible: true,
        },
      ],
    },
    { id: "services", label: { ar: "خدماتنا", en: "Services" }, href: "/services", visible: true },
    { id: "projects", label: { ar: "مشاريعنا", en: "Projects" }, href: "/projects", visible: true },
    { id: "sectors", label: { ar: "القطاعات", en: "Sectors" }, href: "/sectors", visible: true },
    {
      id: "media",
      label: { ar: "المركز الإعلامي", en: "Media Center" },
      href: "/media",
      visible: true,
      children: [
        { id: "media-news", label: { ar: "الأخبار", en: "News" }, href: "/media/news", visible: true },
        { id: "media-articles", label: { ar: "المقالات", en: "Articles" }, href: "/media/articles", visible: true },
        {
          id: "media-announcements",
          label: { ar: "الإعلانات", en: "Announcements" },
          href: "/media/announcements",
          visible: true,
        },
        { id: "media-photos", label: { ar: "معرض الصور", en: "Photo Gallery" }, href: "/media/photos", visible: true },
        { id: "media-videos", label: { ar: "معرض الفيديو", en: "Video Gallery" }, href: "/media/videos", visible: true },
        { id: "media-events", label: { ar: "الفعاليات", en: "Events" }, href: "/media/events", visible: true },
      ],
    },
    { id: "clients", label: { ar: "عملاؤنا", en: "Clients" }, href: "/clients", visible: true },
    { id: "careers", label: { ar: "التوظيف", en: "Careers" }, href: "/careers", visible: true },
    { id: "contact", label: { ar: "تواصل معنا", en: "Contact" }, href: "/contact", visible: true },
  ],
  headerCta: { label: { ar: "اطلب عرض سعر", en: "Request a Quote" }, href: "/quote" },
  footer: {
    about: {
      ar: "نعمل منذ أكثر من خمسة عشر عامًا على تقديم حلول تجارية موثوقة تدعم نمو عملائنا وتواكب مستهدفات رؤية المملكة 2030.",
      en: "For over fifteen years we have delivered reliable business solutions that support our clients’ growth in line with Saudi Vision 2030.",
    },
    columns: [
      {
        title: { ar: "روابط سريعة", en: "Quick Links" },
        links: [
          { label: { ar: "من نحن", en: "About Us" }, href: "/about" },
          { label: { ar: "خدماتنا", en: "Services" }, href: "/services" },
          { label: { ar: "مشاريعنا", en: "Projects" }, href: "/projects" },
          { label: { ar: "القطاعات", en: "Sectors" }, href: "/sectors" },
          { label: { ar: "المركز الإعلامي", en: "Media Center" }, href: "/media" },
          { label: { ar: "عملاؤنا", en: "Clients" }, href: "/clients" },
          { label: { ar: "التوظيف", en: "Careers" }, href: "/careers" },
        ],
      },
      {
        title: { ar: "خدمة العملاء", en: "Support" },
        links: [
          { label: { ar: "طلب عرض سعر", en: "Request a Quote" }, href: "/quote" },
          { label: { ar: "تواصل معنا", en: "Contact Us" }, href: "/contact" },
          { label: { ar: "الأسئلة الشائعة", en: "FAQ" }, href: "/faq" },
          { label: { ar: "سياسة الخصوصية", en: "Privacy Policy" }, href: "/privacy" },
          { label: { ar: "الشروط والأحكام", en: "Terms & Conditions" }, href: "/terms" },
          { label: { ar: "خريطة الموقع", en: "Sitemap" }, href: "/sitemap" },
        ],
      },
    ],
    copyright: {
      ar: "جميع الحقوق محفوظة لشركة الريادة التجارية",
      en: "All rights reserved — Al-Riyada Trading Company",
    },
  },
  demoMode: true,
  pages: { sectors: true, media: true, clients: true, careers: true, faq: true },
  seo: {},
};
