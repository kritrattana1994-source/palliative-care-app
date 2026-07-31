import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Users, X } from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '../config';

export default function PatientRegistry({ token }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [hn, setHn] = useState(''); const [name, setName] = useState(''); const [age, setAge] = useState('');
  const [gender, setGender] = useState('ชาย'); const [disease, setDisease] = useState('');
  const [relativePhone, setRelativePhone] = useState(''); const [caregiverName, setCaregiverName] = useState('');
  const [address, setAddress] = useState(''); const [responsibleStaff, setResponsibleStaff] = useState('พย.วิกานดา');
  const [clinicalNotes, setClinicalNotes] = useState(''); const [submitting, setSubmitting] = useState(false);

  const fetchPatients = async () => {
    try { const data = await apiGet('/api/patients'); setPatients(data); } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { fetchPatients(); }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    try {
      const data = await apiPost('/api/patients', { id: hn, name, age, gender, disease, relativePhone, caregiverName, address, responsibleStaff, clinicalNotes });
      setPatients([...patients, { ...data, latestAssessment: null }]);
      setHn(''); setName(''); setAge(''); setGender('ชาย'); setDisease(''); setRelativePhone(''); setCaregiverName(''); setAddress(''); setResponsibleStaff('พย.วิกานดา'); setClinicalNotes(''); setShowAddForm(false);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายชื่อผู้ป่วยรายนี้?')) return;
    try { await apiDelete('/api/patients/' + id); setPatients(patients.filter(p => p.id !== id)); } catch (err) { setError(err.message); }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-10 flex justify-between items-center"><div><h2 className="text-2xl font-bold text-slate-800">ทะเบียนผู้ป่วย</h2><p className="text-sm text-slate-500 font-medium mt-1">จัดการฐานข้อมูลผู้ป่วยประคับประคองที่บ้าน</p></div><button onClick={()=>setShowAddForm(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 transition-all"><Plus className="w-5 h-5" />ลงทะเบียนผู้ป่วยใหม่</button></header>
      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        {error && <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-sm text-red-700"><AlertCircle className="w-5 h-5 shrink-0 text-red-600"/><span>{error}</span></div>}
        {showAddForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50"><h3 className="text-lg font-black text-slate-800">ลงทะเบียนผู้ป่วยประคับประคอง</h3><button onClick={()=>setShowAddForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button></div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-700 mb-1">HN</label><input type="text" value={hn} onChange={e=>setHn(e.target.value)} placeholder="ระบุ HN" required className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div><div><label className="block text-xs font-bold text-slate-700 mb-1">อายุ</label><input type="number" value={age} onChange={e=>setAge(e.target.value)} placeholder="ระบุอายุ" required className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-700 mb-1">ชื่อ-นามสกุล</label><input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="ชื่อ และ นามสกุล" required className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div><div><label className="block text-xs font-bold text-slate-700 mb-1">เพศ</label><select value={gender} onChange={e=>setGender(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white"><option value="ชาย">ชาย</option><option value="หญิง">หญิง</option></select></div></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-700 mb-1">การวินิจฉัย</label><input type="text" value={disease} onChange={e=>setDisease(e.target.value)} placeholder="เช่น CA Colon" required className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div><div><label className="block text-xs font-bold text-slate-700 mb-1">เจ้าหน้าที่</label><select value={responsibleStaff} onChange={e=>setResponsibleStaff(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white"><option value="พย.วิกานดา">พย.วิกานดา</option><option value="นพ.พีรพล">นพ.พีรพล</option></select></div></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-700 mb-1">ญาติผู้ดูแล</label><input type="text" value={caregiverName} onChange={e=>setCaregiverName(e.target.value)} placeholder="ชื่อญาติ" required className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div><div><label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทร</label><input type="text" value={relativePhone} onChange={e=>setRelativePhone(e.target.value)} placeholder="089-123-4567" required className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">ที่อยู่</label><textarea value={address} onChange={e=>setAddress(e.target.value)} placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด" rows="2" required className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">แผนการดูแล</label><textarea value={clinicalNotes} onChange={e=>setClinicalNotes(e.target.value)} placeholder="ข้อมูลสำคัญ เช่น ยาแก้ปวด" rows="2" className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100"><button type="button" onClick={()=>setShowAddForm(false)} className="px-5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">ยกเลิก</button><button type="submit" disabled={submitting} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50">{submitting?'กำลังบันทึก...':'บันทึกข้อมูล'}</button></div>
              </form>
            </div>
          </div>
        )}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-slate-500"/>รายชื่อคนไข้ทั้งหมด ({patients.length} ราย)</h3></div>
          <div className="overflow-x-auto">
            {loading ? <div className="p-8 text-center text-slate-400 font-bold">กำลังโหลด...</div> : patients.length===0 ? <div className="p-8 text-center text-slate-400 font-bold">ไม่มีรายชื่อ</div> : (
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold"><th className="px-6 py-4">HN</th><th className="px-6 py-4">ชื่อ-นามสกุล</th><th className="px-6 py-4">การวินิจฉัย</th><th className="px-6 py-4">เบอร์ญาติ</th><th className="px-6 py-4">สถานะ</th><th className="px-6 py-4 text-center">จัดการ</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map(p => (<tr key={p.id} className="hover:bg-slate-50 transition-colors"><td className="px-6 py-4 font-bold text-slate-700">{p.id}</td><td className="px-6 py-4 font-bold text-slate-900 text-base">{p.name}</td><td className="px-6 py-4 text-slate-600 font-medium">{p.disease}</td><td className="px-6 py-4 text-slate-600">{p.relativePhone}</td><td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${p.status==='ยังไม่ส่งลิงก์'?'bg-slate-100 text-slate-600 border border-slate-200':p.status==='ส่งแล้ว (รอผล)'?'bg-amber-50 text-amber-700 border border-amber-200':'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}><span className={`w-2 h-2 rounded-full ${p.status==='ยังไม่ส่งลิงก์'?'bg-slate-400':p.status==='ส่งแล้ว (รอผล)'?'bg-amber-500 animate-pulse':'bg-emerald-500'}`}></span>{p.status}</span></td><td className="px-6 py-4 text-center"><button onClick={()=>handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="ลบ"><Trash2 className="w-5 h-5"/></button></td></tr>))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}