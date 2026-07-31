const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_FILE = path.join(__dirname, 'data', 'db.json');

// Ensure data folder exists
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

// Default DB Structure
const defaultDb = {
  users: [],
  patients: [],
  assessments: [],
  eventLogs: []
};

// Load database
function loadDb() {
  if (!fs.existsSync(DATA_FILE)) {
    saveDb(defaultDb);
    return defaultDb;
  }
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file, resetting to default:", err.message);
    return defaultDb;
  }
}

// Save database
function saveDb(db) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing database file:", err.message);
  }
}

// Initialize and seed database
async function initDb(forceReset = false) {
  const db = loadDb();
  
  // If database is empty or we force reset, re-seed database with rich details
  if (db.users.length === 0 || forceReset) {
    console.log("Seeding rich database...");
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);
    
    // Clear lists if forceReset is true
    db.users = [{
      id: 'u1',
      username: 'admin',
      passwordHash: passwordHash,
      name: 'พย.วิกานดา (แอดมิน)',
      role: 'admin'
    }];
    
    // Rich patient data with extra details
    db.patients = [
      {
        id: '110022',
        name: 'คุณตา สมชาย ใจดี',
        age: 78,
        gender: 'ชาย',
        disease: 'CA Colon (มะเร็งลำไส้ใหญ่ระยะลุกลาม)',
        relativePhone: '089-123-4567',
        caregiverName: 'นายสมศักดิ์ ใจดี (ลูกชาย)',
        address: '12/3 หมู่ 4 ต.ในเมือง อ.เมือง จ.พิษณุโลก',
        responsibleStaff: 'พย.วิกานดา',
        clinicalNotes: 'ได้รับ Morphine syrup 5mg prn ทุก 4 ชม. สำหรับควบคุมความปวด, ช่วยเหลือตนเองได้น้อยลง',
        status: 'ยังไม่ส่งลิงก์',
        token: 'somchai_token'
      },
      {
        id: '334455',
        name: 'คุณยาย วันดี มีสุข',
        age: 82,
        gender: 'หญิง',
        disease: 'ESRD (ไตวายเรื้อรังระยะสุดท้าย)',
        relativePhone: '081-987-6543',
        caregiverName: 'นางวิภา มีสุข (ลูกสาว)',
        address: '456 ถ.มิตรภาพ ต.วัดจันทร์ อ.เมือง จ.พิษณุโลก',
        responsibleStaff: 'นพ.พีรพล',
        clinicalNotes: 'ปฏิเสธการฟอกไต (Palliative Uremia), ดูแลแบบประคับประคอง เน้นควบคุมความอ่อนเพลียและคลื่นไส้',
        status: 'ส่งแล้ว (รอผล)',
        token: 'wandee_token'
      },
      {
        id: '123456',
        name: 'คุณยาย สมศรี รักดี',
        age: 69,
        gender: 'หญิง',
        disease: 'CA Lung (มะเร็งปอดระยะที่ 4 ลุกลามกระดูก)',
        relativePhone: '085-555-1234',
        caregiverName: 'น.ส.กานดา รักดี (ลูกสาว)',
        address: '88/1 ต.อรัญญิก อ.เมือง จ.พิษณุโลก',
        responsibleStaff: 'พย.วิกานดา',
        clinicalNotes: 'มีประวัติหายใจเหนื่อยหอบ มีออกซิเจนแคนนูลาใช้งานที่บ้าน prn, ได้ Fentanyl patch 25mcg/hr',
        status: 'ประเมินแล้ว',
        token: 'somsri_token'
      },
      {
        id: '998877',
        name: 'คุณลุง บุญมี ศรีสุข',
        age: 72,
        gender: 'ชาย',
        disease: 'CHF (ภาวะหัวใจล้มเหลวเรื้อรัง)',
        relativePhone: '082-333-7788',
        caregiverName: 'นางสมศรี ศรีสุข (ภรรยา)',
        address: '15 ต.ท่าโพธิ์ อ.เมือง จ.พิษณุโลก',
        responsibleStaff: 'นพ.พีรพล',
        clinicalNotes: 'ควบคุมการจำกัดน้ำและอาหารเค็ม, สังเกตอาการบวมที่ขาและอาการเหนื่อยเมื่อนอนราบ',
        status: 'ประเมินแล้ว',
        token: 'boonmee_token'
      },
      {
        id: '556677',
        name: 'คุณป้า สมจิตต์ นามดี',
        age: 65,
        gender: 'หญิง',
        disease: 'CA Breast (มะเร็งเต้านมระยะสุดท้ายลุกลามสมอง)',
        relativePhone: '083-444-5555',
        caregiverName: 'นายมานะ นามดี (สามี)',
        address: '120/5 ต.หัวรอ อ.เมือง จ.พิษณุโลก',
        responsibleStaff: 'พย.วิกานดา',
        clinicalNotes: 'มีอาการปวดศีรษะและคลื่นไส้เป็นระยะ ได้รับ Dexamethasone 4mg oral daily',
        status: 'ยังไม่ส่งลิงก์',
        token: 'somjit_token'
      },
      {
        id: '223344',
        name: 'คุณตา ทวี เกียรติเดช',
        age: 85,
        gender: 'ชาย',
        disease: 'COPD (โรคปอดอุดกั้นเรื้อรังระยะท้าย)',
        relativePhone: '086-777-8888',
        caregiverName: 'นายวิชัย เกียรติเดช (ลูกชาย)',
        address: '9/9 ต.พลายชุมพล อ.เมือง จ.พิษณุโลก',
        responsibleStaff: 'นพ.พีรพล',
        clinicalNotes: 'พ่นยา Bronchodilator สม่ำเสมอ, อ่อนเพลียและเหนื่อยง่ายเมื่อทำกิจวัตรประจำวัน',
        status: 'ส่งแล้ว (รอผล)',
        token: 'tawee_token'
      },
      {
        id: '778899',
        name: 'คุณยาย ประคอง อิ่มเอิบ',
        age: 90,
        gender: 'หญิง',
        disease: 'Dementia (ภาวะสมองเสื่อมระยะรุนแรง ติดเตียง)',
        relativePhone: '087-888-9999',
        caregiverName: 'นางสุดา อิ่มเอิบ (ลูกสะใภ้)',
        address: '54 หมู่ 2 ต.บึงพระ อ.เมือง จ.พิษณุโลก',
        responsibleStaff: 'พย.วิกานดา',
        clinicalNotes: 'ติดเตียงโดยสมบูรณ์ (PPS 20%), ให้อาหารทางสายยาง (NG tube), เฝ้าระวังแผลกดทับที่สะโพก',
        status: 'ประเมินแล้ว',
        token: 'pracong_token'
      },
      {
        id: '889900',
        name: 'คุณลุง ปรีชา เลิศวิไล',
        age: 74,
        gender: 'ชาย',
        disease: 'CA Prostate (มะเร็งต่อมลูกหมากระยะลุกลามกระดูก)',
        relativePhone: '089-999-1111',
        caregiverName: 'นายธีระ เลิศวิไล (ลูกชาย)',
        address: '77 ถ.สิงหวัฒน์ ต.ในเมือง อ.เมือง จ.พิษณุโลก',
        responsibleStaff: 'นพ.พีรพล',
        clinicalNotes: 'คาสายสวนปัสสาวะ (Retained Foley catheter), มีอาการปวดกระดูกหลังและสะโพก ได้รับ Morphine ยาเม็ดควบคุมการปลดปล่อย',
        status: 'ยังไม่ส่งลิงก์',
        token: 'preecha_token'
      },
      {
        id: '445566',
        name: 'คุณยาย นภา พรหมมณี',
        age: 76,
        gender: 'หญิง',
        disease: 'ALS / MND (โรคกล้ามเนื้ออ่อนแรงระยะท้าย)',
        relativePhone: '084-111-2233',
        caregiverName: 'นายวิศรุต พรหมมณี (ลูกชาย)',
        address: '34/12 ต.สมอแข อ.เมือง จ.พิษณุโลก',
        responsibleStaff: 'พย.วิกานดา',
        clinicalNotes: 'กล้ามเนื้อแขนขาอ่อนแรง ติดเตียง (PPS 30%), ให้อาหารทางสายยางปั่นละเอียด (NG Tube), สังเกตการหายใจแผ่วช้าช่วงกลางคืน',
        status: 'ประเมินแล้ว',
        token: 'napha_token'
      },
      {
        id: '667788',
        name: 'คุณลุง สุรชัย ชัยชนะ',
        age: 68,
        gender: 'ชาย',
        disease: 'CA Liver (มะเร็งตับระยะลุกลาม มีภาวะท้องมาน)',
        relativePhone: '081-333-4455',
        caregiverName: 'นางนภา ชัยชนะ (ภรรยา)',
        address: '108 หมู่ 5 ต.บ้านป่า อ.เมือง จ.พิษณุโลก',
        responsibleStaff: 'นพ.พีรพล',
        clinicalNotes: 'มีภาวะท้องมาน (Ascites) แน่นอึดอัดท้อง เจาะระบายน้ำในช่องท้อง prn, ได้รับ Morphine 5mg oral ปรับตามอาการปวด',
        status: 'ประเมินแล้ว',
        token: 'surachai_token'
      },
      {
        id: '112233',
        name: 'คุณตา สำราญ สุขสวัสดิ์',
        age: 81,
        gender: 'ชาย',
        disease: 'Stroke / Bedbound (โรคหลอดเลือดสมองอัมพาตครึ่งซีก ติดเตียง)',
        relativePhone: '086-222-3344',
        caregiverName: 'น.ส.พิมพ์ใจ สุขสวัสดิ์ (หลานสาว)',
        address: '25/8 ต.ในเมือง อ.เมือง จ.พิษณุโลก',
        responsibleStaff: 'พย.วิกานดา',
        clinicalNotes: 'แขนขาซ้ายอ่อนแรง ติดเตียงสมบูรณ์ ทำกายภาพบำบัดป้องกันข้อติด ทายาบรรเทาแผลกดทับที่สะโพก',
        status: 'ส่งแล้ว (รอผล)',
        token: 'samran_token'
      },
      {
        id: '332211',
        name: 'คุณป้า พรเพ็ญ วงษ์สว่าง',
        age: 63,
        gender: 'หญิง',
        disease: 'CA Cervix (มะเร็งปากมดลูกระยะที่ 4 ลุกลามช่องท้อง)',
        relativePhone: '089-444-5566',
        caregiverName: 'นายอุดม วงษ์สว่าง (สามี)',
        address: '99/4 ต.พลายชุมพล อ.เมือง จ.พิษณุโลก',
        responsibleStaff: 'นพ.พีรพล',
        clinicalNotes: 'ควบคุมอาการปวดอุ้งเชิงซ้อนด้วย Fentanyl Patch 50mcg/hr, ทำแผลซึมและเฝ้าระวังภาวะเลือดออกผิดปกติ',
        status: 'ประเมินแล้ว',
        token: 'pornpen_token'
      },
      {
        id: '990011',
        name: 'คุณลุง ณรงค์ เดชะคุณ',
        age: 70,
        gender: 'ชาย',
        disease: 'Parkinson\'s Disease (โรคพาร์กินสันระยะท้าย มีภาวะแข็งเกร็ง)',
        relativePhone: '082-555-6677',
        caregiverName: 'นางสุนีย์ เดชะคุณ (ภรรยา)',
        address: '67 หมู่ 1 ต.วังอิทธิ อ.เมือง จ.พิษณุโลก',
        responsibleStaff: 'พย.วิกานดา',
        clinicalNotes: 'สั่นเกร็งและเคลื่อนไหวช้ามาก รับประทานยา Madopar 250mg ตรงเวลา เฝ้าระวังอาการซึมเศร้าและล้มในบ้าน',
        status: 'ยังไม่ส่งลิงก์',
        token: 'narong_token'
      }
    ];

    // Rich historical assessments
    const today = new Date();
    const formatDate = (daysAgo) => {
      const d = new Date(today);
      d.setDate(today.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };

    db.assessments = [
      // Somsri (CA Lung) assessments
      {
        id: 's1',
        patientId: '123456',
        date: formatDate(3),
        round: '09:00',
        scores: { pain: 6, tiredness: 4, drowsiness: 3, nausea: 1, appetite: 5, shortnessOfBreath: 7, depression: 2, anxiety: 3, wellbeing: 5 },
        notes: 'บ่นปวดหลังเล็กน้อย เริ่มบ่นว่าหายใจไม่ค่อยสะดวกช่วงเช้า'
      },
      {
        id: 's2',
        patientId: '123456',
        date: formatDate(2),
        round: '09:00',
        scores: { pain: 5, tiredness: 5, drowsiness: 3, nausea: 2, appetite: 6, shortnessOfBreath: 8, depression: 3, anxiety: 4, wellbeing: 6 },
        notes: 'ไอเหนื่อยหอบมากขึ้นช่วงตื่นนอน ต้องใช้ออกซิเจนช่วยเปิด 2 ลิตร/นาที'
      },
      {
        id: 's3',
        patientId: '123456',
        date: formatDate(1),
        round: '09:00',
        scores: { pain: 8, tiredness: 5, drowsiness: 3, nausea: 2, appetite: 4, shortnessOfBreath: 9, depression: 3, anxiety: 4, wellbeing: 8 },
        notes: 'มีอาการเหนื่อยหอบมากแม้ตอนนั่งเฉยๆ และปวดกระดูกหลังจนนอนพลิกตัวลำบาก'
      },

      // Boonmee (CHF) assessments
      {
        id: 'b1',
        patientId: '998877',
        date: formatDate(4),
        round: '09:00',
        scores: { pain: 1, tiredness: 6, drowsiness: 2, nausea: 0, appetite: 4, shortnessOfBreath: 6, depression: 2, anxiety: 3, wellbeing: 5 },
        notes: 'คนไข้บ่นอึดอัดแน่นหน้าอก ขาบวมกดบุ๋มเล็กน้อยทั้งสองข้าง'
      },
      {
        id: 'b2',
        patientId: '998877',
        date: formatDate(2),
        round: '09:00',
        scores: { pain: 0, tiredness: 4, drowsiness: 1, nausea: 0, appetite: 3, shortnessOfBreath: 3, depression: 1, anxiety: 2, wellbeing: 4 },
        notes: 'หลังจากจำกัดน้ำและทานยาขับปัสสาวะเพิ่ม อาการเหนื่อยลดลง ขาบวมยุบลง'
      },
      {
        id: 'b3',
        patientId: '998877',
        date: formatDate(1),
        round: '09:00',
        scores: { pain: 0, tiredness: 2, drowsiness: 1, nausea: 0, appetite: 1, shortnessOfBreath: 1, depression: 1, anxiety: 1, wellbeing: 2 },
        notes: 'อาการทั่วไปปกติ หายใจสะดวก นอนราบได้ ไม่มีขาบวม'
      },

      // Pracong (Dementia, bedbound) stable assessments
      {
        id: 'p1',
        patientId: '778899',
        date: formatDate(2),
        round: '09:00',
        scores: { pain: 2, tiredness: 8, drowsiness: 8, nausea: 0, appetite: 7, shortnessOfBreath: 2, depression: 0, anxiety: 0, wellbeing: 6 },
        notes: 'คนไข้ไม่พูดจา สื่อสารไม่ได้ หลับเกือบทั้งวัน ผิวหนังที่ก้นกบเริ่มแดงเล็กน้อย พลิกตัวทุก 2 ชม.'
      },
      {
        id: 'p2',
        patientId: '778899',
        date: formatDate(1),
        round: '09:00',
        scores: { pain: 1, tiredness: 8, drowsiness: 7, nausea: 0, appetite: 6, shortnessOfBreath: 1, depression: 0, anxiety: 0, wellbeing: 5 },
        notes: 'ให้อาหารทางสายยางได้ปกติ ปัสสาวะสีเหลืองใส ผิวที่ก้นกบทายาดีขึ้นแล้ว'
      },

      // Napha (ALS)
      {
        id: 'n1',
        patientId: '445566',
        date: formatDate(2),
        round: '09:00',
        scores: { pain: 2, tiredness: 8, drowsiness: 4, nausea: 0, appetite: 7, shortnessOfBreath: 6, depression: 4, anxiety: 5, wellbeing: 7 },
        notes: 'คนไข้บ่นเหนื่อยหอบช่วงดึก เสลดติดคอ กลืนอาหารปั่นช้าลง'
      },

      // Surachai (CA Liver)
      {
        id: 'su1',
        patientId: '667788',
        date: formatDate(1),
        round: '09:00',
        scores: { pain: 7, tiredness: 6, drowsiness: 3, nausea: 5, appetite: 8, shortnessOfBreath: 4, depression: 3, anxiety: 4, wellbeing: 7 },
        notes: 'ปวดแน่นใต้ชายโครงขวา อึดอัดแน่นท้องจากน้ำในช่องท้อง ทานอาหารได้น้อยมาก'
      },

      // Pornpen (CA Cervix)
      {
        id: 'pp1',
        patientId: '332211',
        date: formatDate(1),
        round: '09:00',
        scores: { pain: 6, tiredness: 5, drowsiness: 2, nausea: 2, appetite: 4, shortnessOfBreath: 2, depression: 5, anxiety: 6, wellbeing: 6 },
        notes: 'ปวดร่วงก้นกบและอุ้งเชิงซ้อน ตื่นตกใจง่าย กลัวอาการเลือดซ้ำ'
      }
    ];

    // Seed rich event logs for timeline tracking
    db.eventLogs = [
      // Somsri (123456)
      {
        id: 'e1',
        patientId: '123456',
        category: 'deterioration',
        title: 'อาการทรุด/เปลี่ยนแปลง',
        date: formatDate(3),
        time: '09:00 น.',
        content: 'ผลประเมิน ESAS ประจำวัน: อาการเหนื่อยล้าเพิ่มขึ้นจากระดับ 5 เป็น 8 ซึมเศร้าระดับ 6',
        recordedBy: 'ระบบอัตโนมัติ (LINE)'
      },
      {
        id: 'e2',
        patientId: '123456',
        category: 'medication',
        title: 'ปรับยา/ให้ยาฉุกเฉิน',
        date: formatDate(1),
        time: '20:15 น.',
        content: 'คนไข้ปวดรุนแรงระดับ 8 (จากฟอร์ม ESAS) โทรแจ้งญาติให้ PRN Morphine syrup 2.5mg อาการปวดลดลง',
        recordedBy: 'พย. สมชาย'
      },
      {
        id: 'e3',
        patientId: '123456',
        category: 'call',
        title: 'ญาติโทรปรึกษา',
        date: 'วันนี้',
        time: '10:30 น.',
        content: 'ญาติแจ้งว่าคุณยายหายใจเสียงดัง มีเสมหะ แนะนำวิธี Suction เบื้องต้นและจัดท่านอนตะแคง',
        recordedBy: 'พย. สมหญิง'
      },
      {
        id: 'e4',
        patientId: '123456',
        category: 'visit',
        title: 'เยี่ยมบ้าน / ตรวจประเมิน',
        date: formatDate(5),
        time: '14:00 น.',
        content: 'พยาบาลเข้าเยี่ยมบ้าน พบสภาพแวดล้อมที่บ้านสะอาดดี ปอดมีเสียง Crepitation บ้าง ได้ทบทวนวิธีการใช้ถังออกซิเจนกับญาติ',
        recordedBy: 'พย. วิภารัตน์'
      },
      {
        id: 'e5',
        patientId: '123456',
        category: 'other',
        title: 'อื่น ๆ',
        date: formatDate(7),
        time: '11:00 น.',
        content: 'จัดส่งออกซิเจนถังสำรองขนาด 10 ลิตรไปที่บ้านคนไข้เรียบร้อย',
        recordedBy: 'นายสมบัติ (พนักงานจัดส่ง)'
      },

      // Somchai (110022)
      {
        id: 'e6',
        patientId: '110022',
        category: 'visit',
        title: 'เยี่ยมบ้าน / ตรวจประเมิน',
        date: formatDate(4),
        time: '10:00 น.',
        content: 'แพทย์และพยาบาลเข้าเยี่ยมบ้าน ตรวจสัญญาณชีพปกติ แนะนำเรื่องการนวดหน้าท้องลดอาการท้องอืด',
        recordedBy: 'นพ.พีรพล'
      },
      {
        id: 'e7',
        patientId: '110022',
        category: 'call',
        title: 'ญาติโทรปรึกษา',
        date: formatDate(2),
        time: '15:30 น.',
        content: 'ญาติแจ้งว่าคนไข้ถ่ายดำ 1 ครั้ง แนะนำให้สังเกตอาการใกล้ชิด หากมีอ่อนเพลีย วิงเวียน หรือถ่ายเป็นเลือดให้โทรแจ้งทันที',
        recordedBy: 'พย.วิกานดา'
      },

      // Boonmee (998877)
      {
        id: 'e8',
        patientId: '998877',
        category: 'medication',
        title: 'ปรับยา/ให้ยาฉุกเฉิน',
        date: formatDate(3),
        time: '10:00 น.',
        content: 'โทรติดตามผลเนื่องจากขาบวม แพทย์สั่งเพิ่มยา Lasix 40mg 1 tab oral daily เป็นเวลา 3 วัน และสังเกตปริมาณปัสสาวะ',
        recordedBy: 'พย.วิกานดา'
      },
      {
        id: 'e9',
        patientId: '998877',
        category: 'visit',
        title: 'เยี่ยมบ้าน / ตรวจประเมิน',
        date: formatDate(6),
        time: '11:00 น.',
        content: 'เข้าเยี่ยมบ้านเพื่อตรวจสัญญาณชีพ ปอดไม่มีเสียง Crepitation ขาบวมยุบดีหลังปรับยา ช่วยสอนญาติเรื่องการจำกัดปริมาณน้ำดื่ม',
        recordedBy: 'พย.วิกานดา'
      },

      // Napha ALS (445566)
      {
        id: 'e10',
        patientId: '445566',
        category: 'call',
        title: 'ญาติโทรปรึกษา',
        date: formatDate(2),
        time: '21:00 น.',
        content: 'ญาติโทรแจ้งว่าคนไข้มีเสมหะในคอ หายใจครืดคราด แนะนำวิธีดูดเสมหะเบื้องต้นและจัดท่านอนศีรษะสูง 45 องศา',
        recordedBy: 'พย.วิกานดา'
      },

      // Surachai CA Liver (667788)
      {
        id: 'e11',
        patientId: '667788',
        category: 'medication',
        title: 'ปรับยา/ให้ยาฉุกเฉิน',
        date: formatDate(1),
        time: '14:30 น.',
        content: 'คนไข้บ่นปวดแน่นท้องมากจากภาวะท้องมาน แพทย์พิจารณาสั่งเจาะระบายน้ำในช่องท้องวันพรุ่งนี้ และปรับให้ Morphine syrup 5mg oral prn ทุก 4 ชม.',
        recordedBy: 'นพ.พีรพล'
      },

      // Samran Stroke (112233)
      {
        id: 'e12',
        patientId: '112233',
        category: 'visit',
        title: 'เยี่ยมบ้าน / ตรวจประเมิน',
        date: formatDate(4),
        time: '09:30 น.',
        content: 'ทีมพยาบาลเยี่ยมบ้าน ตรวจแผลกดทับที่ก้นกบ พบแผลแห้งดีขึ้นมาก ไม่มีสิ่งส่งตรวจติดเชื้อ สอนญาติทำกายภาพบำบัดข้อยึดติด',
        recordedBy: 'พย.วิกานดา'
      },

      // Pornpen CA Cervix (332211)
      {
        id: 'e13',
        patientId: '332211',
        category: 'deterioration',
        title: 'อาการทรุด/เปลี่ยนแปลง',
        date: formatDate(1),
        time: '16:00 น.',
        content: 'คนไข้มีอาการปวดร้าวบริเวณอุ้งเชิงซ้อนเพิ่มขึ้น คะแนน ESAS ปวดเพิ่มเป็น 6 คะแนน ญาติได้รับคำแนะนำเรื่องการเปลี่ยนแผ่น Fentanyl Patch',
        recordedBy: 'นพ.พีรพล'
      },

      // Narong Parkinson (990011)
      {
        id: 'e14',
        patientId: '990011',
        category: 'visit',
        title: 'เยี่ยมบ้าน / ตรวจประเมิน',
        date: formatDate(7),
        time: '10:00 น.',
        content: 'เข้าเยี่ยมบ้านประเมินความปลอดภัยในการเดิน เสนอแนะญาติให้ติดตั้งราวจับในห้องน้ำและถอดพรมกันลื่นเพื่อป้องกันการล้ม',
        recordedBy: 'พย.วิกานดา'
      },

      // Extra Timeline Event Logs for Somsri (123456)
      {
        id: 'e15',
        patientId: '123456',
        category: 'medication',
        title: 'ปรับยา/ให้ยาฉุกเฉิน',
        date: formatDate(8),
        time: '16:45 น.',
        content: 'คนไข้บ่นท้องผูก 3 วันจากการใช้ยาแก้ปวด Morphine แพทย์สั่งจ่ายยาระบาย Senokot 2 เม็ดก่อนนอน และให้ญาติเน้นจิบน้ำอุ่น',
        recordedBy: 'นพ.พีรพล'
      },
      {
        id: 'e16',
        patientId: '123456',
        category: 'other',
        title: 'อื่น ๆ',
        date: formatDate(10),
        time: '13:00 น.',
        content: 'จัดส่งเตียงลมป้องกันแผลกดทับและชุดทำแผลปลอดเชื้อไปที่บ้านคนไข้เรียบร้อยแล้ว',
        recordedBy: 'นายสมบัติ (พนักงานจัดส่ง)'
      },
      {
        id: 'e17',
        patientId: '123456',
        category: 'call',
        title: 'ญาติโทรปรึกษา',
        date: formatDate(12),
        time: '08:30 น.',
        content: 'ลูกสาวโทรสอบถามวิธีเช็ดทำความสะอาดสาย Oxygen Cannula และการปรับระดับการไหลของออกซิเจนเมื่อคนไข้เริ่มไอเหนื่อย',
        recordedBy: 'พย.วิกานดา'
      },
      {
        id: 'e18',
        patientId: '123456',
        category: 'visit',
        title: 'เยี่ยมบ้าน / ตรวจประเมิน',
        date: formatDate(14),
        time: '11:15 น.',
        content: 'ทีมพยาบาล Palliative Care เข้าเยี่ยมบ้านครั้งแรก ประเมินระดับความปวดกระดูกหลัง (PPS 40%) สอนญาติเรื่องการจัดท่านอนตะแคงและนวดผ่อนคลาย',
        recordedBy: 'พย.วิกานดา'
      },

      // Extra Timeline Event Logs for Surachai (667788)
      {
        id: 'e19',
        patientId: '667788',
        category: 'visit',
        title: 'เยี่ยมบ้าน / ตรวจประเมิน',
        date: formatDate(3),
        time: '10:30 น.',
        content: 'เข้าเยี่ยมบ้านตรวจวัดเส้นรอบท้อง (Abdominal girth 94 cm) สังเกตอาการตาเหลืองตัวเหลือง (Jaundice) วัด SpO2 97% สัญญาณชีพเสถียร',
        recordedBy: 'พย.วิกานดา'
      },
      {
        id: 'e20',
        patientId: '667788',
        category: 'call',
        title: 'ญาติโทรปรึกษา',
        date: formatDate(5),
        time: '19:20 น.',
        content: 'ภรรยาโทรแจ้งว่าคนไข้บ่นเบื่ออาหาร คลื่นไส้หลังจิบน้ำซุป แนะนำให้รับประทานยา Domperidone 10mg ก่อนอาหาร 15 นาที',
        recordedBy: 'พย.สมชาย'
      },

      // Extra Timeline Event Logs for Napha (445566)
      {
        id: 'e21',
        patientId: '445566',
        category: 'medication',
        title: 'ปรับยา/ให้ยาฉุกเฉิน',
        date: formatDate(4),
        time: '11:00 น.',
        content: 'แพทย์พิจารณาปรับเปลี่ยนสูตรอาหารปั่นเป็นสูตรกากใยสูงเพื่อลดภาวะท้องอืด และสั่งพ่นยาขยายหลอดลม Berodual MDI ผ่านด้าม Spacers',
        recordedBy: 'นพ.พีรพล'
      },
      {
        id: 'e22',
        patientId: '445566',
        category: 'other',
        title: 'อื่น ๆ',
        date: formatDate(9),
        time: '15:00 น.',
        content: 'จัดส่งเครื่องดูดเสมหะ (Suction machine) พร้อมสายดูดเสมหะปราศจากเชื้อ 20 เส้นไปให้ญาติใช้งานที่บ้าน',
        recordedBy: 'พย.วิกานดา'
      }
    ];

    saveDb(db);
    console.log("Rich Database seeded and initialized.");
  }
}

module.exports = {
  loadDb,
  saveDb,
  initDb
};
