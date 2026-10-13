'use strict';
/** تجهيز البيانات المشتركة لجميع صفحات الموقع العام: الإعدادات، القوائم، الفوتر، دوال العرض، SEO */
const knex = require('../../db/knex');
const config = require('../../config');
const { getSettings } = require('../../core/settings');
const { FONT_VALUES } = require('../../core/settings-schema');
const { getLocale } = require('../../i18n');
const O = require('../../core/options');

const COLOR_RE = /^#[0-9a-f]{6}$/i;
const SOCIAL_ICONS = {
  x: 'fa-brands fa-x-twitter', facebook: 'fa-brands fa-facebook-f', instagram: 'fa-brands fa-instagram', snapchat: 'fa-brands fa-snapchat',
  youtube: 'fa-brands fa-youtube', tiktok: 'fa-brands fa-tiktok', whatsapp: 'fa-brands fa-whatsapp', linkedin: 'fa-brands fa-linkedin-in', telegram: 'fa-brands fa-telegram',
};

function buildTree(items) {
  const byId = new Map(items.map((i) => [i.id, { ...i, children: [] }]));
  const roots = [];
  for (const it of byId.values()) {
    if (it.parent_id && byId.has(it.parent_id)) byId.get(it.parent_id).children.push(it);
    else if (!it.parent_id) roots.push(it);
  }
  return roots;
}

async function navigation(location) {
  const rows = await knex('navigation_items as n')
    .leftJoin('pages as p', 'p.id', 'n.page_id')
    .where('n.location', location).andWhere('n.is_active', true)
    .orderBy([{ column: 'n.sort_order' }, { column: 'n.id' }])
    .select('n.id', 'n.parent_id', 'n.label', 'n.link_type', 'n.url', 'n.open_new_tab', 'p.slug as page_slug', 'p.status as page_status');
  const items = rows
    .filter((r) => r.link_type !== 'page' || r.page_status === 'published')
    .map((r) => ({ ...r, href: r.link_type === 'page' ? (r.page_slug ? `/page/${encodeURIComponent(r.page_slug)}` : '#') : r.url || '#' }));
  return buildTree(items);
}

function absUrl(req, p = '') {
  const base = config.siteUrl || `${req.protocol}://${req.get('host')}`;
  if (!p) return base;
  return /^https?:\/\//i.test(p) ? p : base + (p.startsWith('/') ? p : '/' + p);
}

function makeHelpers(locale) {
  const dateFmt = new Intl.DateTimeFormat(locale.intl, { day: 'numeric', month: 'long', year: 'numeric' });
  const numFmt = new Intl.NumberFormat('en-US');
  return {
    formatDate(v) {
      if (!v) return '';
      const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T00:00:00Z' : v);
      return Number.isNaN(d.getTime()) ? String(v) : dateFmt.format(d);
    },
    formatNumber: (n) => numFmt.format(Number(n) || 0),
    excerpt(html, len = 160) {
      const text = String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      return text.length > len ? text.slice(0, len).replace(/\s+\S*$/, '') + '…' : text;
    },
    lines: (s) => String(s || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
    optLabel: (list, v) => ((O[list] || []).find((o) => o.value === v) || {}).label || v || '',
    isExternal: (href) => /^https?:\/\//i.test(href || ''),
    initials: (name) => String(name || '').replace(/^(م\.|د\.|أ\.)\s*/, '').split(/\s+/).filter((w) => !['بن', 'بنت'].includes(w)).slice(0, 2).map((w) => w[0]).join(' '),
    json: (v) => JSON.stringify(v).replace(/</g, '\\u003c'),
  };
}

function themeCss(s) {
  const c = (k, d) => (COLOR_RE.test(s[k] || '') ? s[k] : d);
  const font = FONT_VALUES.includes(s.font_family) ? s.font_family : 'Tajawal';
  const size = Math.min(Math.max(Number(s.base_font_size) || 17, 14), 22);
  return `:root{--primary:${c('color_primary', '#0f766e')};--secondary:${c('color_secondary', '#c99a2e')};--btn:${c('color_button', '#0f766e')};` +
    `--text:${c('color_text', '#1f2937')};--bg:${c('color_background', '#f7f8f6')};--footer:${c('color_footer', '#0b3b37')};` +
    `--font:'${font}',system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif;--fs:${size}px}`;
}

const fontHref = (font) => {
  const f = FONT_VALUES.includes(font) ? font : 'Tajawal';
  const weights = ['Tajawal', 'Almarai'].includes(f) ? (f === 'Almarai' ? '400;700;800' : '400;500;700;800') : '400;500;600;700';
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@${weights}&display=swap`;
};

async function siteContext(req, res, next) {
  try {
    const s = await getSettings();
    const locale = getLocale(config.defaultLocale);
    const [header, footerLinks, menuPages, footerPages, social] = await Promise.all([
      navigation('header'),
      navigation('footer'),
      knex('pages').where({ status: 'published', show_in_menu: true }).orderBy('sort_order').select('name', 'slug'),
      knex('pages').where({ status: 'published', show_in_footer: true }).orderBy('sort_order').select('name', 'slug'),
      knex('social_links').where('is_active', true).orderBy('sort_order').select('platform', 'url', 'label'),
    ]);
    // الصفحات المحددة بـ "إظهار في القائمة" تضاف تلقائيًا إن لم تكن مرتبطة يدويًا
    const linked = new Set();
    const walk = (list) => list.forEach((i) => { linked.add(i.href); walk(i.children); });
    walk(header);
    for (const p of menuPages) {
      const href = `/page/${encodeURIComponent(p.slug)}`;
      if (!linked.has(href)) header.push({ id: `p-${p.slug}`, label: p.name, href, children: [] });
    }

    Object.assign(res.locals, makeHelpers(locale), {
      s, t: locale.t, locale, theme: themeCss(s), fontHref: fontHref(s.font_family),
      nav: header, footerLinks, footerPages, social: social.map((x) => ({ ...x, icon: SOCIAL_ICONS[x.platform] || 'fa-solid fa-link', name: (O.SOCIAL_PLATFORM.find((o) => o.value === x.platform) || {}).label })),
      currentPath: req.path, isAdmin: !!req.user, year: new Date().getFullYear(),
      absUrl: (p) => absUrl(req, p),
      seo: {}, breadcrumbs: [], preview: false,
    });
    next();
  } catch (e) {
    next(e);
  }
}

/** دمج بيانات SEO الخاصة بالصفحة مع الإعدادات الافتراضية */
function seoFor(req, res, { title, description, image, type = 'website', noindex = false, jsonLd = null, canonical } = {}) {
  const s = res.locals.s;
  const siteTitle = s.seo_title || s.org_name;
  const sep = s.seo_title_separator || '|';
  const desc = (description || s.seo_description || s.org_description || '').slice(0, 300);
  const img = image || s.seo_og_image || s.logo;
  const path = canonical || req.path;
  return {
    title: title ? `${title} ${sep} ${siteTitle}` : siteTitle,
    ogTitle: title || siteTitle,
    description: desc,
    keywords: s.seo_keywords,
    image: img ? absUrl(req, img) : null,
    type,
    canonical: absUrl(req, path === '/' ? '/' : path),
    noindex: noindex || s.seo_allow_indexing === false,
    jsonLd,
  };
}

module.exports = { siteContext, seoFor, absUrl, buildTree, SOCIAL_ICONS };
