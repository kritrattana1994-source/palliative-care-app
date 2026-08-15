import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, doc, setDoc, deleteDoc } from '../services/firebase';
import { Package, Plus, Search, Edit2, Trash2, X, Save } from 'lucide-react';

export default function EquipmentManagement({ token }) {
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ id: '', name: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'equipments'), (snapshot) => {
      const eqData = [];
      snapshot.forEach((doc) => eqData.push({ id: doc.id, ...doc.data() }));
      setEquipments(eqData);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ id: '', name: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (eq) => {
    setEditingId(eq.id);
    setFormData({ id: eq.id, name: eq.name });
    setIsModalOpen(true);
  };

  const handleDelete = async (eq) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเครื่องมือ ${eq.name} (รหัส: ${eq.id})?`)) return;
    try {
      await deleteDoc(doc(db, 'equipments', eq.id));
      alert('ลบข้อมูลเรียบร้อยแล้ว');
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล: ' + error.message);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.id || !formData.name) {
      alert('กรุณากรอกรหัสและชื่อเครื่องมือ');
      return;
    }
    
    setIsSaving(true);
    try {
      if (editingId && editingId !== formData.id) {
        // ID changed, not supported easily without migrating history. Alert user.
        alert('ไม่อนุญาตให้แก้ไขรหัสเครื่องมือ (หากต้องการเปลี่ยนรหัส กรุณาลบและสร้างใหม่)');
        setIsSaving(false);
        return;
      }
      
      const docRef = doc(db, 'equipments', formData.id);
      
      if (!editingId) {
        // Creating new, check if exists
        const existing = equipments.find(e => e.id === formData.id);
        if (existing) {
          alert('รหัสเครื่องมือนี้มีอยู่ในระบบแล้ว');
          setIsSaving(false);
          return;
        }
        await setDoc(docRef, {
          id: formData.id,
          name: formData.name,
          status: 'ว่าง',
          currentPatientId: null
        });
      } else {
        // Updating existing
        await setDoc(docRef, {
          name: formData.name
        }, { merge: true });
      }
      
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
    }
    setIsSaving(false);
  };

  const filteredEquipments = equipments.filter(eq => 
    eq.id.toLowerCase().includes(search.toLowerCase()) || 
    eq.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-[#f8fafc] font-['Sarabun'] h-full">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Package className="w-7 h-7 text-emerald-600" />
              จัดการฐานข้อมูลเครื่องมือแพทย์
            </h1>
            <p className="text-slate-500 text-sm mt-1">เพิ่ม ลบ แก้ไข ข้อมูลเครื่องมือแพทย์ในระบบ (สำหรับ Admin)</p>
          </div>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-5 h-5" />
            เพิ่มเครื่องมือใหม่
          </button>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="ค้นหาด้วยรหัส หรือ ชื่อเครื่องมือ..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 outline-none font-bold text-slate-700"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">รหัสเครื่องมือ (ID)</th>
                  <th className="px-6 py-4">ชื่อเครื่องมือ</th>
                  <th className="px-6 py-4 text-center">สถานะปัจจุบัน</th>
                  <th className="px-6 py-4">ผู้ยืมปัจจุบัน (HN)</th>
                  <th className="px-6 py-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filteredEquipments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-10 text-center text-slate-400 font-medium">ไม่พบรายการเครื่องมือ</td>
                  </tr>
                ) : (
                  filteredEquipments.map(eq => (
                    <tr key={eq.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700 font-mono">{eq.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-700">{eq.name}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 text-[10px] rounded-full font-bold ${
                          eq.status === 'ว่าง' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {eq.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-500">
                        {eq.currentPatientId && eq.currentPatientId !== '0' ? eq.currentPatientId : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleOpenEdit(eq)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(eq)} disabled={eq.status !== 'ว่าง'} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent" title={eq.status !== 'ว่าง' ? 'ไม่สามารถลบเครื่องมือที่ถูกยืมอยู่ได้' : 'ลบ'}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">
                {editingId ? 'แก้ไขข้อมูลเครื่องมือ' : 'เพิ่มเครื่องมือใหม่'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">รหัสเครื่องมือ (ID)</label>
                <input 
                  type="text"
                  required
                  disabled={!!editingId} // Disable editing ID for existing
                  value={formData.id}
                  onChange={(e) => setFormData({...formData, id: e.target.value})}
                  className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 outline-none focus:border-emerald-400 font-bold text-slate-700 disabled:opacity-60"
                  placeholder="เช่น PHON00123"
                />
                {editingId && <p className="text-[10px] text-red-400 mt-1 font-bold">*ไม่อนุญาตให้แก้ไขรหัสของเครื่องมือที่มีอยู่แล้ว</p>}
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ชื่อเครื่องมือ</label>
                <input 
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 outline-none focus:border-emerald-400 font-bold text-slate-700"
                  placeholder="เช่น เครื่องผลิตออกซิเจน"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex justify-center items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
