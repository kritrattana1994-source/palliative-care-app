import { db, addDoc, collection, serverTimestamp } from './firebase';

/**
 * Write an audit log entry to Firestore
 * @param {object} user - The logged-in user object { uid, name, email }
 * @param {string} action - Action code e.g. 'ADD_PATIENT', 'EDIT_PATIENT'
 * @param {string} module - Module name e.g. 'patients', 'equipment'
 * @param {string} targetId - ID of the affected record
 * @param {string} targetName - Human-readable name of the record
 * @param {string} detail - Extra detail string
 */
export const writeAuditLog = async (user, action, module, targetId = '', targetName = '', detail = '') => {
  try {
    if (!user) return; // Don't log if not authenticated
    await addDoc(collection(db, 'auditLogs'), {
      timestamp: serverTimestamp(),
      userId: user.uid || '',
      userName: user.name || user.displayName || user.email || 'ไม่ระบุ',
      userEmail: user.email || '',
      action,
      module,
      targetId,
      targetName,
      detail,
    });
  } catch (e) {
    // Audit log failure should never break main flow
    console.warn('Audit log failed:', e);
  }
};

// Readable Thai action labels
export const ACTION_LABELS = {
  ADD_PATIENT:      'ลงทะเบียนผู้ป่วยใหม่',
  EDIT_PATIENT:     'แก้ไขข้อมูลผู้ป่วย',
  DELETE_PATIENT:   'ลบผู้ป่วย',
  CHANGE_STATUS:    'เปลี่ยนสถานะทางคลินิก',
  GENERATE_LINK:    'สร้างลิงก์ประเมิน ESAS',
  COPY_LINK:        'คัดลอกลิงก์ประเมิน ESAS',
  ADD_EVENT:        'เพิ่ม Event ใน Timeline',
  ADD_NOTE:         'เพิ่ม Clinical Note',
  BORROW_EQUIPMENT: 'บันทึกการยืมเครื่องมือแพทย์',
  RETURN_EQUIPMENT: 'บันทึกการคืนเครื่องมือแพทย์',
};

export const MODULE_LABELS = {
  patients:   'ผู้ป่วย',
  equipment:  'เครื่องมือแพทย์',
  timeline:   'Timeline',
};
