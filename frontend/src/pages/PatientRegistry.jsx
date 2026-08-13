import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, AlertCircle, Users, X, UserPlus, Search, Check,
  Phone, MapPin, HeartHandshake, FileText, Pencil, Filter,
  Download, ChevronDown, RefreshCw, ClipboardList, Stethoscope
} from 'lucide-react';
import { db, collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot } from '../services/firebase';
import { v4 as uuidv4 } from 'uuid'; // Need to install uuid if not already, or use simple math random for tokens
// Generate a short 6-character alphanumeric token
const generateToken = () => Math.random().toString(36).substring(2, 8).toUpperCase();


const STATUS_OPTIONS = ['ยังไม่ส่งลิงก์', 'ส่งแล้ว (รอผล)', 'ประเมินแล้ว', 'จำหน่ายแล้ว'];

const STATUS_CONFIG = {
  'ยังไม่ส่งลิงก์':  { color: 'bg-slate-100 text-slate-600 border-slate-200',   dot: 'bg-slate-400' },
  'ส่งแล้ว (รอผล)':  { color: 'bg-amber-50 text-amber-700 border-amber-200',     dot: 'bg-amber-500' },
  'ประเมินแล้ว':      { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  'จำหน่ายแล้ว':     { color: 'bg-blue-50 text-blue-700 border-blue-200',        dot: 'bg-blue-500' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['ยังไม่ส่งลิงก์'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {status || 'ยังไม่ส่งลิงก์'}
    </span>
  );
}

const STAFF_OPTIONS = ['พย.วิกานดา', 'นพ.พีรพล', 'พย.กรรณิการ์'];

export default function PatientRegistry({ token }) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ทั้งหมด');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [notesTarget, setNotesTarget] = useState(null);
  const [generatingLink, setGeneratingLink] = useState('');

  // Add Form State
  const [hn, setHn] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('ชาย');
  const [disease, setDisease] = useState('');
  const [relativePhone, setRelativePhone] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [address, setAddress] = useState('');
  const [responsibleStaff, setResponsibleStaff] = useState('พย.วิกานดา');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

  // ---- FETCH PATIENTS (REALTIME) ----
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'patients'), (snapshot) => {
        const patientsData = [];
        snapshot.forEach((doc) => {
            patientsData.push({ id: doc.id, ...doc.data() });
        });
        setPatients(patientsData);
        setLoading(false);
    }, (err) => {
        setError(err.message || 'ไม่สามารถโหลดข้อมูลรายชื่อผู้ป่วยได้');
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ---- ADD PATIENT ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const patientId = hn.trim();
      await setDoc(doc(db, 'patients', patientId), {
        name: name.trim(), age: age ? Number(age) : '',
        gender, disease: disease.trim(), relativePhone: relativePhone.trim(),
        caregiverName: caregiverName.trim(), address: address.trim(),
        responsibleStaff, clinicalNotes: clinicalNotes.trim(),
        status: 'ยังไม่ส่งลิงก์',
        createdAt: new Date().toISOString()
      });
      showSuccess(`ลงทะเบียนผู้ป่วย ${name} (HN: ${patientId}) เรียบร้อยแล้ว`);
      setHn(''); setName(''); setAge(''); setGender('ชาย'); setDisease('');
      setRelativePhone(''); setCaregiverName(''); setAddress('');
      setResponsibleStaff('พย.วิกานดา'); setClinicalNotes('');
      setShowAddForm(false);
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- EDIT PATIENT ----
  const openEdit = (p) => {
    setEditTarget(p);
    setEditForm({
      name: p.name || '', age: p.age || '', gender: p.gender || 'ชาย',
      disease: p.disease || '', relativePhone: p.relativePhone || '',
      caregiverName: p.caregiverName || '', address: p.address || '',
      responsibleStaff: p.responsibleStaff || 'พย.วิกานดา',
      clinicalNotes: p.clinicalNotes || '', status: p.status || 'ยังไม่ส่งลิงก์',
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditSubmitting(true);
    setError('');
    try {
      await updateDoc(doc(db, 'patients', editTarget.id), editForm);
      showSuccess(`แก้ไขข้อมูลผู้ป่วย ${editForm.name} เรียบร้อยแล้ว`);
      setEditTarget(null);
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ---- CHANGE STATUS INLINE ----
  const handleStatusChange = async (patientId, newStatus) => {
    try {
      await updateDoc(doc(db, 'patients', patientId), { status: newStatus });
      showSuccess('อัพเดตสถานะเรียบร้อยแล้ว');
    } catch (err) {
      setError(err.message || 'ไม่สามารถอัพเดตสถานะได้');
    }
  };

  // ---- GENERATE LINK ----
  const handleGenerateLink = async (p) => {
    setGeneratingLink(p.id);
    try {
      let token = p.token;
      if (!token) {
          token = generateToken();
          await updateDoc(doc(db, 'patients', p.id), { token: token, status: 'ส่งแล้ว (รอผล)' });
      } else {
          await updateDoc(doc(db, 'patients', p.id), { status: 'ส่งแล้ว (รอผล)' });
      }
      
      const link = `${window.location.origin}/assess/${token}`;
      await navigator.clipboard.writeText(link);
      showSuccess(`คัดลอกลิงก์สำหรับ ${p.name} แล้ว! (${link})`);
    } catch (err) {
      setError(err.message || 'ไม่สามารถสร้างลิงก์ได้');
    } finally {
      setGeneratingLink('');
    }
  };

  // ---- DELETE ----
  const handleDelete = async (id, patientName) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลผู้ป่วย "${patientName}" (HN: ${id}) ออกจากระบบ?`)) return;
    try {
      await deleteDoc(doc(db, 'patients', id));
      showSuccess('ลบข้อมูลผู้ป่วยเรียบร้อยแล้ว');
    } catch (err) {
      setError(err.message || 'ไม่สามารถลบข้อมูลผู้ป่วยได้');
    }
  };

  // ---- EXPORT CSV ----
  const handleExportCSV = () => {
    const headers = ['HN', 'ชื่อ-นามสกุล', 'อายุ', 'เพศ', 'การวินิจฉัย', 'ผู้ดูแล', 'เบอร์โทร', 'ที่อยู่', 'พยาบาลผู้ดูแล', 'สถานะ'];
    const rows = filteredPatients.map(p => [
      p.id, p.name, p.age, p.gender, p.disease,
      p.caregiverName, p.relativePhone, p.address, p.responsibleStaff, p.status
    ].map(v => `"${String(v || '').replace(/"/g, '""')}"`));
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patient_registry_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('ดาวน์โหลด CSV เรียบร้อยแล้ว');
  };

  const safePatients = Array.isArray(patients) ? patients : [];

  const filteredPatients = safePatients.filter(p => {
    if (!p) return false;
    const q = search.toLowerCase();
    const matchSearch = (
      String(p.name || '').toLowerCase().includes(q) ||
      String(p.id || p.HN || '').includes(q) ||
      String(p.disease || '').toLowerCase().includes(q) ||
      String(p.relativePhone || '').includes(q)
    );
    const matchStatus = filterStatus === 'ทั้งหมด' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusCounts = safePatients.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  // ============================================================
  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-10 flex flex-wrap justify-between items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">ทะเบียนผู้ป่วยประคับประคอง</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-200">D/C Home Ward</span>
          </div>
          <p className="text-sm text-slate-500 font-medium mt-1">
            จัดการฐานข้อมูลผู้ป่วย ({safePatients.length} ราย)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Refresh is less necessary with realtime, but leaving for UX */}
          <button onClick={() => {}} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all cursor-pointer border border-slate-200">
            <RefreshCw className="w-4 h-4" /> Realtime Active
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all cursor-pointer">
            <UserPlus className="w-5 h-5" /><span>ลงทะเบียนผู้ป่วยใหม่</span>
          </button>
        </div>
      </header>

      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-5">

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-sm text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
            <span className="font-bold">{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-sm text-emerald-800">
            <Check className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
            <span className="font-bold">{successMsg}</span>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {['ทั้งหมด', ...STATUS_OPTIONS].map(s => {
            const count = s === 'ทั้งหมด' ? safePatients.length : (statusCounts[s] || 0);
            const isActive = filterStatus === s;
            const cfg = STATUS_CONFIG[s];
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}>
                {cfg && !isActive && <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />}
                {s}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-black ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Add Patient Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-emerald-50/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold"><UserPlus className="w-5 h-5" /></div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">ลงทะเบียนผู้ป่วยใหม่ (Home Ward)</h3>
                    <p className="text-xs text-slate-500 font-medium">กรอกข้อมูลผู้ป่วยและญาติผู้ดูแล</p>
                  </div>
                </div>
                <button onClick={() => setShowAddForm(false)} className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5 max-h-[80vh] overflow-y-auto">
                {/* Section 1 */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider pb-1 border-b border-emerald-100">1. ข้อมูลผู้ป่วยและประวัติ</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">หมายเลข HN <span className="text-red-500">*</span></label>
                      <input type="text" value={hn} onChange={e => setHn(e.target.value)} placeholder="เช่น 670123" required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 hover:bg-white" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="เช่น นายบุญมี ใจดี" required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 hover:bg-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">อายุ (ปี) <span className="text-red-500">*</span></label>
                      <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="เช่น 72" required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 hover:bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">เพศ <span className="text-red-500">*</span></label>
                      <select value={gender} onChange={e => setGender(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="ชาย">ชาย</option><option value="หญิง">หญิง</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">การวินิจฉัย <span className="text-red-500">*</span></label>
                      <input type="text" value={disease} onChange={e => setDisease(e.target.value)} placeholder="เช่น CA Lung Stage 4" required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 hover:bg-white" />
                    </div>
                  </div>
                </div>
                {/* Section 2 */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider pb-1 border-b border-emerald-100">2. ญาติผู้ดูแลและเบอร์ติดต่อ</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อญาติผู้ดูแลหลัก <span className="text-red-500">*</span></label>
                      <input type="text" value={caregiverName} onChange={e => setCaregiverName(e.target.value)} placeholder="เช่น นางสมศรี (บุตรสาว)" required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 hover:bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
                      <input type="text" value={relativePhone} onChange={e => setRelativePhone(e.target.value)} placeholder="เช่น 081-234-5678" required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 hover:bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">ที่อยู่ผู้ป่วย <span className="text-red-500">*</span></label>
                    <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="เช่น 123 ม.4 ต.เมืองพล อ.พล จ.ขอนแก่น" rows={2} required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 hover:bg-white" />
                  </div>
                </div>
                {/* Section 3 */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider pb-1 border-b border-emerald-100">3. เจ้าหน้าที่รับผิดชอบและแผนการดูแล</h4>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">พยาบาล / แพทย์ผู้ดูแล</label>
                    <select value={responsibleStaff} onChange={e => setResponsibleStaff(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      {STAFF_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">แผนการดูแล / ยาสำคัญ (Clinical Notes)</label>
                    <textarea value={clinicalNotes} onChange={e => setClinicalNotes(e.target.value)} placeholder="เช่น Morphine syrup 10mg q 4 hr prn pain, On O2 cannula 3 LPM" rows={2} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 hover:bg-white" />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button type="button" onClick={() => setShowAddForm(false)} className="px-5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">ยกเลิก</button>
                  <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                    {submitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>กำลังบันทึก...</span></> : <><Check className="w-4 h-4" /><span>บันทึกและสร้างรหัสผู้ป่วย</span></>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Patient Modal */}
        {editTarget && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-amber-50/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center"><Pencil className="w-5 h-5" /></div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">แก้ไขข้อมูลผู้ป่วย</h3>
                    <p className="text-xs text-slate-500 font-medium">HN: {editTarget.id} — {editTarget.name}</p>
                  </div>
                </div>
                <button onClick={() => setEditTarget(null)} className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 cursor-pointer"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                    <input type="text" required value={editForm.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">อายุ (ปี)</label>
                    <input type="number" value={editForm.age} onChange={e => setEditForm(f => ({...f, age: e.target.value}))} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">เพศ</label>
                    <select value={editForm.gender} onChange={e => setEditForm(f => ({...f, gender: e.target.value}))} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500">
                      <option value="ชาย">ชาย</option><option value="หญิง">หญิง</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">การวินิจฉัยโรค</label>
                    <input type="text" value={editForm.disease} onChange={e => setEditForm(f => ({...f, disease: e.target.value}))} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อญาติผู้ดูแล</label>
                    <input type="text" value={editForm.caregiverName} onChange={e => setEditForm(f => ({...f, caregiverName: e.target.value}))} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">เบอร์โทรศัพท์</label>
                    <input type="text" value={editForm.relativePhone} onChange={e => setEditForm(f => ({...f, relativePhone: e.target.value}))} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">ที่อยู่</label>
                    <textarea value={editForm.address} onChange={e => setEditForm(f => ({...f, address: e.target.value}))} rows={2} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">พยาบาล / แพทย์ผู้ดูแล</label>
                    <select value={editForm.responsibleStaff} onChange={e => setEditForm(f => ({...f, responsibleStaff: e.target.value}))} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500">
                      {STAFF_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">สถานะ</label>
                    <select value={editForm.status} onChange={e => setEditForm(f => ({...f, status: e.target.value}))} className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500">
                      {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Clinical Notes</label>
                    <textarea value={editForm.clinicalNotes} onChange={e => setEditForm(f => ({...f, clinicalNotes: e.target.value}))} rows={3} placeholder="ยา แผนการรักษา หรือข้อมูลสำคัญทางการแพทย์..." className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button type="button" onClick={() => setEditTarget(null)} className="px-5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">ยกเลิก</button>
                  <button type="submit" disabled={editSubmitting} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                    {editSubmitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>กำลังบันทึก...</span></> : <><Check className="w-4 h-4" /><span>บันทึกการแก้ไข</span></>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Clinical Notes Modal */}
        {notesTarget && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-blue-50/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center"><Stethoscope className="w-5 h-5" /></div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">Clinical Notes</h3>
                    <p className="text-xs text-slate-500 font-medium">{notesTarget.name} (HN: {notesTarget.id})</p>
                  </div>
                </div>
                <button onClick={() => setNotesTarget(null)} className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <div className="text-xs font-bold text-slate-500 mb-1">การวินิจฉัย</div>
                    <div className="font-bold text-emerald-800">{notesTarget.disease || '-'}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <div className="text-xs font-bold text-slate-500 mb-1">ผู้ดูแลรับผิดชอบ</div>
                    <div className="font-bold text-slate-800">{notesTarget.responsibleStaff || '-'}</div>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
                  <div className="text-xs font-black text-blue-800 mb-2 flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5" /> แผนการดูแล / ข้อมูลยาสำคัญ
                  </div>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {notesTarget.clinicalNotes || 'ไม่มีบันทึก Clinical Notes'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> ที่อยู่</div>
                  <div className="text-sm font-medium text-slate-700">{notesTarget.address || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Patient Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3 bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">รายชื่อผู้ป่วย ({filteredPatients.length} ราย)</h3>
                <p className="text-xs text-slate-500 font-medium">ผู้ป่วย Home Ward ภายใต้การดูแลของ รพ.พล</p>
              </div>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input type="text" placeholder="ค้นหา HN, ชื่อ, หรือโรค..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64 bg-white" />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-bold flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span>กำลังโหลดข้อมูลทะเบียนผู้ป่วย...</span>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold space-y-2">
                <p className="text-3xl">👥</p>
                <p className="text-base text-slate-600">ไม่พบข้อมูลรายชื่อผู้ป่วย</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="px-5 py-4">HN</th>
                    <th className="px-5 py-4">ชื่อ-นามสกุล</th>
                    <th className="px-5 py-4">การวินิจฉัยโรค</th>
                    <th className="px-5 py-4">ผู้ดูแล & เบอร์โทร</th>
                    <th className="px-5 py-4">พยาบาลผู้ดูแล</th>
                    <th className="px-5 py-4">สถานะ</th>
                    <th className="px-5 py-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-5 py-4 font-mono font-bold text-slate-700 text-sm">{p.id}</td>
                      <td className="px-5 py-4">
                        <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                          {p.name}
                          {p.gender && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{p.gender} {p.age ? `${p.age} ปี` : ''}</span>}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{p.address || 'ไม่ระบุที่อยู่'}</div>
                      </td>
                      <td className="px-5 py-4 font-bold text-emerald-800 text-sm">{p.disease}</td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-emerald-600" />{p.relativePhone}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{p.caregiverName ? `ญาติ: ${p.caregiverName}` : 'ไม่ระบุ'}</div>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">{p.responsibleStaff || 'พย.วิกานดา'}</td>
                      <td className="px-5 py-4">
                        <select
                          value={p.status || 'ยังไม่ส่งลิงก์'}
                          onChange={e => handleStatusChange(p.id, e.target.value)}
                          className={`text-xs font-bold px-2 py-1.5 rounded-xl border cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 ${STATUS_CONFIG[p.status]?.color || STATUS_CONFIG['ยังไม่ส่งลิงก์'].color}`}
                        >
                          {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          {/* Generate Link */}
                          <button onClick={() => handleGenerateLink(p)} disabled={generatingLink === p.id}
                            title="สร้างและคัดลอกลิงก์ประเมิน ESAS"
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer disabled:opacity-40" >
                            {generatingLink === p.id
                              ? <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                              : <HeartHandshake className="w-4 h-4" />}
                          </button>
                          {/* Clinical Notes */}
                          <button onClick={() => setNotesTarget(p)} title="ดู Clinical Notes"
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer">
                            <FileText className="w-4 h-4" />
                          </button>
                          {/* Edit */}
                          <button onClick={() => openEdit(p)} title="แก้ไขข้อมูล"
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all cursor-pointer">
                            <Pencil className="w-4 h-4" />
                          </button>
                          {/* Delete */}
                          <button onClick={() => handleDelete(p.id, p.name)} title="ลบรายชื่อ"
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}