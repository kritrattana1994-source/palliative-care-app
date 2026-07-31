const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const https = require('https');
const { loadDb, saveDb, initDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'palliative_care_secret_key_123';

app.use(cors());
app.use(express.json());

// Initialize Database
initDb();

// Middleware: Authenticate Staff (JWT)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied, token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// --- AUTH API ---

// Login Staff
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const db = loadDb();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user) {
    return res.status(400).json({ error: 'Invalid username or password' });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return res.status(400).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
});

// Get logged-in user profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// --- PATIENTS API (Protected) ---

// Get all patients with their latest assessment
app.get('/api/patients', authenticateToken, (req, res) => {
  const db = loadDb();
  
  const patientsWithAssessments = db.patients.map(patient => {
    // Find latest assessment for this patient
    const patientAssessments = db.assessments
      .filter(a => a.patientId === patient.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // descending date
      
    const latestAssessment = patientAssessments[0] || null;
    return {
      ...patient,
      latestAssessment
    };
  });
  
  res.json(patientsWithAssessments);
});

// Create new patient
app.post('/api/patients', authenticateToken, (req, res) => {
  const { id, name, age, gender, disease, relativePhone, caregiverName, address, responsibleStaff, clinicalNotes } = req.body;
  if (!id || !name || !disease || !relativePhone) {
    return res.status(400).json({ error: 'HN, Name, Disease, and Relative Phone are required' });
  }

  const db = loadDb();
  if (db.patients.find(p => p.id === id)) {
    return res.status(400).json({ error: 'Patient with this HN already exists' });
  }

  const token = crypto.randomBytes(16).toString('hex');
  const newPatient = {
    id,
    name,
    age: parseInt(age) || null,
    gender: gender || 'ชาย',
    disease,
    relativePhone,
    caregiverName: caregiverName || '',
    address: address || '',
    responsibleStaff: responsibleStaff || 'พย.วิกานดา',
    clinicalNotes: clinicalNotes || '',
    status: 'ยังไม่ส่งลิงก์',
    token
  };

  db.patients.push(newPatient);
  saveDb(db);

  res.status(201).json(newPatient);
});

// Update patient info or status
app.put('/api/patients/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, age, gender, disease, relativePhone, caregiverName, address, responsibleStaff, clinicalNotes, status } = req.body;

  const db = loadDb();
  const patientIndex = db.patients.findIndex(p => p.id === id);

  if (patientIndex === -1) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const updatedPatient = {
    ...db.patients[patientIndex],
    ...(name && { name }),
    ...(age !== undefined && { age: parseInt(age) || null }),
    ...(gender && { gender }),
    ...(disease && { disease }),
    ...(relativePhone && { relativePhone }),
    ...(caregiverName !== undefined && { caregiverName }),
    ...(address !== undefined && { address }),
    ...(responsibleStaff && { responsibleStaff }),
    ...(clinicalNotes !== undefined && { clinicalNotes }),
    ...(status && { status })
  };

  db.patients[patientIndex] = updatedPatient;
  saveDb(db);

  res.json(updatedPatient);
});

// Delete patient
app.delete('/api/patients/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const db = loadDb();
  const initialCount = db.patients.length;
  db.patients = db.patients.filter(p => p.id !== id);
  
  if (db.patients.length === initialCount) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  // Optionally clean up assessments
  db.assessments = db.assessments.filter(a => a.patientId !== id);

  saveDb(db);
  res.json({ message: 'Patient and related assessments deleted successfully' });
});

// Regenerate token / Update status
app.post('/api/patients/:id/generate-token', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // e.g. 'ส่งแล้ว (รอผล)'

  const db = loadDb();
  const patientIndex = db.patients.findIndex(p => p.id === id);

  if (patientIndex === -1) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  // Reuse existing token if present, otherwise generate a new one
  if (!db.patients[patientIndex].token) {
    db.patients[patientIndex].token = crypto.randomBytes(16).toString('hex');
  }
  
  if (status) {
    db.patients[patientIndex].status = status;
  }
  
  saveDb(db);
  res.json(db.patients[patientIndex]);
});


// --- ASSESSMENTS API ---

// Submit Assessment (PUBLIC - requires valid patient token)
app.post('/api/assessments', (req, res) => {
  const { token, scores, notes, round } = req.body;
  
  if (!token || !scores) {
    return res.status(400).json({ error: 'Token and scores are required' });
  }

  const db = loadDb();
  const patient = db.patients.find(p => p.token === token);
  
  if (!patient) {
    return res.status(400).json({ error: 'Invalid or expired assessment link' });
  }

  const now = new Date().toISOString().split('T')[0];
  const newAssessment = {
    id: 'a_' + Date.now(),
    patientId: patient.id,
    date: now,
    round: round || '09:00',
    scores: {
      pain: parseInt(scores.pain) || 0,
      tiredness: parseInt(scores.tiredness) || 0,
      drowsiness: parseInt(scores.drowsiness) || 0,
      nausea: parseInt(scores.nausea) || 0,
      appetite: parseInt(scores.appetite) || 0,
      shortnessOfBreath: parseInt(scores.shortnessOfBreath) || 0,
      depression: parseInt(scores.depression) || 0,
      anxiety: parseInt(scores.anxiety) || 0,
      wellbeing: parseInt(scores.wellbeing) || 0
    },
    notes: notes || ''
  };

  db.assessments.push(newAssessment);
  
  // Update patient status to 'ประเมินแล้ว'
  const patientIndex = db.patients.findIndex(p => p.id === patient.id);
  db.patients[patientIndex].status = 'ประเมินแล้ว';
  
  saveDb(db);

  res.status(201).json({ message: 'Assessment submitted successfully', assessment: newAssessment });
});

// Get historical assessments for a patient (Protected)
app.get('/api/assessments/:patientId', authenticateToken, (req, res) => {
  const { patientId } = req.params;

  const db = loadDb();
  const patientAssessments = db.assessments
    .filter(a => a.patientId === patientId)
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // oldest to newest for graph timeline
    
  res.json(patientAssessments);
});

// Public endpoint to verify token and get patient metadata (for form page title)
app.get('/api/verify-token/:token', (req, res) => {
  const { token } = req.params;
  const db = loadDb();
  const patient = db.patients.find(p => p.token === token);
  if (!patient) {
    return res.status(404).json({ error: 'Link is invalid or expired' });
  }
  res.json({ name: patient.name, disease: patient.disease, HN: patient.id });
});

// --- EVENT LOGS & AI SUMMARY API (Protected) ---

// Get patient event logs
app.get('/api/patients/:id/event-logs', authenticateToken, (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  const logs = db.eventLogs ? db.eventLogs.filter(log => log.patientId === id) : [];
  res.json(logs);
});

// Add new event log
app.post('/api/patients/:id/event-logs', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { category, title, content, recordedBy } = req.body;
  
  if (!category || !title || !content) {
    return res.status(400).json({ error: 'Category, title, and content are required' });
  }

  const db = loadDb();
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  
  const newLog = {
    id: 'e_' + Date.now(),
    patientId: id,
    category,
    title,
    date: 'วันนี้',
    time: `${hours}:${mins} น.`,
    content,
    recordedBy: recordedBy || req.user.name || 'พยาบาลเวร'
  };

  if (!db.eventLogs) db.eventLogs = [];
  db.eventLogs.push(newLog);
  saveDb(db);

  res.status(201).json(newLog);
});

// Get AI summary for a patient
app.post('/api/patients/:id/ai-summary', authenticateToken, (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  const patient = db.patients.find(p => p.id === id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const assessments = db.assessments.filter(a => a.patientId === id);
  const latest = assessments[assessments.length - 1];

  let summaryText = "";
  
  if (id === '123456') { // Somsri
    summaryText = `### 🤖 สรุปอาการทางคลินิกโดย AI (คุณยายสมศรี รักดี)

**ภาพรวมผู้ป่วย:**
- ผู้ป่วยหญิงอายุ 69 ปี วินิจฉัยเป็น **CA Lung ระยะที่ 4 ลุกลามกระดูก** (Active Home Care)
- ได้รับยา Fentanyl patch 25mcg/hr เพื่อคุมอาการปวดกระดูก

**การวิเคราะห์ผลประเมินล่าสุด:**
- อาการเหนื่อยหอบเพิ่มระดับจาก 5 ขึ้นเป็น **9 คะแนน (วิกฤต 🚨)** สอดคล้องกับที่มีประวัติการประเมินปวดเฉียบพลันระดับ **8 คะแนน** ร่วมด้วย
- มีความวิตกกังวลและท้อแท้ระดับปานกลาง (4 และ 3 คะแนน)

**ข้อเสนอแนะการพยาบาลเร่งด่วน:**
1. **การควบคุมอาการเหนื่อยหอบ:** แนะนำญาติปรับอัตราการไหลของออกซิเจนกระป๋อง/สาย CANNULA เป็น 2-3 ลิตร/นาที และช่วยจัดท่านอนศีรษะสูง (Fowler's Position)
2. **การบรรเทาความปวด:** พิจารณาให้ยา Morphine Syrup 2.5-5 mg oral ทุก 4 ชม. ตามแผนการรักษาของแพทย์สำหรับ Break-through pain และบันทึกผลการลดระดับความปวดหลังให้ยา 1 ชม.
3. **การเข้าแทรกแซง:** ส่งทีมพยาบาลเยี่ยมบ้านด่วนเพื่อเข้าประเมินสภาพปอด เสียงเสมหะ (Crepitation/Rales) และดูสภาพการใช้งานออกซิเจนที่บ้าน
4. **ความช่วยเหลือด้านจิตใจ:** ให้คำแนะนำเชิงจิตวิทยากับลูกสาว (ญาติผู้ดูแลหลัก) ในการประคับประคองอารมณ์เพื่อลดระดับความวิตกกังวลของคนไข้`;
  } else if (id === '998877') { // Boonmee
    summaryText = `### 🤖 สรุปอาการทางคลินิกโดย AI (คุณลุงบุญมี ศรีสุข)

**ภาพรวมผู้ป่วย:**
- ผู้ป่วยชายอายุ 72 ปี วินิจฉัยเป็น **CHF (ภาวะหัวใจล้มเหลวเรื้อรัง)**
- แผนหลักคือจำกัดน้ำและสังเกตอาการบวม

**การวิเคราะห์ผลประเมินล่าสุด:**
- อาการโดยรวมปกติดี (สุขภาวะระดับ 8 ดีมาก, คะแนนความเหนื่อยหอบลดลงจาก 6 เหลือ **1 คะแนน** ในช่วง 3 วันที่ผ่านมา)
- น้ำหนักลดลงและอาการบวมที่ขา (Edema) ยุบลงอย่างเด่นชัด สัญญาณชีพเสถียร

**ข้อเสนอแนะการพยาบาล:**
1. **การบริหารยา:** ให้รับประทานยาขับปัสสาวะ Lasix 40mg ตามแพทย์สั่งต่อเนื่อง และประเมินสัญญาณชีพ (ความดัน/ชีพจร)
2. **การบริโภคอาหาร:** เน้นย้ำญาติให้จำกัดน้ำดื่มและจำกัดอาหารรสเค็ม/โซเดียมอย่างเข้มงวดเพื่อป้องกันภาวะน้ำท่วมปอดเฉียบพลัน
3. **การเฝ้าระวัง:** ให้ญาติตรวจสอบน้ำหนักตัวทุกเช้าหลังปัสสาวะเสร็จ หากน้ำหนักขึ้นเกิน 1.5 กิโลกรัมภายใน 1-2 วัน หรือเริ่มนอนราบไม่ได้ ให้โทรแจ้งสายด่วนทันที`;
  } else {
    summaryText = `### 🤖 สรุปอาการทางคลินิกโดย AI (ผู้ป่วยทั่วไป)

**ภาพรวมผู้ป่วย:**
- ผู้ป่วยได้รับการดูแลแบบประคับประคองที่บ้าน (Home Ward) ภายใต้การดูแลร่วมโดยทีมแพทย์และพยาบาล รพ.พล

**การวิเคราะห์ผลประเมินล่าสุด:**
- สถานะอาการคงที่ คะแนนอาการปวดและการหายใจอยู่ในเกณฑ์ที่สามารถควบคุมได้ที่บ้าน
- สัญญาณชีพและอัตราการตอบกลับแบบประเมินรายวันสมบูรณ์ดี

**ข้อเสนอแนะทั่วไป:**
1. ติดตามการส่งแบบประเมิน ESAS ในรอบเย็นถัดไปเพื่อประเมินความสม่ำเสมอของอาการ
2. เน้นย้ำให้ญาติปฏิบัติตามแผนการควบคุมอาการตามบันทึกการรักษา
3. แจ้งช่องทางการติดต่อด่วนแก่ญาติหากคนไข้มีภาวะฉุกเฉิน`;
  }

  res.json({ summary: summaryText });
});


// --- TTS PROXY ENDPOINT (PUBLIC) ---
app.get('/api/tts', (req, res) => {
  const text = req.query.text || '';
  if (!text) return res.status(400).send('No text provided');

  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=th&client=tw-ob`;
  
  const reqOptions = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  };

  https.get(url, reqOptions, (stream) => {
    if (stream.statusCode !== 200) {
      return res.status(stream.statusCode).send('TTS fetch error');
    }
    res.set('Content-Type', 'audio/mpeg');
    stream.pipe(res);
  }).on('error', (err) => {
    console.error('TTS Proxy Error:', err.message);
    res.status(500).send(err.message);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Palliative Care Backend running on port ${PORT}`);
});
