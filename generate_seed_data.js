const xlsx = require('xlsx');
const fs = require('fs');

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
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds).getTime();
}

try {
  const workbook = xlsx.readFile(filePath);
  const result = { wards: [], patients: [], equipments: [], borrow_records: [] };

  // 1. Wards
  const wardsJson = xlsx.utils.sheet_to_json(workbook.Sheets['ข้อมูล Ward ผู้ยืม']);
  wardsJson.forEach(row => {
      if (row['ชื่อ Ward ผู้ยืม']) result.wards.push({ name: row['ชื่อ Ward ผู้ยืม'] });
  });

  // 2. Patients
  const patientsJson = xlsx.utils.sheet_to_json(workbook.Sheets['ลงทะเบียน HN คนไข้'], { header: 1 });
  for (let i = 1; i < patientsJson.length; i++) {
      const row = patientsJson[i];
      if (!row || !row[0]) continue;
      result.patients.push({
          id: row[0].toString(),
          name: row[1] || "",
          caregiverName: row[2] || "",
          caregiverRelation: row[3] || "",
          address: row[4] || "",
          relativePhone: row[5] ? row[5].toString() : "",
          status: row[7] || "Admit"
      });
  }

  // 3. Equipments
  const equipmentsJson = xlsx.utils.sheet_to_json(workbook.Sheets['ข้อมูลรายการเครื่องมือแพทย์'], { header: 1 });
  for (let i = 1; i < equipmentsJson.length; i++) {
      const row = equipmentsJson[i];
      if (!row || !row[0]) continue;
      const rawName = row[0].toString();
      const parts = rawName.split(' ');
      const eqId = parts[0];
      const eqName = parts.slice(1).join(' ') || rawName;
      let currentPatientId = null;
      if (row[2]) currentPatientId = row[2].toString().split(' - ')[0];

      result.equipments.push({
          id: eqId,
          name: eqName,
          status: row[1] === 'ยืม' ? 'ยืม' : 'ว่าง',
          currentPatientId: currentPatientId
      });
  }

  // 4. Borrow Records
  const recordsJson = xlsx.utils.sheet_to_json(workbook.Sheets['ยืม-คืน'], { header: 1 });
  for (let i = 1; i < recordsJson.length; i++) {
      const row = recordsJson[i];
      if (!row || !row[1]) continue;
      
      let timestamp = Date.now();
      if (typeof row[0] === 'number') timestamp = excelDateToJSDate(row[0]);

      let patientId = "Unknown";
      if (row[5]) patientId = row[5].toString().split(' - ')[0];
      
      let eqId = "Unknown", eqName = row[6] || "";
      if (row[6]) eqId = row[6].toString().split(' ')[0];

      result.borrow_records.push({
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
  }

  const fileContent = `export const seedData = ${JSON.stringify(result, null, 2)};`;
  fs.writeFileSync('./frontend/src/seedData.js', fileContent);
  console.log("Seed data generated at frontend/src/seedData.js");

} catch (err) {
  console.error(err);
}
