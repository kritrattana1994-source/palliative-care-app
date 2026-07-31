/**
 * API Configuration — Dev: Express backend / Prod: Apps Script
 */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxHJUmh_et7Ap948HYfuJsMUdThQfCk98cVna9dEk_1dDSCY86J8y3w51gETzyb06hGMA/exec';
const USE_DEV_BACKEND = false; // ✅ เปลี่ยนเป็น false เพื่อใช้ Apps Script
const EXPRESS_URL = 'http://localhost:5000';

function getToken() { return localStorage.getItem('token') || ''; }

async function request(method, path, body = null, params = {}) {
  const base = USE_DEV_BACKEND ? EXPRESS_URL : APPS_SCRIPT_URL;
  const isDev = USE_DEV_BACKEND;

  let url;
  if (isDev) {
    url = base + path;
    const q = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
    if (q) url += '?' + q;
  } else {
    const p = path.replace(/^\//, '').replace(/\//g, '-');
    url = base + '?path=' + p;
    Object.keys(params).forEach(k => { url += '&' + k + '=' + encodeURIComponent(params[k]); });
  }

  const opts = { method, headers: {} };
  const t = getToken();
  if (t) opts.headers['Authorization'] = 'Bearer ' + t;

  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    if (!isDev) body.auth = t ? 'Bearer ' + t : '';
    opts.body = JSON.stringify(body);
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
 * ใช้ window.location.origin เพื่อให้ถูกต้องทั้ง dev (localhost) และ production (GridHub)
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
  const r = await fetch(u.toString(), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
  const t = await r.text(); try{ const d=JSON.parse(t); if(!r.ok) throw new Error(d.error||'Request failed'); return d; }catch(e){ throw new Error(t||'Request failed'); }
}

export function getTtsUrl(text) { return APPS_SCRIPT_URL + '?path=tts&text=' + encodeURIComponent(text); }