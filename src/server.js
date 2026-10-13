'use strict';
const config = require('./config');
const knex = require('./db/knex');
const { createApp } = require('./app');
const { ensureBaseData } = require('./db/bootstrap');

async function main() {
  await knex.migrate.latest();
  await ensureBaseData();
  const app = createApp();
  app.listen(config.port, config.host, () => {
    console.log(`[server] يعمل على http://localhost:${config.port} (${knex.isPg ? 'PostgreSQL' : 'SQLite'})`);
    console.log('[server] لوحة التحكم: /admin');
  });
}

main().catch((e) => {
  console.error('[server] فشل التشغيل:', e);
  process.exit(1);
});
