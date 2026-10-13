'use strict';
/**
 * توليد رابط (Slug) يدعم الحروف العربية والإنجليزية.
 * الروابط العربية مدعومة في محركات البحث والمتصفحات الحديثة.
 */
const ARABIC_DIACRITICS = /[ً-ٰٟـ]/g; // التشكيل والتطويل

function slugify(input, { latinOnly = false } = {}) {
  let s = String(input || '').normalize('NFKC').replace(ARABIC_DIACRITICS, '').toLowerCase().trim();
  s = s.replace(/[\s_]+/g, '-');
  s = latinOnly ? s.replace(/[^a-z0-9-]/g, '') : s.replace(/[^\p{L}\p{N}-]/gu, '');
  return s.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 200);
}

const SLUG_RE = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;
const LATIN_SLUG_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

module.exports = { slugify, SLUG_RE, LATIN_SLUG_RE };
