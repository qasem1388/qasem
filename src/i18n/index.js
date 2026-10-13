'use strict';
/**
 * نصوص واجهة الموقع العام. اللغة الأساسية العربية، والبنية جاهزة لإضافة الإنجليزية:
 * يكفي إكمال ملف en.js وتمرير اللغة المطلوبة (مثلًا عبر بادئة /en في الرابط مستقبلًا).
 */
const ar = require('./ar');
const en = require('./en');

const LOCALES = { ar: { dict: ar, dir: 'rtl', lang: 'ar', intl: 'ar-SA-u-ca-gregory-nu-latn' }, en: { dict: en, dir: 'ltr', lang: 'en', intl: 'en-GB' } };

function getLocale(code) {
  const loc = LOCALES[code] || LOCALES.ar;
  const t = (key, vars) => {
    let s = loc.dict[key] ?? ar[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
    return s;
  };
  return { ...loc, t };
}

module.exports = { getLocale, LOCALES };
