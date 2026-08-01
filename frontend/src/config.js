/**
 * API Configuration — Dev: Express backend / Prod: Apps Script
 */

// ✅ Deployment ล่าสุด (v17) — แก้ path mapping + sameId + verifyTokenAPI แล้ว
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwAmryrKeQmMIVUbhw1TmQvBkYURYtGLFb4s5cmw4OQ7BPYwD2daOcCYgvHdS0IZyoOUA/exec';
const USE_DEV_BACKEND = false; // ✅ เปลี่ยนเป็น false เพื่อใช้ Apps Script
const EXPRESS_URL = 'http://localhost:5000';

function getToken() { return localStorage.getItem('token') || ''; }

/**
 * แปลง Express-style path (จาก frontend) → Apps Script route path + params
 * เพราะ Code.gs ตรวจ path เป็น 'login', 'patients', 'assessments', ...
 */
function normalizePath(path, params = {}) {
  const p = params;

  if (path === '/api/auth/login') return { route: 'login' };
  if (path === '/api/auth/me') return { route: 'me' };
  if (path === '/api/patients') return { route: 'patients' };

  // /api/assessments/:id
  let m = path.match(/^\/api\/assessments\/(.+)$/);
  if (m) return { route: 'assessments', params: { ...p, patientId: m[1] } };

  // /api/patients/:id/generate-token
  m = path.match(/^\/api\/patients\/(.+)\/generate-token$/);
  if (m) return { route: 'generate-token', params: { ...p, patientId: m[1] } };

  // /api/patients/:id/event-logs
  m = path.match(/^\/api\/patients\/(.+)\/event-logs$/);
  if (m) return { route: 'event-logs', params: { ...p, patientId: m[1] } };

  // /api/patients/:id/ai-summary
  m = path.match(/^\/api\/patients\/(.+)\/ai-summary$/);
  if (m) return { route: 'ai-summary', params: { ...p, patientId: m[1] } };

  // /api/patients/:id (DELETE)
  m = path.match(/^\/api\/patients\/(.+)$/);
  if (m) return { route: 'patients', params: { ...p, patientId: m[1] } };

  // Fallback: strip leading slash (e.g. 'verify-token')
  return { route: path.replace(/^\//, ''), params: p };
}

async function request(method, path, body = null, params = {}) {
  const isDev = USE_DEV_BACKEND;
  const token = getToken();

  if (isDev) {
    // ==== Dev: Express backend ====
    let url = EXPRESS_URL + path;
    const q = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
    if (q) url += '?' + q;
    const opts = { method, headers: {} };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const res = await fetch(url, opts);
    const txt = await res.text();
    try {
      const d = JSON.parse(txt);
      if (!res.ok) throw new Error(d.error || 'Request failed');
      return d;
    } catch (e) { throw new Error(txt || 'Request failed'); }
  }

  // ==== Prod: Google Apps Script ====
  const { route, params: ps } = normalizePath(path, params);
  let url = APPS_SCRIPT_URL + '?path=' + encodeURIComponent(route);

  // doGet ใช้ GET → auth ต้องส่งผ่าน query param `auth` (Code.gs: e.parameter.auth)
  // doDelete ก็อ่าน e.parameter.auth
  if ((method === 'GET' || method === 'DELETE')) {
    if (token) ps.auth = 'Bearer ' + token;
    Object.keys(ps).forEach(k => { url += '&' + k + '=' + encodeURIComponent(ps[k]); });
  }

  const opts = { method, headers: {} };
  const finalBody = { ...(body || {}) };

  if (method !== 'GET' && method !== 'DELETE') {
    // POST/PUT → Code.gs อ่าน body.auth (หรือ e.parameter.auth)
    if (token) finalBody.auth = 'Bearer ' + token;
    // เพิ่ม patientId จาก path เข้า body ด้วย (ถ้ายังไม่มี)
    Object.keys(ps).forEach(k => { if (!(k in finalBody)) finalBody[k] = ps[k]; });
    Object.keys(finalBody).forEach(k => { url += '&' + k + '=' + encodeURIComponent(String(finalBody[k])) });
    opts.headers['Content-Type'] = 'text/plain'; // Apps Script redirect → body ต้องไปถึง doPost
    opts.body = JSON.stringify(finalBody);
  }

  const res = await fetch(url, opts);
  const txt = await res.text();
  try {
    const d = JSON.parse(txt);
    if (!res.ok) throw new Error(d.error || 'Request failed');
    return d;
  } catch (e) { throw new Error(txt || 'Request failed'); }
}

export const apiGet = (path, params) => request('GET', path, null, params);
export const apiPost = (path, body) => request('POST', path, body);
export const apiPut = (path, body) => request('PUT', path, body);
export const apiDelete = (path, params) => request('DELETE', path, null, params);

/**
 * สร้างลิงก์ ESAS Form สำหรับคนไข้
 * ใช้ window.location.origin เพื่อให้ถูกต้องทั้ง dev (localhost) และ production (Vercel)
 */
export function getAssessmentLink(token) { return window.location.origin + '/assess/' + token; }

export async function apiPublicGet(path, params = {}) {
  const u = new URL(APPS_SCRIPT_URL); u.searchParams.set('path', path);
  Object.keys(params).forEach(k => u.searchParams.set(k, params[k]));
  const r = await fetch(u.toString()); const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Request failed'); return d;
}

export async function apiPublicPost(path, body = {}) {
  const u = new URL(APPS_SCRIPT_URL); u.searchParams.set('path', path);
  const r = await fetch(u.toString(), { method:'POST', headers:{'Content-Type':'text/plain'}, body:JSON.stringify(body) });
  const t = await r.text(); try{ const d=JSON.parse(t); if(!r.ok) throw new Error(d.error||'Request failed'); return d; }catch(e){ throw new Error(t||'Request failed'); }
}

export function getTtsUrl(text) { return APPS_SCRIPT_URL + '?path=tts&text=' + encodeURIComponent(text); }