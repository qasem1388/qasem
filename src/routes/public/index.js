'use strict';
/** مسارات الموقع العام (صفحات تُولَّد من الخادم لتحسين الأرشفة في محركات البحث) */
const express = require('express');
const knex = require('../../db/knex');
const { siteContext, seoFor, buildTree } = require('./context');
const forms = require('./forms');
const seoRoutes = require('./seo');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const active = (table) => knex(table).where('is_active', true).orderBy([{ column: 'sort_order' }, { column: 'id' }]);
const parseJson = (v) => { try { return JSON.parse(v || '[]'); } catch { return []; } };
const PER_PAGE = 9;

router.use(seoRoutes);
router.use(siteContext);

function render(res, view, data = {}) {
  res.render(`pages/${view}`, data);
}

/** المحتوى غير المنشور يُعرض فقط للمدير المسجل في وضع المعاينة */
function publishedOrPreview(req, res, row) {
  if (!row) return false;
  if (row.status === 'published') return true;
  if (req.user && 'preview' in req.query) {
    res.locals.preview = true;
    return true;
  }
  return false;
}

function crumbs(res, ...items) {
  res.locals.breadcrumbs = [{ label: res.locals.t('home'), href: '/' }, ...items];
}

function notFound(req, res) {
  res.status(404);
  renderError(req, res, 404);
}

// ================= الصفحة الرئيسية =================
router.get('/', wrap(async (req, res) => {
  const s = res.locals.s;
  const [slides, mvv, stats, services, news] = await Promise.all([
    s.home_show_slider !== false ? active('homepage_slides') : [],
    s.home_show_mvv !== false ? active('mission_vision_values') : [],
    s.home_show_stats !== false ? active('statistics').where('scope', 'home') : [],
    s.home_show_services !== false ? active('services').limit(12) : [],
    s.home_show_news !== false ? knex('news').where('status', 'published').orderBy([{ column: 'published_at', order: 'desc' }, { column: 'id', order: 'desc' }]).limit(3) : [],
  ]);
  const org = {
    '@context': 'https://schema.org', '@type': 'NGO', name: s.org_name, description: s.org_description || undefined,
    url: res.locals.absUrl('/'), logo: s.logo ? res.locals.absUrl(s.logo) : undefined, email: s.email || undefined, telephone: s.phone || undefined,
    address: s.address ? { '@type': 'PostalAddress', streetAddress: s.address, addressLocality: s.city || undefined, addressCountry: 'SA' } : undefined,
    sameAs: res.locals.social.map((x) => x.url),
  };
  res.locals.seo = seoFor(req, res, { jsonLd: org });
  render(res, 'home', { slides, mvv, stats, services, news });
}));

// ================= عن الجمعية =================
router.get('/about', wrap(async (req, res) => {
  const [sections, mvv] = await Promise.all([active('about_content'), active('mission_vision_values')]);
  const hasMvvSection = sections.some((x) => ['mission', 'vision', 'values'].includes(x.section_key));
  crumbs(res, { label: res.locals.t('about_us') });
  res.locals.seo = seoFor(req, res, { title: res.locals.t('about_us'), description: res.locals.excerpt(sections[0] && sections[0].content, 200) });
  render(res, 'about', { sections, mvv: hasMvvSection ? [] : mvv });
}));

// ================= الحوكمة =================
router.get('/governance', wrap(async (req, res) => {
  const years = await knex('governance_years').where('is_active', true).orderBy('year', 'desc');
  const selected = years.find((y) => String(y.year) === String(req.query.year)) || years[0] || null;
  const files = selected ? await active('governance_files').where('year_id', selected.id) : [];
  crumbs(res, { label: res.locals.t('governance') });
  res.locals.seo = seoFor(req, res, { title: res.locals.t('governance'), description: res.locals.s.governance_intro, canonical: '/governance' });
  render(res, 'governance', { years, selected, files });
}));

// ================= الأعضاء =================
router.get('/members', wrap(async (req, res) => {
  const [members, employees] = await Promise.all([active('members'), active('employees')]);
  const groups = [
    { key: 'general_assembly', title: res.locals.t('general_assembly'), people: members.filter((m) => m.member_group === 'general_assembly') },
    { key: 'board', title: res.locals.t('board'), people: members.filter((m) => m.member_group === 'board') },
    { key: 'employees', title: res.locals.t('employees'), people: employees },
  ];
  crumbs(res, { label: res.locals.t('about_us'), href: '/about' }, { label: res.locals.t('members') });
  res.locals.seo = seoFor(req, res, { title: res.locals.t('members') });
  render(res, 'members', { groups });
}));

// ================= المدير التنفيذي =================
router.get('/executive-manager', wrap(async (req, res) => {
  const em = await knex('executive_manager').orderBy('id').first();
  crumbs(res, { label: res.locals.t('about_us'), href: '/about' }, { label: res.locals.t('executive_manager') });
  res.locals.seo = seoFor(req, res, { title: (em && em.job_title) || res.locals.t('executive_manager'), description: em && res.locals.excerpt(em.bio, 200), image: em && em.photo });
  render(res, 'executive-manager', { em });
}));

// ================= الهيكل التنظيمي =================
router.get('/organizational-structure', wrap(async (req, res) => {
  const units = await active('organizational_units');
  const ids = new Set(units.map((u) => u.id));
  const tree = buildTree(units.map((u) => ({ ...u, parent_id: ids.has(u.parent_id) ? u.parent_id : null })));
  crumbs(res, { label: res.locals.t('about_us'), href: '/about' }, { label: res.locals.t('org_structure') });
  res.locals.seo = seoFor(req, res, { title: res.locals.t('org_structure') });
  render(res, 'org-structure', { tree, mode: res.locals.s.org_structure_mode || 'chart', image: res.locals.s.org_structure_image });
}));

// ================= المشاريع =================
router.get('/projects', wrap(async (req, res) => {
  const q = knex('projects').where('status', 'published');
  if (req.query.category) q.where('category', String(req.query.category));
  const [projects, categories] = await Promise.all([
    q.orderBy([{ column: 'sort_order' }, { column: 'id', order: 'desc' }]),
    knex('projects').where('status', 'published').whereNotNull('category').distinct('category').pluck('category'),
  ]);
  crumbs(res, { label: res.locals.t('projects') });
  res.locals.seo = seoFor(req, res, { title: res.locals.t('projects'), canonical: '/projects' });
  render(res, 'projects', { projects, categories, category: req.query.category || '' });
}));

router.get('/projects/:slug', wrap(async (req, res) => {
  const p = await knex('projects').where('slug', req.params.slug).first();
  if (!publishedOrPreview(req, res, p)) return notFound(req, res);
  p.gallery = parseJson(p.gallery);
  crumbs(res, { label: res.locals.t('projects'), href: '/projects' }, { label: p.title });
  res.locals.seo = seoFor(req, res, { title: p.seo_title || p.title, description: p.seo_description || p.summary, image: p.og_image || p.image, noindex: res.locals.preview });
  render(res, 'project', { p });
}));

// ================= المركز الإعلامي =================
const publishedNews = () => knex('news as n').leftJoin('news_categories as c', 'c.id', 'n.category_id').where('n.status', 'published')
  .select('n.*', 'c.name as category_name', 'c.slug as category_slug').orderBy([{ column: 'n.published_at', order: 'desc' }, { column: 'n.id', order: 'desc' }]);

router.get('/media-center', wrap(async (req, res) => {
  const [news, videos, albums] = await Promise.all([publishedNews().limit(6), active('media_videos').limit(3), active('albums').limit(3)]);
  crumbs(res, { label: res.locals.t('media_center') });
  res.locals.seo = seoFor(req, res, { title: res.locals.t('media_center') });
  render(res, 'media-center', { news, videos, albums });
}));

router.get('/media-center/news', wrap(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const q = publishedNews();
  const categories = await active('news_categories');
  const cat = categories.find((c) => c.slug === req.query.category);
  if (cat) q.where('n.category_id', cat.id);
  const term = String(req.query.q || '').trim().slice(0, 100);
  if (term) q.where((w) => w.where('n.title', knex.likeOp, `%${term}%`).orWhere('n.excerpt', knex.likeOp, `%${term}%`));
  const [{ c }] = await q.clone().clearSelect().clearOrder().count({ c: 'n.id' });
  const total = Number(c);
  const items = await q.limit(PER_PAGE).offset((page - 1) * PER_PAGE);
  crumbs(res, { label: res.locals.t('media_center'), href: '/media-center' }, { label: res.locals.t('news') });
  res.locals.seo = seoFor(req, res, { title: res.locals.t('news'), noindex: !!term });
  render(res, 'news-list', { items, categories, category: cat ? cat.slug : '', q: term, page, pages: Math.max(1, Math.ceil(total / PER_PAGE)) });
}));

router.get('/media-center/news/:slug', wrap(async (req, res) => {
  const n = await knex('news as n').leftJoin('news_categories as c', 'c.id', 'n.category_id')
    .where('n.slug', req.params.slug).first('n.*', 'c.name as category_name', 'c.slug as category_slug');
  if (!publishedOrPreview(req, res, n)) return notFound(req, res);
  if (!res.locals.preview) knex('news').where('id', n.id).increment('views', 1).catch(() => {});
  n.gallery = parseJson(n.gallery);
  n.attachments = parseJson(n.attachments);
  const related = await publishedNews().whereNot('n.id', n.id).modify((q) => n.category_id && q.where('n.category_id', n.category_id)).limit(3);
  const url = res.locals.absUrl(`/media-center/news/${encodeURIComponent(n.slug)}`);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'NewsArticle', headline: n.title, datePublished: n.published_at,
    dateModified: n.updated_at instanceof Date ? n.updated_at.toISOString() : n.updated_at,
    image: n.image ? [res.locals.absUrl(n.image)] : undefined, author: { '@type': 'Organization', name: n.author_name || res.locals.s.org_name },
    publisher: { '@type': 'Organization', name: res.locals.s.org_name, logo: res.locals.s.logo ? { '@type': 'ImageObject', url: res.locals.absUrl(res.locals.s.logo) } : undefined },
    mainEntityOfPage: url,
  };
  crumbs(res, { label: res.locals.t('media_center'), href: '/media-center' }, { label: res.locals.t('news'), href: '/media-center/news' }, { label: n.title });
  res.locals.seo = seoFor(req, res, { title: n.seo_title || n.title, description: n.seo_description || n.excerpt || res.locals.excerpt(n.content, 200), image: n.og_image || n.image, type: 'article', jsonLd, noindex: res.locals.preview });
  render(res, 'news-item', { n, related, shareUrl: url });
}));

router.get('/media-center/videos', wrap(async (req, res) => {
  const videos = await active('media_videos');
  crumbs(res, { label: res.locals.t('media_center'), href: '/media-center' }, { label: res.locals.t('videos') });
  res.locals.seo = seoFor(req, res, { title: res.locals.t('videos') });
  render(res, 'videos', { videos });
}));

router.get('/media-center/gallery', wrap(async (req, res) => {
  const albums = await knex('albums as a').where('a.is_active', true)
    .select('a.*', knex('media_images').count('*').whereRaw('?? = ??', ['media_images.album_id', 'a.id']).andWhere('media_images.is_active', true).as('images_count'))
    .orderBy([{ column: 'a.sort_order' }, { column: 'a.id' }]);
  crumbs(res, { label: res.locals.t('media_center'), href: '/media-center' }, { label: res.locals.t('gallery') });
  res.locals.seo = seoFor(req, res, { title: res.locals.t('gallery') });
  render(res, 'gallery', { albums });
}));

router.get('/media-center/gallery/:slug', wrap(async (req, res) => {
  const album = await knex('albums').where({ slug: req.params.slug, is_active: true }).first();
  if (!album) return notFound(req, res);
  const images = await active('media_images').where('album_id', album.id);
  crumbs(res, { label: res.locals.t('media_center'), href: '/media-center' }, { label: res.locals.t('gallery'), href: '/media-center/gallery' }, { label: album.title });
  res.locals.seo = seoFor(req, res, { title: album.title, description: album.description, image: album.cover_image });
  render(res, 'album', { album, images });
}));

// ================= المستفيدون =================
async function sectionsPage(req, res, { table, scope, view, titleKey }) {
  const [sections, stats] = await Promise.all([active(table), active('statistics').where('scope', scope)]);
  sections.forEach((x) => { x.attachments = parseJson(x.attachments); });
  crumbs(res, { label: res.locals.t(titleKey) });
  res.locals.seo = seoFor(req, res, { title: res.locals.t(titleKey), description: res.locals.excerpt(sections[0] && sections[0].content, 200) });
  render(res, view, { sections, stats, title: res.locals.t(titleKey) });
}
router.get('/beneficiary-needs', wrap((req, res) => sectionsPage(req, res, { table: 'beneficiary_needs', scope: 'needs', view: 'sections', titleKey: 'beneficiary_needs' })));
router.get('/beneficiary-satisfaction', wrap((req, res) => sectionsPage(req, res, { table: 'satisfaction_surveys', scope: 'satisfaction', view: 'sections', titleKey: 'beneficiary_satisfaction' })));

// ================= النماذج (التطوع، الوظائف، التواصل) =================
router.use(forms);

// ================= الصفحات الديناميكية =================
router.get('/page/:slug', wrap(async (req, res) => {
  const p = await knex('pages').where('slug', req.params.slug).first();
  if (!publishedOrPreview(req, res, p)) return notFound(req, res);
  crumbs(res, { label: p.title });
  res.locals.seo = seoFor(req, res, { title: p.seo_title || p.title, description: p.seo_description || res.locals.excerpt(p.content, 200), image: p.og_image || p.image, noindex: res.locals.preview });
  render(res, 'page', { p });
}));

// ================= 404 =================
router.use((req, res) => notFound(req, res));

function renderError(req, res, status, message) {
  const t = res.locals.t || ((k) => k);
  const view = () => res.render('pages/error', { status, message: status === 404 ? t('not_found_desc') : message || t('server_error') }, (err, html) => {
    if (err) {
      console.error(err);
      return res.send(`<h1>${status}</h1>`);
    }
    res.send(html);
  });
  if (res.locals.s) {
    res.locals.seo = { title: status === 404 ? t('not_found') : t('server_error'), noindex: true };
    return view();
  }
  // في حال وقوع الخطأ قبل تجهيز سياق الموقع
  siteContext(req, res, () => { res.locals.seo = { title: String(status), noindex: true }; view(); });
}

router.renderError = renderError;
module.exports = router;
