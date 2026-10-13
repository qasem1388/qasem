'use strict';
/** خريطة الموقع sitemap.xml وملف robots.txt (يُولَّدان ديناميكيًا من قاعدة البيانات) */
const express = require('express');
const knex = require('../../db/knex');
const { getSettings } = require('../../core/settings');
const { absUrl } = require('./context');

const router = express.Router();

const xmlEscape = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
const day = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(/^\d{4}-\d{2}-\d{2} /.test(v) ? v.replace(' ', 'T') + 'Z' : v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

router.get('/robots.txt', async (req, res, next) => {
  try {
    const s = await getSettings();
    const lines = ['User-agent: *'];
    if (s.seo_allow_indexing === false) lines.push('Disallow: /');
    else lines.push('Allow: /', 'Disallow: /admin', 'Disallow: /api/', '', `Sitemap: ${absUrl(req, '/sitemap.xml')}`);
    res.type('text/plain').send(lines.join('\n') + '\n');
  } catch (e) { next(e); }
});

router.get('/favicon.ico', async (req, res, next) => {
  try {
    const s = await getSettings();
    const icon = s.favicon || s.logo;
    if (icon && icon.startsWith('/uploads/')) return res.redirect(302, icon);
    res.status(204).end();
  } catch (e) { next(e); }
});

router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const urls = [];
    const add = (path, lastmod, priority = '0.6', changefreq = 'monthly') => urls.push({ loc: absUrl(req, path), lastmod: day(lastmod), priority, changefreq });
    add('/', null, '1.0', 'daily');
    for (const p of ['/about', '/governance', '/members', '/executive-manager', '/organizational-structure', '/projects', '/media-center',
      '/media-center/news', '/media-center/videos', '/media-center/gallery', '/beneficiary-needs', '/beneficiary-satisfaction', '/volunteer', '/jobs', '/contact']) add(p, null, '0.7');
    const enc = encodeURIComponent;
    for (const r of await knex('pages').where('status', 'published').select('slug', 'updated_at')) add(`/page/${enc(r.slug)}`, r.updated_at, '0.6');
    for (const r of await knex('news').where('status', 'published').select('slug', 'updated_at').orderBy('id', 'desc').limit(5000)) add(`/media-center/news/${enc(r.slug)}`, r.updated_at, '0.8', 'weekly');
    for (const r of await knex('projects').where('status', 'published').select('slug', 'updated_at')) add(`/projects/${enc(r.slug)}`, r.updated_at, '0.7');
    for (const r of await knex('job_posts').where('status', 'published').select('slug', 'updated_at')) add(`/jobs/${enc(r.slug)}`, r.updated_at, '0.5', 'weekly');
    for (const r of await knex('albums').where('is_active', true).select('slug', 'updated_at')) add(`/media-center/gallery/${enc(r.slug)}`, r.updated_at, '0.4');
    const body = urls.map((u) => `  <url><loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
  } catch (e) { next(e); }
});

module.exports = router;
