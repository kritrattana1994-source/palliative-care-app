const xlsx = require('xlsx');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc } = require('firebase/firestore');

// Firebase config
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

async function updateClinicalStatus() {
  console.log("🚀 Starting clinicalStatus update process...");
  const workbook = xlsx.readFile(filePath);
  
  const patientsSheet = workbook.Sheets['ลงทะเบียน HN คนไข้'];
  const patientsJson = xlsx.utils.sheet_to_json(patientsSheet, { header: 1 });
  
  let pCount = 0;
  for (let i = 1; i < patientsJson.length; i++) {
      const row = patientsJson[i];
      if (!row || !row[0]) continue;
      
      const hn = row[0].toString();
      const oldStatus = row[7] || "Admit";
      
      try {
          await setDoc(doc(db, 'patients', hn), {
              clinicalStatus: oldStatus
          }, { merge: true });
          console.log(`Updated ${hn} to ${oldStatus}`);
          pCount++;
      } catch (err) {
          console.error(`Failed to update ${hn}: ${err.message}`);
      }
  }
  
  console.log(`✅ ${pCount} Patients updated with clinicalStatus!`);
  process.exit(0);
}

updateClinicalStatus();
