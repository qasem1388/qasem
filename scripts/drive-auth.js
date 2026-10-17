// يحصل على GOOGLE_REFRESH_TOKEN مرة واحدة حتى يستطيع الخادم الحفظ في Google Drive الخاص بك.
// الاستخدام: GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... npm run drive:auth

const http = require('node:http');
const { auth } = require('@googleapis/drive');

const { GOOGLE_CLIENT_ID: id, GOOGLE_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) {
  console.error('ضع GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET أولاً (راجع README).');
  process.exit(1);
}

const PORT = 53682;
const redirect = `http://127.0.0.1:${PORT}`;
const client = new auth.OAuth2(id, secret, redirect);
const url = client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  // صلاحية محدودة: التطبيق يرى فقط الملفات التي أنشأها بنفسه في Drive
  scope: ['https://www.googleapis.com/auth/drive.file'],
});

const server = http.createServer(async (req, res) => {
  const code = new URL(req.url, redirect).searchParams.get('code');
  if (!code) return res.end();
  try {
    const { tokens } = await client.getToken(code);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<p dir="rtl">تم. يمكنك إغلاق هذه الصفحة والرجوع إلى الطرفية.</p>');
    console.log(`\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  } catch (err) {
    res.end('فشل: ' + err.message);
    console.error(err.message);
  }
  server.close();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('افتح هذا الرابط في المتصفح وسجّل الدخول بحساب Google الذي سيُحفظ فيه الأرشيف:\n');
  console.log(url);
});
