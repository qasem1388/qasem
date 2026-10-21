# دليل النشر والاستضافة

يشرح هذا الدليل نشر الموقع على خادم خاص (VPS) بطريقتين:

| الطريقة | متى تختارها |
|---|---|
| **أ) Docker Compose** (موصى بها) | أسرع إعداد، كل شيء معزول في حاويات، والترقية بأمر واحد. |
| **ب) تثبيت مباشر** (Node.js + PostgreSQL + systemd) | إن كان الخادم مشتركًا مع تطبيقات أخرى أو تفضّل الإدارة التقليدية. |

> لا يُنصح بالاستضافة المشتركة (Shared Hosting): الموقع يحتاج Node.js يعمل باستمرار وقاعدة PostgreSQL ومجلد دائم للملفات المرفوعة.

---

## المتطلبات

- خادم Ubuntu 22.04/24.04 (أو Debian 12) — **2 أنوية و2 جيجابايت ذاكرة كحد أدنى** (4 جيجابايت مريحة للبناء).
- نطاق (Domain) يشير سجله `A` (و`AAAA` إن توفر IPv6) إلى عنوان الخادم.
- منفذا 80 و443 مفتوحان.
- حساب بريد SMTP لإرسال الإشعارات (اختياري لكنه موصى به).

### تأمين الخادم أولًا

```bash
sudo apt update && sudo apt upgrade -y
sudo adduser riyada && sudo usermod -aG sudo riyada      # مستخدم إداري بدل root
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
sudo apt install -y unattended-upgrades                  # تحديثات الأمان التلقائية
```

- عطّل الدخول بكلمة المرور إلى SSH واعتمد المفاتيح (`PasswordAuthentication no` في `/etc/ssh/sshd_config`).
- **لا تفتح منفذ PostgreSQL (5432) للإنترنت.**

---

## أ) النشر عبر Docker Compose

### 1. التثبيت

```bash
# Docker الرسمي
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker

# الكود
sudo mkdir -p /var/www/riyada && sudo chown $USER /var/www/riyada
git clone <رابط-المستودع> /var/www/riyada && cd /var/www/riyada
cp .env.example .env
```

### 2. الإعداد

عدّل `.env`:

| المتغير | القيمة |
|---|---|
| `SITE_URL` | `https://example.sa` |
| `POSTGRES_PASSWORD` | ناتج `openssl rand -hex 24` |
| `TRUSTED_PROXY_HOPS` | `1` خلف Nginx، و`2` إن كان Cloudflare أمام Nginx |
| `SMTP_*` | بيانات مزود البريد (انظر README ← إعداد البريد) |

> في Docker يُبنى `DATABASE_URL` تلقائيًا من `POSTGRES_*`، فلا تعدّله.

### 3. التشغيل لأول مرة

```bash
docker compose up -d --build                      # قاعدة البيانات + الترحيلات + الموقع
docker compose ps                                 # app يجب أن يكون (healthy)

# البيانات الأولية (مرة واحدة فقط): الإعدادات والمحتوى التجريبي الذي تعدّله لاحقًا من اللوحة
docker compose run --rm tools npx prisma db seed

# حساب المدير الأول — تُطلب كلمة المرور بشكل مخفي
docker compose run --rm tools npm run admin:create -- --email you@company.sa --name "اسمك"
```

يعمل الموقع الآن على `http://127.0.0.1:3000` (محليًا فقط). أكمل بخطوة **Nginx وHTTPS** أدناه.

### 4. ما الذي يحدث داخل Compose؟

| الخدمة | الوظيفة |
|---|---|
| `db` | PostgreSQL 16، بياناته في وحدة التخزين `pgdata`. |
| `migrate` | يطبّق ترحيلات قاعدة البيانات ثم يتوقف؛ لا يبدأ الموقع إلا بعد نجاحه. |
| `app` | الموقع (صورة صغيرة بمستخدم غير root، مع فحص صحة `/api/health`). الملفات المرفوعة في وحدة التخزين `uploads`. |
| `tools` | أدوات سطر الأوامر (المدير، البيانات الأولية) — يعمل عند الطلب فقط. |

> صورة Docker لا تحتاج قاعدة البيانات أثناء البناء: تُبنى الصفحات مع أول زيارة ثم تُحفظ، وتُحدَّث تلقائيًا عند أي تعديل من اللوحة.

### 5. الترقية إلى إصدار جديد

```bash
cd /var/www/riyada
BACKUP_MODE=docker scripts/backup.sh   # خذ نسخة قبل أي ترقية
git pull
docker compose up -d --build   # يعيد البناء ويطبّق الترحيلات الجديدة تلقائيًا
docker image prune -f
```

---

## ب) التثبيت المباشر (بدون Docker)

### 1. البرامج

```bash
# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs postgresql nginx certbot python3-certbot-nginx
```

### 2. قاعدة البيانات

```bash
sudo -u postgres psql <<'SQL'
CREATE USER riyada WITH PASSWORD 'ضع-كلمة-مرور-قوية';
CREATE DATABASE riyada OWNER riyada;
SQL
```

### 3. الكود والبناء

```bash
sudo adduser --system --group --home /var/www/riyada riyada
sudo -u riyada git clone <رابط-المستودع> /var/www/riyada
cd /var/www/riyada
sudo -u riyada cp .env.example .env && sudo -u riyada nano .env   # SITE_URL، DATABASE_URL، SMTP...
sudo -u riyada npm ci
sudo -u riyada npm run db:migrate
sudo -u riyada npm run db:seed                 # مرة واحدة فقط
sudo -u riyada npm run build
sudo -u riyada npm run admin:create -- --email you@company.sa --name "اسمك"
sudo chmod 600 .env
```

### 4. التشغيل كخدمة دائمة

```bash
sudo cp deploy/riyada.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now riyada
sudo systemctl status riyada        # السجلات: journalctl -u riyada -f
```

### 5. الترقية

```bash
cd /var/www/riyada
sudo -u riyada scripts/backup.sh
sudo -u riyada git pull
sudo -u riyada npm ci
sudo -u riyada npm run db:migrate
sudo -u riyada npm run build
sudo systemctl restart riyada
```

---

## Nginx وشهادة HTTPS (للطريقتين)

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/riyada
sudo sed -i 's/example.sa/نطاقك.sa/g' /etc/nginx/sites-available/riyada
sudo ln -s /etc/nginx/sites-available/riyada /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

قبل الحصول على الشهادة علّق مؤقتًا كتلتي `listen 443`، أو احصل عليها أولًا بالأمر:

```bash
sudo certbot certonly --nginx -d نطاقك.sa -d www.نطاقك.sa
sudo nginx -t && sudo systemctl reload nginx
```

يجدد Certbot الشهادة تلقائيًا. تحقق: `sudo certbot renew --dry-run`.

ملف `deploy/nginx.conf` يتضمن:
- تحويل HTTP وwww إلى `https://النطاق`.
- حد رفع 10 ميجابايت (أكبر مرفق في النماذج 8 ميجابايت).
- تمرير IP الزائر الحقيقي (`X-Forwarded-For`) لتحديد المعدل وسجل العمليات.
- تخزين ملفات `/_next/static` سنة كاملة (أسماؤها تتغير مع كل إصدار).

### عند استخدام Cloudflare

- اضبط SSL على **Full (strict)**.
- اجعل `TRUSTED_PROXY_HOPS=2`، واستبدل `$remote_addr` في Nginx بـ `$http_cf_connecting_ip` أو فعّل وحدة `real_ip` بنطاقات Cloudflare.
- لا تفعّل «Cache Everything» على `/admin`.

---

## بعد النشر مباشرة

1. افتح `https://نطاقك.sa/api/health` ← يجب أن يعرض `{"status":"ok"}`.
2. ادخل إلى `/admin` بحساب المدير، ثم:
   - **الهوية البصرية**: الشعار والألوان والخط.
   - **بيانات الشركة**: السجل التجاري والرقم الضريبي والتواصل.
   - استبدل المحتوى التجريبي، ثم أطفئ **وضع العرض التجريبي** من «الإعدادات العامة».
   - **الإشعارات والبريد**: أرسل رسالة اختبار وحدد المستلمين.
3. سجّل الموقع في Google Search Console وأضف `https://نطاقك.sa/sitemap.xml`.
4. فعّل النسخ الاحتياطي اليومي (انظر [BACKUP.md](BACKUP.md)).
5. راجع [قائمة الفحص النهائية](CHECKLIST.md).

---

## المراقبة والسجلات

| ماذا | أين |
|---|---|
| صحة الموقع وقاعدة البيانات | `GET /api/health` (200 أو 503) — اربطه بخدمة مراقبة مثل UptimeRobot |
| سجلات الموقع | `docker compose logs -f app` أو `journalctl -u riyada -f` |
| عمليات المستخدمين | لوحة التحكم ← سجل العمليات |
| رسائل البريد المرسلة والفاشلة | لوحة التحكم ← الإشعارات والبريد |

رسائل الخطأ في الموقع لا تكشف التفاصيل للزائر، بل تعرض «رمز خطأ» يقابله السطر نفسه في سجلات الخادم.

---

## التوسع لأكثر من خادم (اختياري)

الإعداد الافتراضي (خادم واحد) يكفي لمعظم مواقع الشركات. عند تشغيل عدة نسخ خلف موازن أحمال:

- **تحديد المعدل** مشترك تلقائيًا عبر PostgreSQL.
- اضبط `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` بالقيمة نفسها في كل النسخ.
- الملفات المرفوعة: اجعل `STORAGE_DIR` على تخزين مشترك (NFS)، أو أضف مشغل تخزين سحابي (S3/R2) في `src/server/storage`.
- ذاكرة الصفحات محلية لكل نسخة: راجع دليل Next.js «Self-Hosting ← Multi-Instance Cache Coordination».

---

## حل المشكلات الشائعة

| العَرَض | السبب والحل |
|---|---|
| الصفحات تعرض خطأ و`Missing "site" settings` في السجلات | لم تُشغَّل البيانات الأولية: `npx prisma db seed` (أو عبر `tools` في Docker). |
| الأمر `db seed` يرفض التشغيل | قاعدة البيانات فيها محتوى بالفعل، والأمر يستبدله كله. استخدم `-- --force` فقط إن كنت تريد ذلك فعلًا. |
| تعديل مباشر في قاعدة البيانات لا يظهر في الموقع | لوحة التحكم ← الإعدادات العامة ← «تحديث صفحات الموقع». |
| «تم تجاوز عدد المحاولات» لكل الزوار | تأكد من `TRUSTED_PROXY_HOPS` ومن أن Nginx يرسل `X-Forwarded-For`. |
| رفع الملفات يفشل بخطأ 413 | ارفع `client_max_body_size` في Nginx. |
| البريد لا يصل | لوحة التحكم ← الإشعارات والبريد ← رسالة اختبار، ثم راجع سجل البريد وسجلات SPF/DKIM. |
