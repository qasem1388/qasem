// حالة التطبيق المشتركة + ذاكرة مؤقتة لخيارات حقول العلاقات
import { api } from './api.js';

export const state = { meta: null };
const optionsCache = new Map();

export function relationOptions(resource, { fresh = false } = {}) {
  if (fresh) optionsCache.delete(resource);
  if (!optionsCache.has(resource)) {
    optionsCache.set(resource, api(`r/${resource}/options`).catch((e) => { optionsCache.delete(resource); throw e; }));
  }
  return optionsCache.get(resource);
}
export const invalidateOptions = (resource) => optionsCache.delete(resource);

export const can = (perm) => state.meta && (state.meta.permissions.includes('*') || state.meta.permissions.includes(perm) || (perm.endsWith('.view') && state.meta.permissions.includes(perm.replace('.view', '.manage'))));
