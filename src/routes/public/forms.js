'use strict';
/** النماذج العامة: تسجيل متطوع، التقديم على وظيفة، تواصل معنا */
const express = require('express');
const rateLimit = require('express-rate-limit');
const knex = require('../../db/knex');
const storage = require('../../core/storage');
const { EMAIL_RE } = require('../../core/validate');
const { csrfToken, tokenValid } = require('../../middleware/csrf');
const { uploader } = require('../../middleware/upload');
const { seoFor } = require('./context');
const O = require('../../core/options');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false,
  handler: (req, res) => res.status(429).send('عدد كبير من المحاولات، يرجى المحاولة لاحقًا.'),
});

const SA_MOBILE = /^(?:\+?966|0)?5\d{8}$/;
const NATIONAL_ID = /^[12]\d{9}$/;
const toLatinDigits = (s) => String(s || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));

/**
 * التحقق من حقول النموذج وفق قواعد بسيطة
 * rules: { field: { label, required, max, type: 'email'|'mobile'|'nid'|'list' } }
 */
function validate(body, rules) {
  const data = {};
  const errors = {};
  for (const [name, r] of Object.entries(rules)) {
    let v = body[name];
    if (r.type === 'list') {
      const arr = (Array.isArray(v) ? v : v ? [v] : []).map((x) => String(x).trim()).filter(Boolean).slice(0, 30);
      v = arr.join('، ');
    } else {
      v = String(v ?? '').trim();
    }
    if (['mobile', 'nid'].includes(r.type)) v = toLatinDigits(v).replace(/[\s-]/g, '');
    if (!v) {
      if (r.required) errors[name] = `${r.label} مطلوب`;
      data[name] = null;
      continue;
    }
    if (v.length > (r.max || 255)) errors[name] = `${r.label} طويل جدًا (الحد ${r.max || 255} حرفًا)`;
    else if (r.type === 'email' && !EMAIL_RE.test(v)) errors[name] = 'صيغة البريد الإلكتروني غير صحيحة';
    else if (r.type === 'mobile' && !SA_MOBILE.test(v)) errors[name] = 'رقم الجوال غير صحيح (مثال: 05xxxxxxxx)';
    else if (r.type === 'nid' && !NATIONAL_ID.test(v)) errors[name] = 'رقم الهوية يجب أن يتكون من 10 أرقام ويبدأ بـ 1 أو 2';
    data[name] = r.type === 'email' ? v.toLowerCase() : v;
  }
  return { data, errors };
}

function guard(req) {
  if (!tokenValid(req)) return 'انتهت صلاحية النموذج، يرجى إعادة المحاولة.';
  if (req.body && req.body.website) return 'spam'; // حقل مخفي لاصطياد الروبوتات
  return null;
}

function flashSuccess(req, key) {
  req.session.flash = key;
}
function takeFlash(req) {
  const f = req.session && req.session.flash;
  if (f) delete req.session.flash;
  return f;
}

// ================= التطوع =================
const VOLUNTEER_RULES = {
  full_name: { label: 'الاسم', required: true, max: 255 },
  national_id: { label: 'رقم الهوية', required: true, type: 'nid' },
  mobile: { label: 'رقم الجوال', required: true, type: 'mobile' },
  email: { label: 'البريد الإلكتروني', required: true, type: 'email' },
  city: { label: 'المدينة', required: true, max: 128 },
  qualification: { label: 'المؤهل', max: 255 },
  specialization: { label: 'التخصص', max: 255 },
  skills: { label: 'المهارات', max: 2000 },
  experience: { label: 'الخبرات', max: 3000 },
  interests: { label: 'المجالات المرغوبة', type: 'list', max: 2000 },
  availability: { label: 'أوقات التفرغ', type: 'list', max: 255 },
  notes: { label: 'الملاحظات', max: 2000 },
};
const AVAILABILITY = ['صباحًا', 'مساءً', 'نهاية الأسبوع', 'أيام العطل والإجازات', 'عن بُعد'];

function renderVolunteer(req, res, extra = {}) {
  res.locals.breadcrumbs = [{ label: res.locals.t('home'), href: '/' }, { label: res.locals.t('volunteer') }];
  res.locals.seo = seoFor(req, res, { title: res.locals.t('volunteer'), description: res.locals.s.volunteer_intro });
  res.render('pages/volunteer', {
    csrf: csrfToken(req), values: {}, errors: {}, success: false,
    areas: res.locals.lines(res.locals.s.volunteer_areas), availabilityOptions: AVAILABILITY, ...extra,
  });
}

router.get('/volunteer', (req, res) => renderVolunteer(req, res, { success: takeFlash(req) === 'volunteer' }));

router.post('/volunteer', formLimiter, wrap(async (req, res) => {
  const g = guard(req);
  if (g === 'spam') { flashSuccess(req, 'volunteer'); return res.redirect(303, '/volunteer'); }
  if (g) return res.status(403).send(g);
  const { data, errors } = validate(req.body, VOLUNTEER_RULES);
  if (Object.keys(errors).length) {
    res.status(422);
    return renderVolunteer(req, res, { values: req.body, errors });
  }
  await knex('volunteers').insert({ ...data, status: 'new' });
  flashSuccess(req, 'volunteer');
  res.redirect(303, '/volunteer');
}));

// ================= الوظائف =================
const today = () => new Date().toISOString().slice(0, 10);
const isOpen = (job) => job.status === 'published' && (!job.start_date || job.start_date <= today()) && (!job.end_date || job.end_date >= today());

router.get('/jobs', wrap(async (req, res) => {
  const jobs = await knex('job_posts').where('status', 'published').orderBy([{ column: 'sort_order' }, { column: 'id', order: 'desc' }]);
  jobs.forEach((j) => { j.open = isOpen(j); });
  res.locals.breadcrumbs = [{ label: res.locals.t('home'), href: '/' }, { label: res.locals.t('jobs') }];
  res.locals.seo = seoFor(req, res, { title: res.locals.t('jobs'), description: res.locals.s.jobs_intro });
  res.render('pages/jobs', { jobs: jobs.filter((j) => j.open || (j.end_date && j.end_date >= new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))) });
}));

async function loadJob(req, res) {
  const job = await knex('job_posts').where('slug', req.params.slug).first();
  if (!job) return null;
  if (job.status !== 'published') {
    if (!(req.user && 'preview' in req.query)) return null;
    res.locals.preview = true;
  }
  job.open = isOpen(job);
  return job;
}

const APPLY_RULES = {
  full_name: { label: 'الاسم', required: true, max: 255 },
  mobile: { label: 'رقم الجوال', required: true, type: 'mobile' },
  email: { label: 'البريد الإلكتروني', required: true, type: 'email' },
  qualification: { label: 'المؤهل', required: true, max: 255 },
  experience: { label: 'الخبرات', max: 3000 },
  message: { label: 'الرسالة', max: 3000 },
};

function renderJob(req, res, job, extra = {}) {
  res.locals.breadcrumbs = [{ label: res.locals.t('home'), href: '/' }, { label: res.locals.t('jobs'), href: '/jobs' }, { label: job.title }];
  const jsonLd = job.open ? {
    '@context': 'https://schema.org', '@type': 'JobPosting', title: job.title, description: job.description || job.title,
    datePosted: job.start_date, validThrough: job.end_date || undefined,
    employmentType: { full_time: 'FULL_TIME', part_time: 'PART_TIME', contract: 'CONTRACTOR', internship: 'INTERN' }[job.job_type],
    hiringOrganization: { '@type': 'Organization', name: res.locals.s.org_name, sameAs: res.locals.absUrl('/') },
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.location || res.locals.s.city || '', addressCountry: 'SA' } },
  } : null;
  res.locals.seo = seoFor(req, res, { title: job.seo_title || job.title, description: job.seo_description || res.locals.excerpt(job.description, 200), image: job.og_image, jsonLd, noindex: res.locals.preview });
  res.render('pages/job', { job, csrf: csrfToken(req), values: {}, errors: {}, success: false, jobTypes: O.JOB_TYPE, ...extra });
}

router.get('/jobs/:slug', wrap(async (req, res, next) => {
  const job = await loadJob(req, res);
  if (!job) return next();
  renderJob(req, res, job, { success: takeFlash(req) === `job-${job.id}` });
}));

router.post('/jobs/:slug/apply', formLimiter, (req, res, next) => {
  uploader({ maxFiles: 1 }).single('cv')(req, res, (err) => {
    if (err) {
      req.uploadError = err.code === 'LIMIT_FILE_SIZE' ? 'حجم الملف يتجاوز الحد المسموح' : 'تعذر رفع الملف';
      req.body = req.body || {};
    }
    next();
  });
}, wrap(async (req, res, next) => {
  const job = await loadJob(req, res);
  if (!job) return next();
  const g = guard(req);
  if (g === 'spam') { flashSuccess(req, `job-${job.id}`); return res.redirect(303, `/jobs/${encodeURIComponent(job.slug)}#apply`); }
  if (g) return res.status(403).send(g);
  if (!job.open) return res.status(400).send('انتهى التقديم على هذه الوظيفة');

  const { data, errors } = validate(req.body, APPLY_RULES);
  let cvInfo = null;
  if (req.uploadError) errors.cv = req.uploadError;
  else if (!req.file) errors.cv = 'السيرة الذاتية (PDF) مطلوبة';
  else {
    try { cvInfo = storage.inspect(req.file, { allow: ['pdf'] }); } catch (e) { errors.cv = e.message; }
  }
  if (Object.keys(errors).length) {
    res.status(422);
    return renderJob(req, res, job, { values: req.body, errors });
  }
  const cv_file = await storage.savePrivate(req.file, cvInfo, 'cv');
  await knex('job_applications').insert({ ...data, cv_file, job_id: job.id, job_title: job.title, status: 'new' });
  flashSuccess(req, `job-${job.id}`);
  res.redirect(303, `/jobs/${encodeURIComponent(job.slug)}#apply`);
}));

// ================= تواصل معنا =================
const CONTACT_RULES = {
  name: { label: 'الاسم', required: true, max: 255 },
  email: { label: 'البريد الإلكتروني', type: 'email' },
  phone: { label: 'رقم الجوال', type: 'mobile' },
  subject: { label: 'الموضوع', max: 255 },
  message: { label: 'الرسالة', required: true, max: 5000 },
};

function renderContact(req, res, extra = {}) {
  res.locals.breadcrumbs = [{ label: res.locals.t('home'), href: '/' }, { label: res.locals.t('contact_us') }];
  res.locals.seo = seoFor(req, res, { title: res.locals.t('contact_us'), description: res.locals.s.contact_intro });
  res.render('pages/contact', { csrf: csrfToken(req), values: {}, errors: {}, success: false, ...extra });
}

router.get('/contact', (req, res) => renderContact(req, res, { success: takeFlash(req) === 'contact' }));
router.post('/contact', formLimiter, wrap(async (req, res) => {
  const g = guard(req);
  if (g === 'spam') { flashSuccess(req, 'contact'); return res.redirect(303, '/contact'); }
  if (g) return res.status(403).send(g);
  const { data, errors } = validate(req.body, CONTACT_RULES);
  if (!data.email && !data.phone && !errors.email && !errors.phone) errors.phone = 'يرجى إدخال البريد الإلكتروني أو رقم الجوال للتواصل';
  if (Object.keys(errors).length) {
    res.status(422);
    return renderContact(req, res, { values: req.body, errors });
  }
  await knex('contact_messages').insert({ ...data, status: 'new' });
  flashSuccess(req, 'contact');
  res.redirect(303, '/contact');
}));

module.exports = router;
module.exports.validate = validate;
