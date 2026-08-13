import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Search, CheckCircle, Package } from 'lucide-react';
import { db, collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, where } from '../services/firebase';

export default function EquipmentReturn({ token }) {
    const navigate = useNavigate();
    const [borrowedEquipments, setBorrowedEquipments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState('');

    // Return Form State
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [returnCondition, setReturnCondition] = useState('ปกติ');
    const [returnNote, setReturnNote] = useState('');
    const [staffName, setStaffName] = useState('เจ้าหน้าที่ (แอดมิน)'); // Mock

    useEffect(() => {
        fetchBorrowed();
    }, []);

    const fetchBorrowed = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'equipments'), where('status', '==', 'ยืม'));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // To get patient name, we need to join manually or just show patientId
            // For simplicity, we just use the currentPatientId. 
            // In a real scenario we'd fetch patient names too.
            setBorrowedEquipments(data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
            setLoading(false);
        }
    };

    const handleSelect = (eq) => {
        setSelectedEquipment(eq);
        setReturnCondition('ปกติ');
        setReturnNote('');
    };

    const handleSave = async () => {
        if (!selectedEquipment) return;
        setSubmitting(true);
        try {
            const refId = 'REF-' + Date.now().toString().slice(-6);

            // 1. Create Return Record
            await addDoc(collection(db, 'borrow_records'), {
                refId: refId,
                type: 'คืน',
                patientId: selectedEquipment.currentPatientId || 'Unknown',
                equipmentId: selectedEquipment.id,
                equipmentName: selectedEquipment.name,
                staff: staffName,
                timestamp: serverTimestamp(),
                condition: returnCondition,
                note: returnNote
            });

            // 2. Update Equipment Status
            await updateDoc(doc(db, 'equipments', selectedEquipment.id), {
                status: 'ว่าง',
                currentPatientId: null
            });

            alert('บันทึกการคืนสำเร็จ!');
            setSelectedEquipment(null);
            fetchBorrowed(); // Refresh list
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
        setSubmitting(false);
    };

    const filtered = borrowedEquipments.filter(e => {
        const q = search.toLowerCase();
        return e.name.toLowerCase().includes(q) || (e.currentPatientId && e.currentPatientId.toLowerCase().includes(q));
    });

    return (
        <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50">
            <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-10 flex flex-wrap justify-between items-center gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/equipments')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">ทำรายการคืนเครื่องมือแพทย์</h2>
                    </div>
                </div>
            </header>

            <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6 flex flex-col lg:flex-row gap-6">
                
                {/* Left Panel: List of Borrowed items */}
                <div className="w-full lg:w-1/2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b border-slate-200 bg-slate-50/60">
                        <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-slate-400"><Search className="w-4 h-4" /></span>
                            <input
                                type="text"
                                placeholder="ค้นหาชื่ออุปกรณ์, HN..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 w-full outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {loading ? (
                            <div className="text-center p-8 text-slate-400">กำลังโหลด...</div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center p-8 text-slate-400">ไม่มีรายการค้างคืน</div>
                        ) : (
                            filtered.map(eq => (
                                <div 
                                    key={eq.id} 
                                    onClick={() => handleSelect(eq)}
                                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                                        selectedEquipment?.id === eq.id 
                                        ? 'border-amber-500 bg-amber-50 shadow-sm ring-2 ring-amber-500/20' 
                                        : 'border-slate-200 hover:border-amber-300 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-slate-800">{eq.name}</h4>
                                            <p className="text-xs text-slate-500 mt-1">ผู้ยืม (HN): <span className="font-bold text-slate-700">{eq.currentPatientId || 'ไม่ระบุ'}</span></p>
                                        </div>
                                        <Package className={`w-5 h-5 ${selectedEquipment?.id === eq.id ? 'text-amber-600' : 'text-slate-400'}`} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Panel: Return Form */}
                <div className="w-full lg:w-1/2">
                    {selectedEquipment ? (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-200 bg-amber-50/50 font-black text-amber-800 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-amber-600" />
                                บันทึกการคืน: {selectedEquipment.name}
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">สภาพเครื่องมือตอนคืน</label>
                                    <input
                                        type="text"
                                        value={returnCondition}
                                        onChange={(e) => setReturnCondition(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">หมายเหตุเพิ่มเติม</label>
                                    <textarea
                                        value={returnNote}
                                        onChange={(e) => setReturnNote(e.target.value)}
                                        rows="3"
                                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                                        placeholder="เช่น มีรอยขีดข่วน, อุปกรณ์ครบ..."
                                    ></textarea>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex justify-end">
                                    <button
                                        onClick={handleSave}
                                        disabled={submitting}
                                        className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md w-full justify-center"
                                    >
                                        <Save className="w-5 h-5" />
                                        {submitting ? 'กำลังบันทึก...' : 'ยืนยันรับคืนเข้าคลัง'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                            <div className="text-center text-slate-400 font-bold">
                                👈 กรุณาเลือกรายการเครื่องมือที่ต้องการคืนจากรายการด้านซ้าย
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
