// توحيد النص العربي حتى يجد البحث "أحمد" عند كتابة "احمد"، و"الملف" عند كتابة "ملف"

const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const ARABIC_DIGITS = /[٠-٩۰-۹]/g;
const PREFIXES = ['وال', 'بال', 'كال', 'فال', 'لل', 'ال'];

function normalize(text) {
  return String(text || '')
    .normalize('NFC')
    .replace(DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(ARABIC_DIGITS, (d) => String((d.charCodeAt(0) & 0xf) % 10))
    .toLowerCase();
}

function tokens(text) {
  return normalize(text).match(/[\p{L}\p{N}]+/gu) || [];
}

function stripPrefix(token) {
  for (const p of PREFIXES) {
    if (token.startsWith(p) && token.length - p.length >= 2) return token.slice(p.length);
  }
  return token;
}

// النص الذي يُخزَّن في فهرس البحث: كل كلمة مع نسختها بدون "ال"
function indexText(text) {
  const out = [];
  for (const t of tokens(text)) {
    out.push(t);
    const s = stripPrefix(t);
    if (s !== t) out.push(s);
  }
  return out.join(' ');
}

// تحويل ما يكتبه المستخدم إلى استعلام FTS5 آمن: كل كلمة يجب أن تظهر (بحث بالبادئة)
function ftsQuery(text) {
  const parts = tokens(text).map(stripPrefix).filter(Boolean);
  if (!parts.length) return null;
  return parts.map((t) => `"${t.replace(/"/g, '')}"*`).join(' AND ');
}

module.exports = { normalize, tokens, indexText, ftsQuery };
