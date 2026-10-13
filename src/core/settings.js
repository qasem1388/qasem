'use strict';
/** خدمة إعدادات الموقع مع ذاكرة مؤقتة تُحدَّث عند كل تعديل */
const knex = require('../db/knex');
const { groups, defaults } = require('./settings-schema');

let cache = null;

async function getSettings() {
  if (cache) return cache;
  const rows = await knex('site_settings').select('key', 'value');
  const values = { ...defaults };
  for (const r of rows) {
    try { values[r.key] = JSON.parse(r.value); } catch { values[r.key] = r.value; }
  }
  cache = values;
  return values;
}

async function saveSettings(groupName, data) {
  await knex.transaction(async (trx) => {
    for (const [key, value] of Object.entries(data)) {
      const row = { key, value: JSON.stringify(value), group_name: groupName, updated_at: knex.fn.now() };
      await trx('site_settings').insert(row).onConflict('key').merge(['value', 'group_name', 'updated_at']);
    }
  });
  cache = null;
}

const clearSettingsCache = () => { cache = null; };

module.exports = { getSettings, saveSettings, clearSettingsCache, groups };
