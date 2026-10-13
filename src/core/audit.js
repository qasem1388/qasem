'use strict';
/** تسجيل العمليات المهمة في سجل العمليات (Audit Log) */
const knex = require('../db/knex');

async function audit(req, action, entity = null, entityId = null, details = null) {
  try {
    const user = req && req.user;
    await knex('audit_logs').insert({
      user_id: user ? user.id : null,
      user_name: user ? `${user.name} <${user.email}>` : (details && details.email) || null,
      action,
      entity,
      entity_id: entityId != null ? String(entityId) : null,
      details: details ? JSON.stringify(details).slice(0, 4000) : null,
      ip: req ? String(req.ip || '').slice(0, 64) : null,
      user_agent: req ? String(req.get('user-agent') || '').slice(0, 500) : null,
    });
  } catch (e) {
    console.error('[audit] فشل تسجيل العملية:', e.message);
  }
}

module.exports = { audit };
