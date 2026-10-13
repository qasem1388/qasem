'use strict';
/** مخزن جلسات في قاعدة البيانات (يعمل مع SQLite و PostgreSQL) */
const session = require('express-session');
const knex = require('../db/knex');

class KnexSessionStore extends session.Store {
  constructor({ ttlMs }) {
    super();
    this.ttlMs = ttlMs;
    this.timer = setInterval(() => this.prune(), 15 * 60 * 1000);
    this.timer.unref();
  }
  expiry(sess) {
    const exp = sess && sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : 0;
    return exp || Date.now() + this.ttlMs;
  }
  get(sid, cb) {
    knex('sessions').where({ sid }).first()
      .then((row) => {
        if (!row || Number(row.expires_at) < Date.now()) return cb(null, null);
        cb(null, JSON.parse(row.sess));
      })
      .catch(cb);
  }
  set(sid, sess, cb) {
    const row = { sid, sess: JSON.stringify(sess), expires_at: this.expiry(sess) };
    knex('sessions').insert(row).onConflict('sid').merge(['sess', 'expires_at'])
      .then(() => cb && cb()).catch((e) => cb && cb(e));
  }
  touch(sid, sess, cb) {
    knex('sessions').where({ sid }).update({ expires_at: this.expiry(sess) })
      .then(() => cb && cb()).catch((e) => cb && cb(e));
  }
  destroy(sid, cb) {
    knex('sessions').where({ sid }).del().then(() => cb && cb()).catch((e) => cb && cb(e));
  }
  /** إنهاء جميع جلسات مستخدم (عند تعطيله أو تغيير كلمة مروره) */
  async destroyUserSessions(userId) {
    const rows = await knex('sessions').select('sid', 'sess');
    const ids = rows.filter((r) => { try { return JSON.parse(r.sess).userId === userId; } catch { return false; } }).map((r) => r.sid);
    if (ids.length) await knex('sessions').whereIn('sid', ids).del();
  }
  prune() {
    knex('sessions').where('expires_at', '<', Date.now()).del().catch(() => {});
  }
}

module.exports = { KnexSessionStore };
