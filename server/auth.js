const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('./config');
const db = require('./db');

const COOKIE = 'archive_session';
const SESSION_DAYS = 7;

function secret() {
  if (config.jwtSecret) return config.jwtSecret;
  let s = db.getSetting('jwt_secret');
  if (!s) {
    s = crypto.randomBytes(48).toString('hex');
    db.setSetting('jwt_secret', s);
  }
  return s;
}

function publicUser(u) {
  return { id: u.id, username: u.username, displayName: u.display_name, role: u.role, active: !!u.active };
}

function hashPassword(pw) {
  return bcrypt.hashSync(pw, 10);
}

function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) {
    throw Object.assign(new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل'), { status: 400 });
  }
}

// عند التشغيل الأول ينشئ حساب المدير. كلمة المرور تؤخذ من ADMIN_PASSWORD أو تُولَّد وتُطبع مرة واحدة
function ensureAdmin() {
  const d = db.get();
  if (d.prepare("SELECT 1 FROM users WHERE role = 'admin'").get()) return null;
  const password = config.admin.password || crypto.randomBytes(9).toString('base64url');
  d.prepare("INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, 'admin')").run(
    config.admin.username,
    'المدير',
    hashPassword(password),
  );
  if (!config.admin.password) {
    console.log(`\nتم إنشاء حساب المدير:\n  اسم المستخدم: ${config.admin.username}\n  كلمة المرور: ${password}\nغيّرها بعد أول دخول.\n`);
  }
  return password;
}

// حماية بسيطة من تخمين كلمات المرور: 10 محاولات فاشلة لكل اسم مستخدم/عنوان خلال 15 دقيقة
const attempts = new Map();
function tooManyAttempts(key) {
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((t) => now - t < 15 * 60_000);
  attempts.set(key, list);
  return list.length >= 10;
}

function login(req, res) {
  const { username, password } = req.body || {};
  const key = `${req.ip}|${String(username || '').toLowerCase()}`;
  if (tooManyAttempts(key)) return res.status(429).json({ error: 'محاولات كثيرة، حاول بعد 15 دقيقة' });
  const user = db.get().prepare('SELECT * FROM users WHERE username = ?').get(String(username || ''));
  if (!user || !user.active || !bcrypt.compareSync(String(password || ''), user.password_hash)) {
    attempts.get(key).push(Date.now());
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }
  attempts.delete(key);
  const token = jwt.sign({ uid: user.id }, secret(), { expiresIn: `${SESSION_DAYS}d` });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.production,
    maxAge: SESSION_DAYS * 86_400_000,
  });
  res.json({ user: publicUser(user) });
}

function logout(req, res) {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
}

function requireUser(req, res, next) {
  try {
    const { uid } = jwt.verify(req.cookies[COOKIE] || '', secret());
    const user = db.get().prepare('SELECT * FROM users WHERE id = ?').get(uid);
    if (!user || !user.active) throw new Error('inactive');
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'يجب تسجيل الدخول' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'هذه العملية للمدير فقط' });
  next();
}

module.exports = { login, logout, requireUser, requireAdmin, ensureAdmin, hashPassword, validatePassword, publicUser };
