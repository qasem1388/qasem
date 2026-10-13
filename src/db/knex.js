'use strict';
const fs = require('fs');
const path = require('path');
const knexLib = require('knex');
const config = require('../config');

function buildConfig() {
  const common = {
    migrations: { directory: path.join(__dirname, 'migrations'), tableName: 'knex_migrations' },
  };
  if (config.db.url) {
    return {
      ...common,
      client: 'pg',
      connection: {
        connectionString: config.db.url,
        ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
      },
      pool: { min: 0, max: 10 },
    };
  }
  fs.mkdirSync(path.dirname(config.db.sqliteFile), { recursive: true });
  return {
    ...common,
    client: 'better-sqlite3',
    connection: { filename: config.db.sqliteFile },
    useNullAsDefault: true,
    pool: {
      afterCreate(conn, done) {
        conn.pragma('foreign_keys = ON');
        conn.pragma('journal_mode = WAL');
        done();
      },
    },
  };
}

const knex = knexLib(buildConfig());
knex.isPg = !!config.db.url;
/** عامل البحث غير الحساس لحالة الأحرف حسب نوع قاعدة البيانات */
knex.likeOp = knex.isPg ? 'ilike' : 'like';

module.exports = knex;
