const xlsx = require('xlsx');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, addDoc } = require('firebase/firestore');

// Firebase config from frontend
const firebaseConfig = {
  apiKey: "AIzaSyCs7t8BDexv6jtgMx0cFOYvaSKV9MUiPuE",
  authDomain: "palliative-care-app-9d6cf.firebaseapp.com",
  projectId: "palliative-care-app-9d6cf",
  storageBucket: "palliative-care-app-9d6cf.firebasestorage.app",
  messagingSenderId: "196085240825",
  appId: "1:196085240825:web:9c2c53fa6683fc3b5ca328"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const filePath = './โค้ด ยืมคืน เครื่องมือแพทย์เก่า/ฐานข้อมูล ยืมคืน เครื่องมือ HHC ระบบ GAS.xlsx';

function excelDateToJSDate(serial) {
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);
  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

async function runImport() {
  console.log("🚀 Starting import process...");
  const workbook = xlsx.readFile(filePath);

  // 1. Import Wards
  console.log("📦 Importing Wards...");
  const wardsSheet = workbook.Sheets['ข้อมูล Ward ผู้ยืม'];
  const wardsJson = xlsx.utils.sheet_to_json(wardsSheet);
  for (const row of wardsJson) {
      const wName = row['ชื่อ Ward ผู้ยืม'];
      if (wName) {
          await addDoc(collection(db, 'wards'), { name: wName });
      }
  }
  console.log("✅ Wards imported!");

  // 2. Import Patients
  console.log("📦 Importing Patients...");
  const patientsSheet = workbook.Sheets['ลงทะเบียน HN คนไข้'];
  const patientsJson = xlsx.utils.sheet_to_json(patientsSheet, { header: 1 });
  let pCount = 0;
  for (let i = 1; i < patientsJson.length; i++) {
      const row = patientsJson[i];
      if (!row || !row[0]) continue;
      const hn = row[0].toString();
      await setDoc(doc(db, 'patients', hn), {
          id: hn,
          name: row[1] || "",
          caregiverName: row[2] || "",
          caregiverRelation: row[3] || "",
          address: row[4] || "",
          relativePhone: row[5] ? row[5].toString() : "",
          status: row[7] || "Admit"
      }, { merge: true }); // Use merge to not overwrite existing Palliative data
      pCount++;
  }
  console.log(`✅ ${pCount} Patients imported!`);

  // 3. Import Equipments
  console.log("📦 Importing Equipments...");
  const equipmentsSheet = workbook.Sheets['ข้อมูลรายการเครื่องมือแพทย์'];
  const equipmentsJson = xlsx.utils.sheet_to_json(equipmentsSheet, { header: 1 });
  let eCount = 0;
  for (let i = 1; i < equipmentsJson.length; i++) {
      const row = equipmentsJson[i];
      if (!row || !row[0]) continue;
      const rawName = row[0].toString();
      // Split "PHON00088 Suction"
      const parts = rawName.split(' ');
      const eqId = parts[0];
      const eqName = parts.slice(1).join(' ') || rawName;
      
      let currentPatientId = null;
      if (row[2]) {
          const ptParts = row[2].toString().split(' - ');
          currentPatientId = ptParts[0];
      }

      await setDoc(doc(db, 'equipments', eqId), {
          name: eqName,
          status: row[1] === 'ยืม' ? 'ยืม' : 'ว่าง',
          currentPatientId: currentPatientId
      });
      eCount++;
  }
  console.log(`✅ ${eCount} Equipments imported!`);

  // 4. Import Borrow Records
  console.log("📦 Importing Borrow Records...");
  const recordsSheet = workbook.Sheets['ยืม-คืน'];
  const recordsJson = xlsx.utils.sheet_to_json(recordsSheet, { header: 1 });
  let rCount = 0;
  for (let i = 1; i < recordsJson.length; i++) {
      const row = recordsJson[i];
      if (!row || !row[1]) continue;
      
      const dateVal = row[0];
      let timestamp = new Date();
      if (typeof dateVal === 'number') {
          timestamp = excelDateToJSDate(dateVal);
      }

      let patientId = "Unknown";
      if (row[5]) {
          patientId = row[5].toString().split(' - ')[0];
      }
      
      let eqId = "Unknown", eqName = row[6] || "";
      if (row[6]) {
          const eqParts = row[6].toString().split(' ');
          eqId = eqParts[0];
      }

      await setDoc(doc(db, 'borrow_records', row[1].toString()), {
          refId: row[1].toString(),
          type: row[2] || "ยืม",
          staff: row[3] || "-",
          ward: row[4] || "-",
          patientId: patientId,
          patientName: row[5] || "-",
          equipmentId: eqId,
          equipmentName: eqName,
          condition: row[7] || "ปกติ",
          note: row[8] || "-",
          deposit: Number(row[9]) || 0,
          photoUrl: row[10] || "",
          timestamp: timestamp
      });
      rCount++;
  }
  console.log(`✅ ${rCount} Borrow Records imported!`);

  console.log("🎉 All data imported successfully!");
  process.exit(0);
}

runImport().catch(err => {
  console.error("❌ Error during import:", err);
  process.exit(1);
});
