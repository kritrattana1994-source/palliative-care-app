import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Camera, User, Package, MapPin } from 'lucide-react';
import { db, collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, runTransaction } from '../services/firebase';
// Note: We need firebase storage for photos. Assuming storage is initialized in firebase.js
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../services/firebase';

const storage = getStorage(app);

export default function EquipmentBorrow({ token }) {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [equipments, setEquipments] = useState([]);
    const [wards, setWards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Form State
    const [selectedPatient, setSelectedPatient] = useState('');
    const [selectedWard, setSelectedWard] = useState('');
    const [staffName, setStaffName] = useState('เจ้าหน้าที่ (แอดมิน)'); // Mock for now
    const [items, setItems] = useState([]);

    // Temporary Item State
    const [currentItem, setCurrentItem] = useState('');
    const [currentCondition, setCurrentCondition] = useState('ปกติ');
    const [currentNote, setCurrentNote] = useState('');
    const [currentDeposit, setCurrentDeposit] = useState(0);
    const [currentPhoto, setCurrentPhoto] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const pSnap = await getDocs(collection(db, 'patients'));
                const pData = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setPatients(pData);

                const eSnap = await getDocs(collection(db, 'equipments'));
                const eData = eSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setEquipments(eData.filter(e => e.status !== 'ยืม')); // Only available

                const wSnap = await getDocs(collection(db, 'wards'));
                const wData = wSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setWards(wData);
                
                setLoading(false);
            } catch (err) {
                console.error(err);
                alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleAddItem = () => {
        if (!currentItem) return alert('กรุณาเลือกเครื่องมือ');
        const eqObj = equipments.find(e => e.id === currentItem);
        if (!eqObj) return;

        setItems([...items, {
            equipmentId: eqObj.id,
            equipmentName: eqObj.name,
            condition: currentCondition,
            note: currentNote,
            deposit: currentDeposit,
            photoFile: currentPhoto,
            photoPreview: currentPhoto ? URL.createObjectURL(currentPhoto) : null
        }]);

        // Reset temporary state
        setCurrentItem('');
        setCurrentCondition('ปกติ');
        setCurrentNote('');
        setCurrentDeposit(0);
        setCurrentPhoto(null);
    };

    const handleRemoveItem = (index) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handlePhotoChange = (e) => {
        if (e.target.files[0]) {
            setCurrentPhoto(e.target.files[0]);
        }
    };

    const handleSave = async () => {
        if (!selectedPatient) return alert('กรุณาเลือกผู้ป่วย');
        if (!selectedWard) return alert('กรุณาระบุวอร์ด');
        if (items.length === 0) return alert('กรุณาเพิ่มรายการเครื่องมืออย่างน้อย 1 รายการ');

        setSubmitting(true);
        try {
            const refId = 'REF-' + Date.now().toString().slice(-6); // Simple random ref
            const patientObj = patients.find(p => p.id === selectedPatient);

            for (const item of items) {
                let photoUrl = '';
                if (item.photoFile) {
                    const photoRef = ref(storage, `equipment_photos/${refId}_${item.equipmentId}_${item.photoFile.name}`);
                    await uploadBytes(photoRef, item.photoFile);
                    photoUrl = await getDownloadURL(photoRef);
                }

                // 1. Create Borrow Record
                await addDoc(collection(db, 'borrow_records'), {
                    refId: refId,
                    type: 'ยืม',
                    patientId: selectedPatient,
                    patientName: patientObj ? patientObj.name : 'Unknown',
                    equipmentId: item.equipmentId,
                    equipmentName: item.equipmentName,
                    staff: staffName,
                    ward: selectedWard,
                    timestamp: serverTimestamp(),
                    condition: item.condition,
                    note: item.note,
                    deposit: Number(item.deposit),
                    photoUrl: photoUrl
                });

                // 2. Update Equipment Status
                await updateDoc(doc(db, 'equipments', item.equipmentId), {
                    status: 'ยืม',
                    currentPatientId: selectedPatient
                });
            }

            alert('บันทึกรายการยืมสำเร็จ! Ref ID: ' + refId);
            navigate('/equipments');
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
        setSubmitting(false);
    };

    if (loading) return <div className="p-12 text-center">กำลังโหลดข้อมูล...</div>;

    return (
        <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50">
            <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-10 flex flex-wrap justify-between items-center gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/equipments')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">ทำรายการยืมเครื่องมือแพทย์</h2>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={submitting || items.length === 0}
                    className="flex items-center gap-2 bg-emerald-600 disabled:bg-slate-300 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md"
                >
                    <Save className="w-5 h-5" />
                    {submitting ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
                </button>
            </header>

            <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6">
                
                {/* Section 1: User Details */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60 font-black text-slate-800 flex items-center gap-2">
                        <User className="w-5 h-5 text-emerald-600" />
                        ข้อมูลผู้ยืม
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อผู้ป่วย</label>
                            <select
                                value={selectedPatient}
                                onChange={(e) => setSelectedPatient(e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="">-- เลือกผู้ป่วย --</option>
                                {patients.map(p => (
                                    <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">วอร์ด (Ward)</label>
                            <input
                                type="text"
                                list="ward-list"
                                value={selectedWard}
                                onChange={(e) => setSelectedWard(e.target.value)}
                                placeholder="พิมพ์หรือเลือกวอร์ด"
                                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                            <datalist id="ward-list">
                                {wards.map(w => <option key={w.id} value={w.name} />)}
                            </datalist>
                        </div>
                    </div>
                </div>

                {/* Section 2: Add Items */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60 font-black text-slate-800 flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        เลือกเครื่องมือ
                    </div>
                    <div className="p-6 bg-blue-50/30 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">เครื่องมือที่ว่าง</label>
                            <select
                                value={currentItem}
                                onChange={(e) => setCurrentItem(e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            >
                                <option value="">-- เลือกรายการ --</option>
                                {equipments.map(e => (
                                    <option key={e.id} value={e.id}>{e.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">สภาพเครื่องมือ</label>
                            <input
                                type="text"
                                value={currentCondition}
                                onChange={(e) => setCurrentCondition(e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">รูปถ่าย (ถ้ามี)</label>
                            <label className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl px-4 py-2 cursor-pointer transition-colors border border-slate-300 text-sm font-bold">
                                <Camera className="w-4 h-4" />
                                {currentPhoto ? 'เลือกแล้ว' : 'ถ่ายรูป'}
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                            </label>
                        </div>
                        <div className="md:col-span-4 flex justify-end mt-2">
                            <button
                                onClick={handleAddItem}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm"
                            >
                                <Plus className="w-4 h-4" /> เพิ่มเข้ารายการ
                            </button>
                        </div>
                    </div>

                    {/* Cart Items */}
                    <div className="p-0">
                        {items.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 font-bold text-sm">
                                ยังไม่มีรายการเครื่องมือ กรุณาเลือกเครื่องมือด้านบน
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-100/50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                                        <th className="px-6 py-3">รูปภาพ</th>
                                        <th className="px-6 py-3">เครื่องมือ</th>
                                        <th className="px-6 py-3">สภาพ</th>
                                        <th className="px-6 py-3 text-center">ลบ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((itm, idx) => (
                                        <tr key={idx}>
                                            <td className="px-6 py-3">
                                                {itm.photoPreview ? (
                                                    <img src={itm.photoPreview} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                                                ) : <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 text-xs border border-slate-200">ไม่มีรูป</div>}
                                            </td>
                                            <td className="px-6 py-3 font-bold text-slate-800">{itm.equipmentName}</td>
                                            <td className="px-6 py-3 text-sm text-slate-600">{itm.condition}</td>
                                            <td className="px-6 py-3 text-center">
                                                <button onClick={() => handleRemoveItem(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
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
