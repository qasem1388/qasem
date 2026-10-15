// ملف التشغيل لاستضافة cPanel (Namecheap → Setup Node.js App → Application startup file: app.js)
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
process.chdir(root);

// تحميل المتغيرات من ملف .env بجانب هذا الملف (متغيرات لوحة cPanel لها الأولوية)
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

process.env.NODE_ENV = "production";
process.env.DATABASE_URL ||= `file:${path.join(root, "data", "store.db")}`;
process.env.UPLOAD_DIR ||= path.join(root, "storage", "uploads");
process.env.HOSTNAME ||= "0.0.0.0";

require("./server.js");
