# 🚀 Palliative Care App - Deployment Checklist

## ✅ สถานะปัจจุบัน (Current Status)

### ส่วนที่เสร็จแล้ว (Completed)
- ✅ Frontend code พร้อมใช้งาน (React + Vite + Tailwind)
- ✅ Backend API พร้อม (Google Apps Script)
- ✅ ESAS Form พร้อมเสียงไทย (speechSynthesis)
- ✅ Frontend config เปลี่ยนเป็น production mode แล้ว
- ✅ Apps Script URL configured
- ✅ Netlify deployment ready

### ⚠️ สิ่งที่ต้องทำต่อ (Next Steps)

## 📋 ขั้นตอนการ Deploy (Step-by-Step)

### STEP 1: ตรวจสอบ Apps Script Deployment
**สถานะ:** ⚠️ ต้องตรวจสอบ

1. เปิด [Google Apps Script](https://script.google.com)
2. เปิดโปรเจค Script ID: `16WNlCuqdyIjkouWegOHdvamX5ODsWYSjIPTGBUMayq4rgZUGyjItyNB8`
3. คลิก **Deploy** → **Manage deployments**
4. ตรวจสอบ deployment ที่ active:
   - ✅ **Execute as:** Me (your-email@gmail.com)
   - ⚠️ **Who has access:** ต้องเป็น **"Anyone"** (ไม่ใช่ "Anyone with Google account")
5. ถ้ายังไม่ใช่ "Anyone":
   - คลิก **Edit** (ไอคอนดินสอ)
   - เปลี่ยน **Who has access** → **Anyone**
   - คลิก **Deploy**
6. ✅ URL ควรเป็น: `https://script.google.com/macros/s/AKfycbxHJUmh_et7Ap948HYfuJsMUdThQfCk98cVna9dEk_1dDSCY86J8y3w51gETzyb06hGMA/exec`

---

### STEP 2: ทดสอบ Backend API
**สถานะ:** ⚠️ ต้องทดสอบ

เปิด Terminal และรันคำสั่ง:

```bash
# Test 1: ทดสอบ Login API
curl -X POST "https://script.google.com/macros/s/AKfycbxHJUmh_et7Ap948HYfuJsMUdThQfCk98cVna9dEk_1dDSCY86J8y3w51gETzyb06hGMA/exec?path=login" ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```

**ผลลัพธ์ที่คาดหวัง:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

**ถ้าเจอ Error:**
- ❌ "Script function not found: doPost" → ต้อง push code ใหม่
- ❌ "Authorization required" → ต้องเปลี่ยน access เป็น "Anyone"
- ❌ "Timeout" → ลอง refresh และทดสอบอีกครั้ง

---

### STEP 3: ทดสอบ Frontend (Local)
**สถานะ:** ⚠️ ต้องทดสอบ

```bash
# เปิด Terminal
cd C:\Users\mark4\VS Code\palliative-care-app\frontend

# รัน dev server
npm run dev
```

1. เปิดเบราว์เซอร์: http://localhost:5173/login
2. Login ด้วย:
   - Username: `admin`
   - Password: `admin123`
3. ✅ ต้องเข้าสู่ Dashboard ได้
4. ✅ ต้องเห็นรายชื่อผู้ป่วย (ถ้ามีข้อมูลใน Google Sheets)
5. ทดสอบ Copy ลิงก์ ESAS Form
6. เปิดลิงก์ในแท็บใหม่ → ต้องเห็นฟอร์ม ESAS

**ถ้าเจอ Error:**
- ❌ "Failed to fetch" → ตรวจสอบ Apps Script URL
- ❌ "Invalid credentials" → ตรวจสอบข้อมูล users ใน Google Sheets
- ❌ "CORS error" → ตรวจสอบ Apps Script deployment access

---

### STEP 4: Build และ Deploy Frontend
**สถานะ:** ⚠️ ต้อง deploy

```bash
# Build production
cd C:\Users\mark4\VS Code\palliative-care-app\frontend
npm run build

# ตรวจสอบ dist folder
dir dist
```

**Deploy ไปยัง Netlify:**

**Option A: Auto Deploy (แนะนำ)**
```bash
# Push to GitHub (Netlify จะ auto-deploy)
git add .
git commit -m "Switch to production mode - Apps Script backend"
git push origin main
```

**Option B: Manual Deploy**
1. เปิด [Netlify Dashboard](https://app.netlify.com)
2. เลือกไซต์ `palliative-care-app`
3. ลาก folder `frontend/dist` ไปวางใน Deploys
4. รอ deploy เสร็จ (~30 วินาที)

---

### STEP 5: ทดสอบ Production
**สถานะ:** ⚠️ ต้องทดสอบ

1. เปิด https://palliative-care-app.netlify.app/login
2. Login ด้วย admin/admin123
3. ✅ ต้องเข้า Dashboard ได้
4. ✅ ทดสอบเพิ่มผู้ป่วยใหม่
5. ✅ ทดสอบ Copy ลิงก์และเปิดฟอร์ม ESAS
6. ✅ ทดสอบกรอกฟอร์มและส่ง
7. ✅ กลับมาดูผลใน Dashboard

---

## 🔧 Troubleshooting Guide

### ปัญหา: Login ไม่ได้
**สาเหตุ:**
- Apps Script ยังไม่ deploy หรือ access ไม่ใช่ "Anyone"
- Google Sheets ไม่มีข้อมูล users

**วิธีแก้:**
1. ตรวจสอบ Apps Script deployment (STEP 1)
2. เปิด Google Sheets → แท็บ `users` → ต้องมีข้อมูล:
   ```
   username | password_hash | role
   admin    | $2a$10$...   | admin
   nurse    | $2a$10$...   | nurse
   ```
3. ถ้าไม่มี → รัน `setupSheets()` ใน Apps Script Editor

---

### ปัญหา: ฟอร์ม ESAS เปิดไม่ได้
**สาเหตุ:**
- Token ไม่ถูกต้อง
- Apps Script ไม่ได้ deploy Form.html

**วิธีแก้:**
1. ตรวจสอบ URL ต้องมี `?token=xxx`
2. ตรวจสอบใน Apps Script Editor → ต้องมีไฟล์ `Form.html`
3. ถ้าไม่มี → รัน `clasp push` ใหม่

---

### ปัญหา: เสียงพูดไม่ทำงาน
**สาเหตุ:**
- เบราว์เซอร์ไม่รองรับ speechSynthesis
- ไม่มีเสียงภาษาไทยในเครื่อง

**วิธีแก้:**
- ✅ **iOS/Mac:** มีเสียงไทยในตัว
- ⚠️ **Android:** ต้องติดตั้ง Google TTS + ดาวน์โหลดเสียงไทย
- ❌ **LINE in-app browser:** ไม่รองรับ → ต้องเปิดด้วย Chrome/Safari

---

## 📊 System Architecture

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

---

## 🎯 Quick Commands

### Development
```bash
# รัน frontend (dev mode)
cd frontend && npm run dev

# Push Apps Script
cd apps-script && clasp push

# Deploy Apps Script
cd apps-script && clasp deploy
```

### Production
```bash
# Build frontend
cd frontend && npm run build

# Deploy to Netlify (auto)
git add . && git commit -m "Update" && git push origin main
```

### Testing
```bash
# Test API
node test_api.js

# Test frontend
node test_frontend.js
```

---

## 📞 Support

**ถ้าติดปัญหา:**
1. ตรวจสอบ Console (F12) ในเบราว์เซอร์
2. ตรวจสอบ Execution log ใน Apps Script Editor
3. ตรวจสอบข้อมูลใน Google Sheets
4. อ่าน `คู่มือ-ขั้นตอนต่อไป.txt` (คู่มือฉบับเต็ม)

---

## ✅ Final Checklist

- [ ] Apps Script deployed with "Anyone" access
- [ ] Backend API tested (login works)
- [ ] Frontend tested locally (localhost:5173)
- [ ] Frontend built (npm run build)
- [ ] Frontend deployed to Netlify
- [ ] Production tested (netlify.app)
- [ ] ESAS Form tested on mobile
- [ ] Data saved to Google Sheets
- [ ] Timeline and graphs working
- [ ] AI Summary working (if enabled)

**เมื่อทำครบทุกข้อ → ระบบพร้อมใช้งาน 100%! 🎉**
