'use strict';
/** حماية CSRF: رمز مرتبط بالجلسة يُرسل مع كل طلب يغير البيانات */
const crypto = require('crypto');

function csrfToken(req) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  return req.session.csrfToken;
}

function tokenValid(req) {
  const expected = req.session && req.session.csrfToken;
  const got = req.get('x-csrf-token') || (req.body && req.body._csrf);
  if (!expected || typeof got !== 'string' || got.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

function verifyCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (tokenValid(req)) return next();
  const msg = 'انتهت صلاحية الجلسة أو الطلب غير صالح، يرجى تحديث الصفحة والمحاولة مرة أخرى';
  if (req.accepts(['json', 'html']) === 'json' || req.path.startsWith('/api/')) return res.status(403).json({ error: msg });
  return res.status(403).send(msg);
}

module.exports = { csrfToken, verifyCsrf, tokenValid };
