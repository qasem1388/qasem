'use strict';
/** استخراج معرف فيديو YouTube من أي صيغة رابط شائعة */
function youtubeId(url) {
  if (!url) return null;
  const s = String(url).trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  let u;
  try { u = new URL(s); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtu.be') return valid(u.pathname.slice(1).split('/')[0]);
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.searchParams.get('v')) return valid(u.searchParams.get('v'));
    const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/);
    if (m) return m[1];
  }
  return null;
}
const valid = (id) => (/^[\w-]{11}$/.test(id || '') ? id : null);

module.exports = { youtubeId };
