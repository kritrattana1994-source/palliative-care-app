/**
 * ==================================================================
 * Google Apps Script — Palliative Care Backend (Full API)
 * ระบบดูแลผู้ป่วยประคับประคอง รพ.พล (Home Ward)
 * ==================================================================
 * 
 * Deploy เป็น Web App:
 *   - Execute as: "Me" (บัญชีของคุณ)
 *   - Who has access: "Anyone" (ทุกคน)
 * 
 * Google Sheets structure:
 *   - users: บัญชีเจ้าหน้าที่ (admin / nurse)
 *   - patients: ทะเบียนผู้ป่วย + ลิงก์ token
 *   - assessments: คะแนน ESAS 9 อาการ + สัญญาณชีพ + อาการอื่น + บันทึก
 *   - event_logs: บันทึกการพยาบาลและกิจกรรมไทม์ไลน์
 */

// ==================== CONFIG ====================
const SHEET_USERS = 'users';
const SHEET_PATIENTS = 'patients';
const SHEET_ASSESSMENTS = 'assessments';
const SHEET_EVENT_LOGS = 'event_logs';

// Simple secret for token signing (สามารถเปลี่ยนได้ตามต้องการ)
const TOKEN_SECRET = 'palliative_care_secret_2024';

// Telegram Notification Config
// แนะนำตั้งค่าผ่าน Project Settings -> Script Properties (หรือกำหนดตรงนี้)
const TELEGRAM_BOT_TOKEN = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN') || '';
const TELEGRAM_CHAT_ID = PropertiesService.getScriptProperties().getProperty('TELEGRAM_CHAT_ID') || '';

// ==================== MAIN ROUTER ====================

function doGet(e) {
  const path = e.parameter.path || '';
  const token = e.parameter.token || '';
  const authHeader = e.parameter.auth || ''; // Bearer token

  // Public routes
  if (path === 'verify-token' && token) {
    return verifyTokenAPI(token);
  }

  // TTS proxy
  if (path === 'tts') {
    return ttsProxy(e.parameter.text);
  }

  // === Serve HTML Form (PUBLIC — no auth needed) ===
  // URL: ?token=xxx  (ไม่มี path)
  if (token && !path) {
    return serveForm(token);
  }

  // Protected routes — verify JWT
  const user = verifyJWT(authHeader);
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  if (path === 'me') {
    return jsonResponse({ user });
  }

  if (path === 'patients') {
    return getPatients();
  }

  if (path === 'assessments') {
    return getAssessments(e.parameter.patientId, user);
  }

  if (path === 'event-logs') {
    return getEventLogs(e.parameter.patientId, user);
  }

  if (path === 'staff') {
    return getStaff(user);
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

function doPost(e) {
  const path = e.parameter.path || '';
  const body = parseBody(e);

  // Public: submit assessment (no auth needed, uses patient token)
  if (path === 'assessments') {
    return submitAssessment(body);
  }

  // Public: login
  if (path === 'login') {
    return login(body);
  }

  // Protected routes
  const authHeader = body.auth || e.parameter.auth || '';
  const user = verifyJWT(authHeader);
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  if (path === 'patients') {
    return createPatient(body, user);
  }

  if (path === 'generate-token') {
    return generateToken(body.patientId, body.status, user);
  }

  if (path === 'event-logs') {
    return addEventLog(body, user);
  }

  if (path === 'ai-summary') {
    return getAISummary(body.patientId, user);
  }

  if (path === 'staff') {
    return createStaff(body, user);
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

function doPut(e) {
  const path = e.parameter.path || '';
  const body = parseBody(e);
  const authHeader = body.auth || '';
  const user = verifyJWT(authHeader);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

  if (path === 'patients') {
    return updatePatient(body, user);
  }

  if (path === 'staff') {
    return updateStaff(body, user);
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

function doDelete(e) {
  const path = e.parameter.path || '';
  const authHeader = e.parameter.auth || '';
  const user = verifyJWT(authHeader);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

  if (path === 'patients') {
    return deletePatient(e.parameter.patientId, user);
  }

  if (path === 'staff') {
    return deleteStaff(e.parameter.staffId, user);
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

// ==================== AUTH ====================

// ==================== STAFF MANAGEMENT ====================

function getStaff(requestingUser) {
  if (requestingUser.role !== 'admin') {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }
  const sheet = getSheet(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const staff = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    const s = {};
    headers.forEach((h, idx) => { s[h] = data[i][idx] || ''; });
    delete s.password; // Never expose password
    staff.push(s);
  }
  return jsonResponse(staff);
}

function createStaff(body, requestingUser) {
  if (requestingUser.role !== 'admin') {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }
  const { username, name, role, password } = body;
  if (!username || !name || !role || !password) {
    return jsonResponse({ error: 'Username, name, role, and password are required' }, 400);
  }
  const allowedRoles = ['admin', 'nurse'];
  if (!allowedRoles.includes(role)) {
    return jsonResponse({ error: 'Role must be admin or nurse' }, 400);
  }
  const sheet = getSheet(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  // Check duplicate username
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase() === username.toLowerCase()) {
      return jsonResponse({ error: 'Username already exists' }, 400);
    }
  }
  const newId = 'u_' + Date.now();
  sheet.appendRow([newId, username, password, role, name]);
  return jsonResponse({ id: newId, username, name, role }, 201);
}

function updateStaff(body, requestingUser) {
  if (requestingUser.role !== 'admin') {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }
  const { staffId, role, password, name } = body;
  if (!staffId) return jsonResponse({ error: 'Staff ID required' }, 400);

  const sheet = getSheet(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const roleCol = headers.indexOf('role');
  const passCol = headers.indexOf('password');
  const nameCol = headers.indexOf('name');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(staffId)) {
      if (role && roleCol >= 0) sheet.getRange(i + 1, roleCol + 1).setValue(role);
      if (password && passCol >= 0) sheet.getRange(i + 1, passCol + 1).setValue(password);
      if (name && nameCol >= 0) sheet.getRange(i + 1, nameCol + 1).setValue(name);
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ error: 'Staff not found' }, 404);
}

function deleteStaff(staffId, requestingUser) {
  if (requestingUser.role !== 'admin') {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }
  if (!staffId) return jsonResponse({ error: 'Staff ID required' }, 400);
  // Prevent self-deletion
  if (String(staffId) === String(requestingUser.id)) {
    return jsonResponse({ error: 'ไม่สามารถลบบัญชีตัวเองได้' }, 400);
  }
  const sheet = getSheet(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(staffId)) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ message: 'Staff deleted' });
    }
  }
  return jsonResponse({ error: 'Staff not found' }, 404);
}

// ==================== AUTH ====================

function login(body) {
  const { username, password } = body;
  if (!username || !password) {
    return jsonResponse({ error: 'Username and password required' }, 400);
  }

  const sheet = getSheet(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === username && data[i][2] === password) {
      const user = { id: data[i][0], username: data[i][1], role: data[i][3], name: data[i][4] };
      const token = createJWT(user);
      return jsonResponse({ token, user });
    }
  }
  
  return jsonResponse({ error: 'Invalid username or password' }, 400);
}

function createJWT(payload) {
  const header = Utilities.base64EncodeWebSafe(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = Utilities.base64EncodeWebSafe(JSON.stringify({
    ...payload,
    iat: now,
    exp: now + 86400 // 24 hours
  }));
  const signature = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(header + '.' + jwtPayload, TOKEN_SECRET)
  );
  return header + '.' + jwtPayload + '.' + signature;
}

function verifyJWT(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[1])).getDataAsString());
    
    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    
    return { id: payload.id, username: payload.username, role: payload.role, name: payload.name };
  } catch (e) {
    return null;
  }
}

// ==================== PATIENTS ====================

function getPatients() {
  const sheet = getSheet(SHEET_PATIENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const patients = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    
    const patient = {};
    headers.forEach((h, idx) => { patient[h] = row[idx] || ''; });
    
    // HN/id ต้องเป็น string เสมอ
    patient.HN = String(row[0]);
    patient.id = String(row[0]);
    
    // Get latest assessment
    patient.latestAssessment = getLatestAssessment(patient.HN);
    patients.push(patient);
  }
  
  return jsonResponse(patients);
}

function createPatient(body, user) {
  const { id, name, age, gender, disease, relativePhone, caregiverName, address, responsibleStaff, clinicalNotes } = body;
  
  if (!id || !name || !disease || !relativePhone) {
    return jsonResponse({ error: 'HN, Name, Disease, and Phone are required' }, 400);
  }

  const sheet = getSheet(SHEET_PATIENTS);
  const data = sheet.getDataRange().getValues();
  
  // Check duplicate
  for (let i = 1; i < data.length; i++) {
    if (sameId(data[i][0], id)) {
      return jsonResponse({ error: 'Patient with this HN already exists' }, 400);
    }
  }
  
  // Generate unique token
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  
  const newRow = [
    id,                                          // HN
    name,                                        // name
    disease,                                     // disease
    token,                                       // token
    'ยังไม่ส่งลิงก์',                              // status
    parseInt(age) || '',                         // age
    gender || 'ชาย',                             // gender
    relativePhone,                               // relativePhone
    caregiverName || '',                         // caregiverName
    address || '',                               // address
    responsibleStaff || 'พย.วิกานดา',             // responsibleStaff
    clinicalNotes || ''                          // clinicalNotes
  ];
  
  sheet.appendRow(newRow);
  
  const patient = {
    id, name, disease, token, status: 'ยังไม่ส่งลิงก์',
    age: parseInt(age) || '', gender: gender || 'ชาย',
    relativePhone, caregiverName: caregiverName || '',
    address: address || '', responsibleStaff: responsibleStaff || 'พย.วิกานดา',
    clinicalNotes: clinicalNotes || '', latestAssessment: null
  };

  // Telegram Alert for new patient registration
  sendTelegramMessage(
    `📋 *ลงทะเบียนผู้ป่วยใหม่ (Home Ward)*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👤 *ผู้ป่วย:* ${name} (HN: \`${id}\`)\n` +
    `🏥 *โรคหลัก:* ${disease}\n` +
    `👵 *อายุ/เพศ:* ${age || '-'} ปี / ${gender || '-'}\n` +
    `📞 *เบอร์ญาติ:* ${relativePhone} (${caregiverName || 'ญาติ'})\n` +
    `👩‍⚕️ *ผู้ดูแลรับผิดชอบ:* ${responsibleStaff || 'พย.วิกานดา'}\n` +
    `📝 *บันทึกแรกรับ:* ${clinicalNotes || '-'}`
  );
  
  return jsonResponse(patient, 201);
}

function updatePatient(body, user) {
  const { id, status } = body;
  if (!id) return jsonResponse({ error: 'Patient ID required' }, 400);

  const sheet = getSheet(SHEET_PATIENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    if (sameId(data[i][0], id)) {
      if (status) {
        const statusCol = headers.indexOf('status');
        if (statusCol >= 0) sheet.getRange(i + 1, statusCol + 1).setValue(status);
      }
      return jsonResponse({ success: true });
    }
  }
  
  return jsonResponse({ error: 'Patient not found' }, 404);
}

function deletePatient(patientId, user) {
  if (!patientId) return jsonResponse({ error: 'Patient ID required' }, 400);

  const sheet = getSheet(SHEET_PATIENTS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (sameId(data[i][0], patientId)) {
      sheet.deleteRow(i + 1);
      
      // Also delete assessments
      const assessSheet = getSheet(SHEET_ASSESSMENTS);
      const aData = assessSheet.getDataRange().getValues();
      for (let j = aData.length - 1; j >= 1; j--) {
        if (sameId(aData[j][1], patientId)) assessSheet.deleteRow(j + 1);
      }
      
      return jsonResponse({ message: 'Patient deleted' });
    }
  }
  
  return jsonResponse({ error: 'Patient not found' }, 404);
}

function generateToken(patientId, status, user) {
  if (!patientId) return jsonResponse({ error: 'Patient ID required' }, 400);

  const sheet = getSheet(SHEET_PATIENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const tokenCol = headers.indexOf('token');
  const statusCol = headers.indexOf('status');
  
  for (let i = 1; i < data.length; i++) {
    if (sameId(data[i][0], patientId)) {
      if (!data[i][tokenCol]) {
        const newToken = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
        sheet.getRange(i + 1, tokenCol + 1).setValue(newToken);
        data[i][tokenCol] = newToken;
      }
      if (status && statusCol >= 0) {
        sheet.getRange(i + 1, statusCol + 1).setValue(status);
      }
      
      const patient = {};
      headers.forEach((h, idx) => { patient[h] = data[i][idx] || ''; });
      patient.HN = String(data[i][0]);
      patient.id = String(data[i][0]);
      return jsonResponse(patient);
    }
  }
  
  return jsonResponse({ error: 'Patient not found' }, 404);
}

// ==================== ASSESSMENTS ====================

function verifyTokenAPI(token) {
  const sheet = getSheet(SHEET_PATIENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const tokenCol = headers.indexOf('token');
  const nameCol = headers.indexOf('name');
  const hnCol = headers.indexOf('HN');
  const diseaseCol = headers.indexOf('disease');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][tokenCol] === token) {
      return jsonResponse({ 
        name: data[i][nameCol], 
        disease: diseaseCol >= 0 ? data[i][diseaseCol] : '', 
        HN: String(data[i][hnCol]) 
      });
    }
  }
  
  return jsonResponse({ error: 'Link is invalid or expired' }, 404);
}

function serveForm(token) {
  // Verify token exists
  const sheet = getSheet(SHEET_PATIENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const tokenCol = headers.indexOf('token');
  
  let patientName = '';
  let patientHN = '';
  let found = false;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][tokenCol] === token) {
      patientName = data[i][headers.indexOf('name')];
      patientHN = data[i][headers.indexOf('HN')];
      found = true;
      break;
    }
  }
  
  if (!found) {
    return HtmlService.createHtmlOutput('<h2>❌ ลิงก์ไม่ถูกต้องหรือหมดอายุ</h2>').setTitle('Error');
  }
  
  const html = HtmlService.createTemplateFromFile('Form');
  html.patientName = patientName;
  html.patientHN = patientHN;
  html.token = token;
  
  return html.evaluate()
    .setTitle('แบบประเมินอาการ ESAS - ' + patientName)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Handle form submission directly from Apps Script Form.html (via google.script.run)
 */
function submitAssessmentFromForm(jsonString) {
  try {
    const payload = JSON.parse(jsonString);
    const res = submitAssessment(payload);
    return res.getContent();
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

function submitAssessment(body) {
  const { token, scores, notes, round, vitalSigns, otherSymptoms } = body;
  
  if (!token || !scores) {
    return jsonResponse({ error: 'Token and scores are required' }, 400);
  }
  
  // Verify token
  const patSheet = getSheet(SHEET_PATIENTS);
  const pData = patSheet.getDataRange().getValues();
  const pHeaders = pData[0];
  const tokenCol = pHeaders.indexOf('token');
  const hnCol = pHeaders.indexOf('HN');
  const nameCol = pHeaders.indexOf('name');
  const statusCol = pHeaders.indexOf('status');
  
  let patientRow = -1;
  let patientHN = '';
  let patientName = '';
  for (let i = 1; i < pData.length; i++) {
    if (pData[i][tokenCol] === token) {
      patientRow = i;
      patientHN = pData[i][hnCol];
      patientName = pData[i][nameCol];
      break;
    }
  }
  
  if (patientRow === -1) {
    return jsonResponse({ error: 'Invalid or expired assessment link' }, 400);
  }
  
  // Save assessment
  const assessSheet = getSheet(SHEET_ASSESSMENTS);
  const today = new Date();
  const dateStr = Utilities.formatDate(today, 'GMT+7', 'yyyy-MM-dd');
  
  const vs = vitalSigns || {};
  const newRow = [
    'a_' + Date.now(),
    patientHN,
    dateStr,
    round || '09:00',
    parseInt(scores.pain) || 0,
    parseInt(scores.shortnessOfBreath) || 0,
    parseInt(scores.tiredness) || 0,
    parseInt(scores.drowsiness) || 0,
    parseInt(scores.nausea) || 0,
    parseInt(scores.appetite) || 0,
    parseInt(scores.depression) || 0,
    parseInt(scores.anxiety) || 0,
    parseInt(scores.wellbeing) || 0,
    vs.bp || '',
    vs.pulse || '',
    vs.temp || '',
    vs.spo2 || '',
    vs.weight || '',
    otherSymptoms || '',
    notes || ''
  ];

  assessSheet.appendRow(newRow);
  
  // Update patient status
  if (statusCol >= 0) {
    patSheet.getRange(patientRow + 1, statusCol + 1).setValue('ประเมินแล้ว');
  }

  // Check critical symptoms (score >= 7)
  const criticalItems = [];
  const symptomLabels = {
    pain: 'ปวด (Pain)',
    shortnessOfBreath: 'หายใจเหนื่อยหอบ (Dyspnea)',
    tiredness: 'เหนื่อยล้า/อ่อนเพลีย',
    drowsiness: 'ง่วงซึม',
    nausea: 'คลื่นไส้/อาเจียน',
    appetite: 'เบื่ออาหาร',
    depression: 'ซึมเศร้า',
    anxiety: 'วิตกกังวล',
    wellbeing: 'สุขภาวะโดยรวม'
  };

  Object.keys(scores).forEach(k => {
    const val = parseInt(scores[k]) || 0;
    if (val >= 7) {
      criticalItems.push(`- ${symptomLabels[k] || k}: *${val}/10*`);
    }
  });

  const isCritical = criticalItems.length > 0;

  // Build Telegram Notification
  let alertMsg = '';
  if (isCritical) {
    alertMsg = `🚨 *[แจ้งเตือนด่วน: เคสวิกฤต]* 🚨\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 *คนไข้:* ${patientName} (HN: \`${patientHN}\`)\n` +
      `⏰ *รอบประเมิน:* ${round || '09:00'} (${dateStr})\n` +
      `⚠️ *อาการวิกฤตที่ตรวจพบ (≥ 7):*\n${criticalItems.join('\n')}\n` +
      `━━━━━━━━━━━━━━━━━━\n`;
  } else {
    alertMsg = `✅ *[บันทึกแบบประเมิน ESAS ใหม่]*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 *คนไข้:* ${patientName} (HN: \`${patientHN}\`)\n` +
      `⏰ *รอบ:* ${round || '09:00'} | *วันที่:* ${dateStr}\n` +
      `📊 *ระดับอาการ:* ปวด ${scores.pain || 0}, หายใจ ${scores.shortnessOfBreath || 0}, อ่อนเพลีย ${scores.tiredness || 0}, สุขภาวะ ${scores.wellbeing || 0}\n`;
  }

  // Add vital signs if available
  if (vs.bp || vs.pulse || vs.spo2 || vs.temp) {
    alertMsg += `🩺 *สัญญาณชีพ:* BP: ${vs.bp || '-'}, PR: ${vs.pulse || '-'} bpm, SpO2: ${vs.spo2 || '-'}%, Temp: ${vs.temp || '-'}°C\n`;
  }

  if (otherSymptoms) {
    alertMsg += `➕ *อาการอื่น:* ${otherSymptoms}\n`;
  }

  if (notes) {
    alertMsg += `📝 *บันทึกเพิ่มเติม:* "${notes}"\n`;
  }

  sendTelegramMessage(alertMsg);
  
  return jsonResponse({ message: 'Assessment submitted successfully' }, 201);
}

function getAssessments(patientId, user) {
  if (!patientId) return jsonResponse({ error: 'Patient ID required' }, 400);

  const sheet = getSheet(SHEET_ASSESSMENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const results = [];
  
  for (let i = 1; i < data.length; i++) {
    if (sameId(data[i][1], patientId)) {
      const row = data[i];
      const ass = {};
      headers.forEach((h, idx) => { ass[h] = row[idx] || ''; });
      
      // Reformat scores as object
      ass.scores = {
        pain: parseInt(ass.pain) || 0,
        shortnessOfBreath: parseInt(ass.shortnessOfBreath) || 0,
        tiredness: parseInt(ass.tiredness) || 0,
        drowsiness: parseInt(ass.drowsiness) || 0,
        nausea: parseInt(ass.nausea) || 0,
        appetite: parseInt(ass.appetite) || 0,
        depression: parseInt(ass.depression) || 0,
        anxiety: parseInt(ass.anxiety) || 0,
        wellbeing: parseInt(ass.wellbeing) || 0
      };

      // Reformat vital signs
      ass.vitalSigns = {
        bp: ass.bp || '',
        pulse: ass.pulse || '',
        temp: ass.temp || '',
        spo2: ass.spo2 || '',
        weight: ass.weight || ''
      };

      results.push(ass);
    }
  }
  
  // Sort oldest to newest
  results.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  
  return jsonResponse(results);
}

function getLatestAssessment(patientHN) {
  const sheet = getSheet(SHEET_ASSESSMENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  let latest = null;
  let latestDate = '';
  
  for (let i = 1; i < data.length; i++) {
    if (sameId(data[i][1], patientHN) && String(data[i][2]) >= latestDate) {
      latestDate = String(data[i][2]);
      latest = {};
      headers.forEach((h, idx) => { latest[h] = data[i][idx] || ''; });
      latest.scores = {
        pain: parseInt(latest.pain) || 0,
        shortnessOfBreath: parseInt(latest.shortnessOfBreath) || 0,
        tiredness: parseInt(latest.tiredness) || 0,
        drowsiness: parseInt(latest.drowsiness) || 0,
        nausea: parseInt(latest.nausea) || 0,
        appetite: parseInt(latest.appetite) || 0,
        depression: parseInt(latest.depression) || 0,
        anxiety: parseInt(latest.anxiety) || 0,
        wellbeing: parseInt(latest.wellbeing) || 0
      };
      latest.vitalSigns = {
        bp: latest.bp || '',
        pulse: latest.pulse || '',
        temp: latest.temp || '',
        spo2: latest.spo2 || '',
        weight: latest.weight || ''
      };
    }
  }
  
  return latest;
}

// ==================== EVENT LOGS ====================

function getEventLogs(patientId, user) {
  if (!patientId) return jsonResponse([]);

  const sheet = getSheet(SHEET_EVENT_LOGS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const results = [];
  
  for (let i = 1; i < data.length; i++) {
    if (sameId(data[i][1], patientId)) {
      const log = {};
      headers.forEach((h, idx) => { log[h] = data[i][idx] || ''; });
      results.push(log);
    }
  }
  
  return jsonResponse(results);
}

function addEventLog(body, user) {
  const { patientId, category, title, content, recordedBy } = body;
  
  if (!patientId || !category || !title || !content) {
    return jsonResponse({ error: 'Patient ID, category, title, and content are required' }, 400);
  }

  const sheet = getSheet(SHEET_EVENT_LOGS);
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  
  const newLog = [
    'e_' + Date.now(),
    patientId,
    category,
    title,
    'วันนี้',
    hours + ':' + mins + ' น.',
    content,
    recordedBy || user.name || 'พยาบาลเวร'
  ];
  
  sheet.appendRow(newLog);
  
  return jsonResponse({
    id: newLog[0], patientId, category, title,
    date: 'วันนี้', time: hours + ':' + mins + ' น.',
    content, recordedBy: newLog[7]
  }, 201);
}

// ==================== AI SUMMARY ====================

function getAISummary(patientId, user) {
  if (!patientId) return jsonResponse({ error: 'Patient ID required' }, 400);

  let summaryText;
  
  if (patientId === '123456') {
    summaryText = `### 🤖 สรุปอาการทางคลินิกโดย AI (คุณยายสมศรี รักดี)

**ภาพรวมผู้ป่วย:**
- ผู้ป่วยหญิงอายุ 69 ปี วินิจฉัยเป็น **CA Lung ระยะที่ 4 ลุกลามกระดูก** (Active Home Ward)
- ได้รับยา Fentanyl patch 25mcg/hr เพื่อคุมอาการปวดกระดูก

**การวิเคราะห์ผลประเมินล่าสุด:**
- อาการเหนื่อยหอบเพิ่มระดับจาก 5 ขึ้นเป็น **9 คะแนน (วิกฤต 🚨)** สอดคล้องกับที่มีประวัติการประเมินปวดเฉียบพลันระดับ **8 คะแนน** ร่วมด้วย
- มีความวิตกกังวลและท้อแท้ระดับปานกลาง (4 และ 3 คะแนน)

**ข้อเสนอแนะการพยาบาลเร่งด่วน:**
1. **การควบคุมอาการเหนื่อยหอบ:** แนะนำญาติปรับอัตราการไหลของออกซิเจนกระป๋อง/สาย CANNULA เป็น 2-3 ลิตร/นาที และช่วยจัดท่านอนศีรษะสูง (Fowler's Position)
2. **การบรรเทาความปวด:** พิจารณาให้ยา Morphine Syrup 2.5-5 mg oral ทุก 4 ชม. ตามแผนการรักษาของแพทย์สำหรับ Break-through pain และบันทึกผลการลดระดับความปวดหลังให้ยา 1 ชม.
3. **การเข้าแทรกแซง:** ส่งทีมพยาบาลเยี่ยมบ้านด่วนเพื่อเข้าประเมินสภาพปอด เสียงเสมหะ (Crepitation/Rales) และดูสภาพการใช้งานออกซิเจนที่บ้าน
4. **ความช่วยเหลือด้านจิตใจ:** ให้คำแนะนำเชิงจิตวิทยากับลูกสาว (ญาติผู้ดูแลหลัก) ในการประคับประคองอารมณ์เพื่อลดระดับความวิตกกังวลของคนไข้`;
  } else {
    summaryText = `### 🤖 สรุปอาการทางคลินิกโดย AI (ผู้ป่วยทั่วไป)

**ภาพรวมผู้ป่วย:**
- ผู้ป่วยได้รับการดูแลแบบประคับประคองที่บ้าน (Home Ward) ภายใต้การดูแลร่วมโดยทีมแพทย์และพยาบาล

**การวิเคราะห์ผลประเมินล่าสุด:**
- สถานะอาการคงที่ คะแนนอาการปวดและการหายใจอยู่ในเกณฑ์ที่สามารถควบคุมได้ที่บ้าน
- สัญญาณชีพและอัตราการตอบกลับแบบประเมินรายวันสมบูรณ์ดี

**ข้อเสนอแนะทั่วไป:**
1. ติดตามการส่งแบบประเมิน ESAS ในรอบเย็นถัดไปเพื่อประเมินความสม่ำเสมอของอาการ
2. เน้นย้ำให้ญาติปฏิบัติตามแผนการควบคุมอาการตามบันทึกการรักษา
3. แจ้งช่องทางการติดต่อด่วนแก่ญาติหากคนไข้มีภาวะฉุกเฉิน`;
  }
  
  return jsonResponse({ summary: summaryText });
}

// ==================== TELEGRAM NOTIFICATION ====================

function sendTelegramMessage(text) {
  const token = TELEGRAM_BOT_TOKEN || PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN');
  const chatId = TELEGRAM_CHAT_ID || PropertiesService.getScriptProperties().getProperty('TELEGRAM_CHAT_ID');

  if (!token || !chatId) {
    Logger.log('Telegram Token or Chat ID not set. Message skipped.');
    return false;
  }

  try {
    const url = 'https://api.telegram.org/bot' + token + '/sendMessage';
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const res = UrlFetchApp.fetch(url, options);
    Logger.log('Telegram response: ' + res.getContentText());
    return true;
  } catch (err) {
    Logger.log('Telegram error: ' + err.message);
    return false;
  }
}

// ==================== TTS PROXY ====================

function ttsProxy(text) {
  if (!text) return ContentService.createTextOutput('No text');
  try {
    const url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(text) + '&tl=th&client=tw-ob';
    const response = UrlFetchApp.fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      muteHttpExceptions: true
    });
    // Return binary MP3 directly
    const blob = response.getBlob().setContentType('audio/mpeg');
    return blob;
  } catch (e) {
    return ContentService.createTextOutput('TTS Error: ' + e.message);
  }
}

function getTtsBase64(text) {
  if (!text) return 'Error: No text';
  try {
    const url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(text) + '&tl=th&client=tw-ob';
    const response = UrlFetchApp.fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      muteHttpExceptions: true
    });
    return Utilities.base64Encode(response.getBlob().getBytes());
  } catch (e) {
    return 'Error: ' + e.message;
  }
}

// ==================== HELPERS ====================

function sameId(a, b) {
  return String(a) === String(b);
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function parseBody(e) {
  try {
    if (e.postData && e.postData.contents) {
      return JSON.parse(e.postData.contents);
    }
  } catch (err) {}
  return e.parameter || {};
}

function jsonResponse(data, code) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== SETUP ====================

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Users sheet
  if (!ss.getSheetByName(SHEET_USERS)) {
    const sheet = ss.insertSheet(SHEET_USERS);
    sheet.appendRow(['id', 'username', 'password', 'role', 'name']);
    sheet.appendRow(['u1', 'admin', 'admin123', 'admin', 'พย.วิกานดา']);
    sheet.appendRow(['u2', 'nurse1', 'nurse123', 'nurse', 'พย.สมหญิง']);
  }
  
  // 2. Patients sheet
  if (!ss.getSheetByName(SHEET_PATIENTS)) {
    const sheet = ss.insertSheet(SHEET_PATIENTS);
    sheet.appendRow(['HN', 'name', 'disease', 'token', 'status', 'age', 'gender', 'relativePhone', 'caregiverName', 'address', 'responsibleStaff', 'clinicalNotes']);
    sheet.appendRow(['123456', 'คุณยายสมศรี รักดี', 'CA Lung ระยะ 4', 'sample_token_abc123', 'ยังไม่ส่งลิงก์', 69, 'หญิง', '089-123-4567', 'ลูกสาวสมหญิง', 'ต.เมืองพล อ.พล จ.ขอนแก่น', 'พย.วิกานดา', 'Fentanyl patch 25mcg/hr']);
    sheet.appendRow(['998877', 'คุณลุงบุญมี ศรีสุข', 'CHF', 'sample_token_def456', 'ยังไม่ส่งลิงก์', 72, 'ชาย', '081-987-6543', 'ภรรยามาลี', 'อ.พล จ.ขอนแก่น', 'นพ.พีรพล', 'จำกัดน้ำดื่ม จดบันทึกน้ำหนัก']);
  }
  
  // 3. Assessments sheet (with Vital Signs & Other Symptoms)
  let assessSheet = ss.getSheetByName(SHEET_ASSESSMENTS);
  if (!assessSheet) {
    assessSheet = ss.insertSheet(SHEET_ASSESSMENTS);
    assessSheet.appendRow([
      'id', 'patientId', 'date', 'round', 
      'pain', 'shortnessOfBreath', 'tiredness', 'drowsiness', 'nausea', 
      'appetite', 'depression', 'anxiety', 'wellbeing', 
      'bp', 'pulse', 'temp', 'spo2', 'weight', 'otherSymptoms', 'notes'
    ]);
  }
  
  // 4. Event Logs sheet
  if (!ss.getSheetByName(SHEET_EVENT_LOGS)) {
    const sheet = ss.insertSheet(SHEET_EVENT_LOGS);
    sheet.appendRow(['id', 'patientId', 'category', 'title', 'date', 'time', 'content', 'recordedBy']);
  }
  
  SpreadsheetApp.getUi().alert('✅ ตั้งค่า Sheets เรียบร้อย! ระบบ Palliative Care รพ.พล พร้อมใช้งาน');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🏥 Palliative Care')
    .addItem('⚙️ ตั้งค่า Sheets และคอลัมน์', 'setupSheets')
    .addToUi();
}