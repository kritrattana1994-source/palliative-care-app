import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Save, Package, ArrowLeft, CheckCircle } from 'lucide-react';
import { db, collection, getDocs, setDoc, updateDoc, doc, serverTimestamp, query, where, orderBy, onSnapshot } from '../services/firebase';
import { writeAuditLog } from '../services/auditLog';

export default function EquipmentReturn({ token, user }) {
    const navigate = useNavigate();
    const [borrowedEquipments, setBorrowedEquipments] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [selectedItem, setSelectedItem] = useState(null);
    const [returnCondition, setReturnCondition] = useState('ปกติ');
    const [returnNote, setReturnNote] = useState('');

    useEffect(() => {
        setLoading(true);
        // Find equipments that are currently borrowed
        const unsub = onSnapshot(query(collection(db, 'equipments'), where('status', '==', 'ยืม')), async (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setBorrowedEquipments(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleSelect = (eq) => {
        setSelectedItem(eq);
        setReturnCondition('ปกติ');
        setReturnNote('');
    };

    const handleSave = async () => {
        if (!selectedItem) return;
        setSubmitting(true);
        try {
            const refId = 'REF-' + Date.now().toString().slice(-6);

            // Create Return Record
            await setDoc(doc(db, 'borrow_records', `${refId}_${selectedItem.id}`), {
                refId: refId,
                type: 'คืน',
                patientId: selectedItem.currentPatientId || 'Unknown',
                patientName: selectedItem.currentPatientId || 'Unknown',
                equipmentId: selectedItem.id,
                equipmentName: selectedItem.name,
                staff: 'เจ้าหน้าที่ (แอดมิน)',
                ward: '-',
                timestamp: serverTimestamp(),
                condition: returnCondition,
                note: returnNote,
                deposit: 0,
                photoUrl: ''
            });

            // Update Equipment
            await updateDoc(doc(db, 'equipments', selectedItem.id), {
                status: 'ว่าง',
                currentPatientId: null
            });

            alert('บันทึกรับคืนอุปกรณ์สำเร็จ!');
            writeAuditLog(user, 'RETURN_EQUIPMENT', 'equipment', selectedItem.id, selectedItem.name, `สภาพ: ${returnCondition}`);
            setSelectedItem(null);
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
        setSubmitting(false);
    };

    const filtered = borrowedEquipments.filter(e => {
        const q = search.toLowerCase();
        return e.name.toLowerCase().includes(q) || (e.currentPatientId && e.currentPatientId.toLowerCase().includes(q)) || e.id.toLowerCase().includes(q);
    });

    return (
        <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#f0f7ff] font-['Sarabun'] relative">
            
            <div className="max-w-5xl mx-auto w-full mt-6 px-4">
                {/* Navigation Tabs */}
                <div className="flex bg-white rounded-2xl shadow-sm overflow-hidden mb-6 border border-slate-100">
                    <button onClick={() => navigate('/equipments')} className="flex-1 py-3.5 font-bold text-sm transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-b-[3px] border-transparent">
                        📊 แดชบอร์ด
                    </button>
                    <button onClick={() => navigate('/equipments/borrow')} className="flex-1 py-3.5 font-bold text-sm transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-b-[3px] border-transparent">
                        ➕ ยืมเครื่องมือ
                    </button>
                    <button onClick={() => navigate('/equipments/return')} className="flex-1 py-3.5 font-bold text-sm transition-all bg-blue-50 text-blue-700 border-b-[3px] border-blue-600">
                        ↩️ คืนเครื่องมือ <span className="text-[10px] font-normal ml-1">(เฉพาะเจ้าหน้าที่)</span>
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto w-full flex flex-col lg:flex-row gap-6 px-4 pb-12">
                
                {/* Left Panel */}
                <div className="w-full lg:w-1/2 bg-white rounded-3xl shadow-xl overflow-hidden border-t-8 border-red-600 flex flex-col h-[70vh]">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-xl font-bold text-red-700 uppercase tracking-tighter mb-4">🔴 รายการเครื่องมือที่ค้างยืม</h2>
                        <div className="relative">
                            <span className="absolute left-3.5 top-3.5 text-slate-400"><Search className="w-5 h-5" /></span>
                            <input type="text" placeholder="ค้นหาชื่ออุปกรณ์, รหัส, HN..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-700 focus:border-red-400 w-full outline-none shadow-sm" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                        {loading ? (
                            <div className="text-center p-8 text-slate-400 font-bold">กำลังโหลดข้อมูล...</div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center p-8 text-slate-400 font-bold">ไม่มีรายการค้างคืนที่ตรงกับการค้นหา</div>
                        ) : (
                            filtered.map(eq => (
                                <div 
                                    key={eq.id} 
                                    onClick={() => handleSelect(eq)}
                                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                        selectedItem?.id === eq.id 
                                        ? 'border-red-400 bg-red-50 shadow-md transform scale-[1.02]' 
                                        : 'border-slate-200 hover:border-red-200 bg-white hover:bg-red-50/30 shadow-sm'
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="font-black text-slate-800">{eq.name}</h4>
                                            <p className="text-xs text-slate-500 mt-1 font-bold">รหัสเครื่อง: <span className="text-blue-600">{eq.id}</span></p>
                                            <p className="text-xs text-slate-500 font-bold">ผู้ยืม (HN): <span className="text-orange-600">{eq.currentPatientId || 'ไม่ระบุ'}</span></p>
                                        </div>
                                        <Package className={`w-8 h-8 ${selectedItem?.id === eq.id ? 'text-red-500' : 'text-slate-300'}`} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Panel */}
                <div className="w-full lg:w-1/2">
                    {selectedItem ? (
                        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-t-8 border-slate-800 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="px-6 py-5 border-b border-slate-100 bg-slate-800 text-white font-black flex items-center gap-2 text-lg">
                                <CheckCircle className="w-6 h-6 text-green-400" />
                                บันทึกรับคืนเครื่องมือ
                            </div>
                            <div className="p-6">
                                <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                    <h3 className="font-black text-blue-700 text-lg mb-1">{selectedItem.name}</h3>
                                    <p className="text-sm font-bold text-slate-500 mb-1">รหัสเครื่อง: {selectedItem.id}</p>
                                    <p className="text-sm font-bold text-slate-500">HN ผู้ยืม: <span className="text-orange-600">{selectedItem.currentPatientId}</span></p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">สภาพเครื่องมือตอนคืน *</label>
                                        <input type="text" value={returnCondition} onChange={(e) => setReturnCondition(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:border-slate-800 outline-none shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
                                        <textarea value={returnNote} onChange={(e) => setReturnNote(e.target.value)} rows="3" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 focus:border-slate-800 outline-none shadow-sm" placeholder="เช่น อุปกรณ์ครบ, มีรอยขีดข่วน..."></textarea>
                                    </div>

                                    <div className="pt-6 mt-2">
                                        <button onClick={handleSave} disabled={submitting} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white px-6 py-4 rounded-2xl font-black text-lg transition-all shadow-xl active:scale-95">
                                            <Save className="w-6 h-6" />
                                            {submitting ? 'กำลังบันทึก...' : 'ยืนยันรับคืนเข้าคลัง'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-4 border-dashed border-slate-200 rounded-3xl bg-white/50 p-8 text-center">
                            <Package className="w-16 h-16 text-slate-300 mb-4" />
                            <h3 className="text-xl font-black text-slate-400 mb-2">ยังไม่ได้เลือกรายการ</h3>
                            <p className="text-slate-400 font-medium">กรุณาคลิกเลือกเครื่องมือที่ต้องการทำเรื่องคืน<br/>จากรายการทางด้านซ้ายมือ 👈</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
