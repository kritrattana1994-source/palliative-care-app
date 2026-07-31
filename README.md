# 🏥 Palliative Care App

ระบบจัดการดูแลผู้ป่วยระยะประคับประคอง (Palliative Care Management System)

## 📋 ภาพรวมระบบ

ระบบนี้ประกอบด้วย 3 ส่วนหลัก:

1. **Frontend Dashboard** - หน้าจัดการสำหรับพยาบาล/แพทย์
2. **ESAS Form** - แบบประเมินอาการสำหรับผู้ป่วย/ญาติ (พร้อมเสียงพูดภาษาไทย)
3. **Backend API** - Google Apps Script + Google Sheets

## 🚀 Quick Start

### ทดสอบ Backend
```bash
node quick-test.js
```

### รัน Frontend (Development)
```bash
cd frontend
npm install
npm run dev
```

เปิดเบราว์เซอร์: http://localhost:5173/login
- Username: `admin`
- Password: `admin123`

### Build Production
```bash
cd frontend
npm run build
```

## 🏗️ สถาปัตยกรรมระบบ

```
┌─────────────────────────────────────────────────────────┐
│                    USER DEVICES                         │
│  📱 Mobile (ESAS Form)  |  💻 Desktop (Dashboard)       │
└────────────────┬────────────────────┬───────────────────┘
                 │                    │
                 ▼                    ▼
┌────────────────────────┐  ┌──────────────────────────┐
│   Apps Script Web App  │  │  Netlify (Frontend)      │
│  (Backend + Form HTML) │  │  React + Vite + Tailwind │
└───────────┬────────────┘  └────────────┬─────────────┘
            │                            │
            └──────────┬─────────────────┘
                       ▼
            ┌──────────────────────┐
            │   Google Sheets      │
            │  (Database)          │
            │  - users             │
            │  - patients          │
            │  - assessments       │
            │  - event_logs        │
            └──────────────────────┘
```

## 📦 โครงสร้างโปรเจค

```
palliative-care-app/
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── pages/           # หน้าต่างๆ
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── PatientRegistry.jsx
│   │   │   ├── ClinicalTimeline.jsx
│   │   │   └── ESASForm.jsx
│   │   ├── config.js        # API Configuration
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
│
├── apps-script/             # Google Apps Script Backend
│   ├── Code.gs              # Backend API
│   ├── Form.html            # ESAS Form HTML
│   ├── .clasp.json          # Clasp configuration
│   └── appsscript.json
│
├── backend/                 # Express Backend (สำหรับ dev)
│   ├── server.js
│   └── database.js
│
├── quick-test.js            # ทดสอบ Backend API
├── DEPLOYMENT_CHECKLIST.md  # คู่มือ Deploy
└── คู่มือ-ขั้นตอนต่อไป.txt  # คู่มือฉบับเต็ม
```

## 🎯 Features

### Frontend Dashboard
- ✅ ระบบ Login (admin/nurse roles)
- ✅ ทะเบียนผู้ป่วย (เพิ่ม/แก้ไข/ลบ)
- ✅ สร้างและส่งลิงก์แบบประเมิน
- ✅ Dashboard แสดงสถิติและคะแนนล่าสุด
- ✅ Clinical Timeline (กราฟและประวัติ)
- ✅ AI Summary (สรุปอาการโดย AI)

### ESAS Form
- ✅ แบบประเมิน 9 อาการ (ESAS)
- ✅ เสียงพูดภาษาไทย (Text-to-Speech)
- ✅ UI/UX สำหรับผู้สูงอายุ
- ✅ ทดสอบเสียงก่อนเริ่ม
- ✅ บันทึกข้อความเพิ่มเติม
- ✅ ไม่ต้อง Login (ใช้ token)

### Backend API
- ✅ Authentication (JWT)
- ✅ Patient Management
- ✅ Assessment Recording
- ✅ Event Logging
- ✅ Token Generation
- ✅ Google Sheets Database

## 🔧 การ Deploy

### 1. Apps Script Backend

```bash
# Login to clasp (ครั้งแรกเท่านั้น)
clasp login

# Push code to Apps Script
cd apps-script
clasp push

# Deploy (ใน Apps Script Editor)
# Deploy → New deployment → Web app
# Execute as: Me
# Who has access: Anyone
```

**สำคัญ:** ต้องตั้งค่า "Who has access" เป็น **"Anyone"** ไม่ใช่ "Anyone with Google account"

### 2. Frontend Deployment

**Option A: Netlify (Auto Deploy)**
```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

**Option B: Manual Build**
```bash
cd frontend
npm run build
# Upload dist/ folder to Netlify
```

## 🧪 การทดสอบ

### ทดสอบ Backend API
```bash
node quick-test.js
```

### ทดสอบ Frontend (Local)
```bash
cd frontend
npm run dev
# เปิด http://localhost:5173/login
```

### ทดสอบ ESAS Form
1. Login เข้า Dashboard
2. กดปุ่ม "📋 Copy ลิงก์" ของผู้ป่วย
3. เปิดลิงก์ในมือถือ (Chrome/Safari)
4. ทดสอบเสียงพูด
5. กรอกแบบประเมิน
6. ส่งและตรวจสอบผลใน Dashboard

## 📱 การใช้งาน

### สำหรับพยาบาล/แพทย์

1. **เข้าสู่ระบบ**
   - เปิด https://palliative-care-app.netlify.app/login
   - Login: admin / admin123

2. **เพิ่มผู้ป่วยใหม่**
   - ไปที่ Patient Registry
   - กด "ลงทะเบียนผู้ป่วยใหม่"
   - กรอกข้อมูล → บันทึก

3. **ส่งลิงก์แบบประเมิน**
   - Dashboard → กด "📋 Copy ลิงก์"
   - ส่งลิงก์ให้ผู้ป่วย/ญาติผ่าน LINE

4. **ดูผลการประเมิน**
   - Dashboard → เห็นคะแนนล่าสุด
   - กด "ดู Timeline" → เห็นกราฟและประวัติ

### สำหรับผู้ป่วย/ญาติ

1. **เปิดลิงก์ที่ได้รับ**
   - ต้องเปิดด้วย Chrome/Safari (ไม่ใช่ LINE in-app browser)

2. **ทดสอบเสียง**
   - กด "ทดสอบเสียง" เพื่อฟังเสียงพูด

3. **ทำแบบประเมิน**
   - ฟังคำถาม (เสียงจะอ่านให้ฟัง)
   - เลือกคะแนน 0-10
   - ทำครบ 9 ข้อ

4. **ส่งแบบประเมิน**
   - เขียนข้อความเพิ่มเติม (ถ้ามี)
   - กด "ส่งแบบประเมิน"

## 🔐 User Accounts

Default accounts (ใน Google Sheets):

| Username | Password   | Role  |
|----------|------------|-------|
| admin    | admin123   | admin |
| nurse    | nurse123   | nurse |

## 🌐 URLs

- **Frontend (Production):** https://palliative-care-app.netlify.app
- **Frontend (Dev):** http://localhost:5173
- **Backend API:** https://script.google.com/macros/s/AKfycbxHJUmh_et7Ap948HYfuJsMUdThQfCk98cVna9dEk_1dDSCY86J8y3w51gETzyb06hGMA/exec
- **Apps Script Editor:** https://script.google.com/home/projects/16WNlCuqdyIjkouWegOHdvamX5ODsWYSjIPTGBUMayq4rgZUGyjItyNB8

## 🛠️ Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- Recharts (กราฟ)
- React Router

### Backend
- Google Apps Script
- Google Sheets (Database)
- JWT Authentication

### Deployment
- Netlify (Frontend)
- Google Cloud (Backend)

## 📚 เอกสารเพิ่มเติม

- **DEPLOYMENT_CHECKLIST.md** - คู่มือ Deploy แบบละเอียด
- **คู่มือ-ขั้นตอนต่อไป.txt** - คู่มือฉบับเต็ม (ภาษาไทย)
- **quick-test.js** - Script ทดสอบ Backend

## ⚠️ ข้อควรระวัง

### เสียงพูด (Text-to-Speech)
- ✅ **iOS/Mac:** มีเสียงไทยในตัว
- ⚠️ **Android:** ต้องติดตั้ง Google TTS + ดาวน์โหลดเสียงไทย
- ❌ **LINE in-app browser:** ไม่รองรับ → ต้องเปิดด้วย Chrome

### Apps Script Deployment
- ต้องตั้งค่า "Who has access" เป็น **"Anyone"**
- ถ้าเปลี่ยนเป็น "Anyone with Google account" จะทำให้ ESAS Form ใช้ไม่ได้

### CORS
- Apps Script รองรับ CORS อัตโนมัติ
- ไม่ต้องตั้งค่าเพิ่มเติม

## 🐛 Troubleshooting

### Login ไม่ได้
1. ตรวจสอบ Apps Script deployment
2. ตรวจสอบข้อมูล users ใน Google Sheets
3. รัน `setupSheets()` ใน Apps Script Editor

### ฟอร์มเปิดไม่ได้
1. ตรวจสอบ URL มี `?token=xxx`
2. ตรวจสอบ Apps Script มีไฟล์ `Form.html`
3. รัน `clasp push` ใหม่

### เสียงไม่ทำงาน
1. ตรวจสอบเบราว์เซอร์รองรับ speechSynthesis
2. ตรวจสอบมีเสียงภาษาไทยในเครื่อง
3. เปิดด้วย Chrome/Safari (ไม่ใช่ LINE)

## 📞 Support

หากพบปัญหา:
1. ตรวจสอบ Console (F12) ในเบราว์เซอร์
2. ตรวจสอบ Execution log ใน Apps Script Editor
3. ตรวจสอบข้อมูลใน Google Sheets
4. อ่านเอกสารใน `DEPLOYMENT_CHECKLIST.md`

## 📄 License

MIT License - ใช้งานได้อย่างอิสระ

## 👨‍💻 Developer

Developed for Palliative Care Team

---

**สถานะ:** ✅ ระบบพร้อมใช้งาน 95% - เหลือแค่ตั้งค่า "Anyone" access ใน Apps Script!
