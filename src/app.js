'use strict';
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');
const config = require('./config');
const { KnexSessionStore } = require('./core/session-store');
const { HttpError } = require('./core/http-error');
const { loadUser, requireAuthPage } = require('./middleware/auth');
const adminApi = require('./routes/admin');
const publicRoutes = require('./routes/public');

const ROOT = config.root;
const nm = (p) => path.join(ROOT, 'node_modules', p);

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
        'frame-src': ["'self'", 'https://www.youtube.com', 'https://www.youtube-nocookie.com', 'https://www.google.com', 'https://maps.google.com'],
        'connect-src': ["'self'"],
        'object-src': ["'none'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'self'"],
        'upgrade-insecure-requests': config.isProd ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));
  app.use(compression());

  // ===== الملفات الثابتة =====
  const staticOpts = { maxAge: config.isProd ? '7d' : 0, index: false };
  app.use('/uploads', express.static(config.uploads.publicDir, {
    ...staticOpts,
    dotfiles: 'deny',
    setHeaders(res) { res.setHeader('X-Content-Type-Options', 'nosniff'); },
  }));
  app.use('/assets', express.static(path.join(ROOT, 'public'), staticOpts));
  app.use('/admin-assets', express.static(path.join(ROOT, 'admin'), { ...staticOpts, maxAge: 0 }));
  app.use('/vendor/tinymce', express.static(nm('tinymce'), staticOpts));
  app.use('/vendor/tinymce-langs', express.static(nm('tinymce-i18n/langs8'), staticOpts));
  app.use('/vendor/sortable', express.static(nm('sortablejs'), staticOpts));
  app.use('/vendor/fontawesome/css', express.static(nm('@fortawesome/fontawesome-free/css'), staticOpts));
  app.use('/vendor/fontawesome/webfonts', express.static(nm('@fortawesome/fontawesome-free/webfonts'), staticOpts));

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  // ===== الجلسات =====
  const ttlMs = config.sessionMaxAgeHours * 3600 * 1000;
  app.use(session({
    name: 'ngo.sid',
    secret: config.sessionSecret,
    store: new KnexSessionStore({ ttlMs }),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { httpOnly: true, sameSite: 'lax', secure: config.isProd ? 'auto' : false, maxAge: ttlMs },
  }));
  app.use(loadUser);

  // ===== واجهات API =====
  app.use('/api', adminApi);
  app.use('/api', (req, res) => res.status(404).json({ error: 'المسار غير موجود' }));

  // ===== صفحات لوحة التحكم (تطبيق صفحة واحدة) =====
  const adminHtml = path.join(ROOT, 'admin', 'index.html');
  const noStore = (res) => res.setHeader('Cache-Control', 'no-store');
  app.get('/admin/login', (req, res) => {
    if (req.user) return res.redirect('/admin/dashboard');
    noStore(res);
    res.sendFile(path.join(ROOT, 'admin', 'login.html'));
  });
  app.get('/admin', (req, res) => res.redirect(req.user ? '/admin/dashboard' : '/admin/login'));
  app.get('/admin/*splat', requireAuthPage, (req, res) => { noStore(res); res.sendFile(adminHtml); });

  // ===== الموقع العام =====
  app.use(publicRoutes);

  // ===== معالجة الأخطاء =====
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err instanceof HttpError ? err.status : err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    const message = status >= 500 ? 'حدث خطأ غير متوقع في الخادم' : err.message;
    if (req.path.startsWith('/api/') || req.xhr || (req.get('accept') || '').includes('application/json')) {
      return res.status(status).json({ error: message, errors: err.details });
    }
    res.status(status);
    publicRoutes.renderError(req, res, status, message);
  });

  return app;
}

module.exports = { createApp };
