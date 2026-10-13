// عميل API موحّد: يرسل رمز CSRF، ويعيد التوجيه لصفحة الدخول عند انتهاء الجلسة
let csrf = null;
export const setCsrf = (t) => { csrf = t; };

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors || null;
  }
}

export async function api(path, { method = 'GET', body, form, query } = {}) {
  let url = path.startsWith('/') ? path : `/api/admin/${path}`;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    const s = qs.toString();
    if (s) url += (url.includes('?') ? '&' : '?') + s;
  }
  const headers = { Accept: 'application/json' };
  if (method !== 'GET') headers['X-CSRF-Token'] = csrf || '';
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(url, { method, headers, body: payload, credentials: 'same-origin' });
  if (res.status === 401) {
    location.href = '/admin/login?next=' + encodeURIComponent(location.pathname + location.search);
    throw new ApiError('انتهت الجلسة', 401);
  }
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!res.ok) throw new ApiError((data && data.error) || 'حدث خطأ غير متوقع', res.status, data && data.errors);
  return data;
}

/** رفع ملفات مع إظهار نسبة التقدم */
export function upload(files, { kind, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/media' + (kind ? `?kind=${kind}` : ''));
    xhr.setRequestHeader('X-CSRF-Token', csrf || '');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data.items);
      else reject(new ApiError((data && data.error) || 'فشل رفع الملف', xhr.status));
    };
    xhr.onerror = () => reject(new ApiError('تعذر الاتصال بالخادم', 0));
    xhr.send(fd);
  });
}
