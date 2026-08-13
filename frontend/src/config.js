/**
 * API Configuration — Dev: Express backend / Prod: Apps Script
 */

import { auth } from './services/firebase';

const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || 'https://asia-southeast1-palliative-care-app-9d6cf.cloudfunctions.net/api';

/**
 * Normalizes paths if necessary, but with Firebase Functions we can just use standard paths.
 */
function normalizePath(path, params = {}) {
  const p = params || {};

  if (path === '/api/auth/login') return { route: 'login', params: { ...p } };
  if (path === '/api/auth/me') return { route: 'me', params: { ...p } };
  if (path === '/api/patients') return { route: 'patients', params: { ...p } };

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

  // /api/staff/:id (DELETE / PUT by id)
  m = path.match(/^\/api\/staff\/(.+)$/);
  if (m) return { route: 'staff', params: { ...p, staffId: m[1] } };

  // /api/staff (GET / POST)
  if (path === '/api/staff') return { route: 'staff', params: { ...p } };

  // Fallback: strip leading slash (e.g. 'verify-token')
  return { route: path.replace(/^\//, ''), params: p };
}

async function request(method, path, body = null, params = {}) {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  let url = FUNCTIONS_URL + path;
  
  if (Object.keys(params).length > 0) {
      const q = new URLSearchParams(params).toString();
      url += '?' + q;
  }

  const opts = { 
      method, 
      headers: {
          'Content-Type': 'application/json'
      } 
  };
  
  if (token) {
      opts.headers['Authorization'] = 'Bearer ' + token;
  }
  
  if (body && (method !== 'GET' && method !== 'DELETE')) {
      opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  const txt = await res.text();
  let d;
  try {
    d = JSON.parse(txt);
  } catch (e) {
    throw new Error(txt || 'Request failed');
  }

  if (!res.ok || (d && d.error)) {
    const errMsg = (d && d.error) || 'Request failed';
    throw new Error(errMsg);
  }
  return d;
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
  return request('GET', path, null, params);
}

export async function apiPublicPost(path, body = {}) {
  return request('POST', path, body);
}

export function getTtsUrl(text) { return FUNCTIONS_URL + '/api/tts?text=' + encodeURIComponent(text); }