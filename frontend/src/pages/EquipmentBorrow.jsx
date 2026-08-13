import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Plus, Trash2, Camera, User, Package, AlertCircle, CheckCircle, Search, X } from 'lucide-react';
import { db, collection, getDocs, setDoc, addDoc, updateDoc, doc, getDoc, serverTimestamp } from '../services/firebase';
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
    const [refId] = useState('ระบบจะออกเลขให้อัตโนมัติ');
    const [selectedPatient, setSelectedPatient] = useState('');
    const [selectedWard, setSelectedWard] = useState('');
    const [staffName, setStaffName] = useState('เจ้าหน้าที่ (แอดมิน)'); // Mock
    const [items, setItems] = useState([]);
    
    // HN Check State
    const [checkHn, setCheckHn] = useState('');
    const [hnResult, setHnResult] = useState(null); // { exists: bool, data: obj, msg: string }
    const [isChecking, setIsChecking] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [regData, setRegData] = useState({
        hn: '', name: '', caregiverName: '', caregiverRelation: '', address: '', relativePhone: '', status: 'Admit'
    });

    // Patient status
    const ptData = patients.find(p => p.id === selectedPatient);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const pSnap = await getDocs(collection(db, 'patients'));
            setPatients(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            
            const eSnap = await getDocs(collection(db, 'equipments'));
            setEquipments(eSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => e.status !== 'ยืม'));

            const wSnap = await getDocs(collection(db, 'wards'));
            setWards(wSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error(err);
            alert('โหลดข้อมูลผิดพลาด');
        }
        setLoading(false);
    };

    const handleCheckHn = async () => {
        if (!checkHn.trim()) return setHnResult(null);
        setIsChecking(true);
        try {
            const docRef = doc(db, 'patients', checkHn.trim());
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const p = docSnap.data();
                if (p.status === 'เสียชีวิต') {
                    setHnResult({ exists: true, isDeath: true, data: p, msg: `✅ พบข้อมูล: ${p.name} (สถานะ: เสียชีวิต) - ❌ ไม่สามารถยืมเครื่องใหม่ได้` });
                } else {
                    setHnResult({ exists: true, isDeath: false, data: p, msg: `✅ พบข้อมูล: ${p.name} (สถานะ: ${p.status}) - สามารถเลือกชื่อในช่อง "เลือกคนไข้" ด้านล่างได้เลย` });
                    setSelectedPatient(p.id); // Auto select
                }
            } else {
                setHnResult({ exists: false, isDeath: false, data: null, msg: `⚠️ ยังไม่มีข้อมูล HN นี้ในระบบ กรุณาเพิ่มข้อมูลที่ปุ่ม [+ ลงทะเบียนใหม่]` });
            }
        } catch (error) {
            console.error(error);
        }
        setIsChecking(false);
    };

    const handleRegisterPatient = async () => {
        if (!regData.hn || !regData.name) return alert('กรุณากรอก HN และชื่อคนไข้');
        setSubmitting(true);
        try {
            await setDoc(doc(db, 'patients', regData.hn), {
                id: regData.hn,
                name: regData.name,
                caregiverName: regData.caregiverName,
                caregiverRelation: regData.caregiverRelation,
                address: regData.address,
                relativePhone: regData.relativePhone,
                status: regData.status
            });
            alert('บันทึกคนไข้สำเร็จ');
            setShowModal(false);
            setRegData({ hn: '', name: '', caregiverName: '', caregiverRelation: '', address: '', relativePhone: '', status: 'Admit' });
            await fetchData();
            setSelectedPatient(regData.hn);
        } catch (err) {
            console.error(err);
            alert('บันทึกผิดพลาด');
        }
        setSubmitting(false);
    };

    const addNewItemBlock = () => {
        setItems([...items, { id: Date.now(), equipmentId: '', deposit: 0, note: '', photoFile: null, photoPreview: null }]);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handlePhotoChange = (index, e) => {
        if (e.target.files[0]) {
            const file = e.target.files[0];
            updateItem(index, 'photoFile', file);
            updateItem(index, 'photoPreview', URL.createObjectURL(file));
        }
    };

    const handleRemoveItem = (index) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!selectedPatient) return alert('กรุณาเลือกผู้ป่วย');
        if (!selectedWard) return alert('กรุณาระบุวอร์ด');
        if (items.length === 0) return alert('กรุณาเพิ่มรายการเครื่องมืออย่างน้อย 1 รายการ');

        // Check if all items have photos
        for (const item of items) {
            if (!item.equipmentId) return alert('กรุณาเลือกเครื่องมือแพทย์ให้ครบทุกกล่อง');
            if (!item.photoFile) return alert('กรุณาถ่ายรูปประกอบทุกรายการ (เพื่อยืนยันสภาพก่อนยืม)');
        }

        setSubmitting(true);
        try {
            const generatedRefId = 'REF-' + Date.now().toString().slice(-6);
            const patientObj = patients.find(p => p.id === selectedPatient);

            for (const item of items) {
                const eqObj = equipments.find(e => e.id === item.equipmentId);
                let photoUrl = '';
                if (item.photoFile) {
                    const photoRef = ref(storage, `equipment_photos/${generatedRefId}_${item.equipmentId}_${item.photoFile.name}`);
                    await uploadBytes(photoRef, item.photoFile);
                    photoUrl = await getDownloadURL(photoRef);
                }

                await setDoc(doc(db, 'borrow_records', `${generatedRefId}_${item.equipmentId}`), {
                    refId: generatedRefId,
                    type: 'ยืม',
                    patientId: selectedPatient,
                    patientName: patientObj ? `${patientObj.id} - ${patientObj.name}` : 'Unknown',
                    equipmentId: item.equipmentId,
                    equipmentName: eqObj ? eqObj.name : 'Unknown',
                    staff: staffName,
                    ward: selectedWard,
                    timestamp: serverTimestamp(),
                    condition: 'ปกติ',
                    note: item.note || '-',
                    deposit: Number(item.deposit),
                    photoUrl: photoUrl
                });

                await updateDoc(doc(db, 'equipments', item.equipmentId), {
                    status: 'ยืม',
                    currentPatientId: selectedPatient
                });
            }
            
            alert('บันทึกรายการยืมสำเร็จ! Ref ID: ' + generatedRefId);
            navigate('/equipments');
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
        setSubmitting(false);
    };

    if (loading && patients.length === 0) return <div className="p-12 text-center text-blue-600 font-bold">กำลังดึงข้อมูล...</div>;

    return (
        <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#f0f7ff] font-['Sarabun'] relative">
            
            {/* Nav */}
            <div className="max-w-4xl mx-auto w-full mt-6 mb-4 px-4 flex flex-wrap justify-center gap-3">
                <button className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl shadow-md font-bold text-sm">หน้ายืมเครื่อง</button>
                <button onClick={() => navigate('/equipments/return')} className="bg-white text-red-600 border border-red-50 px-5 py-2.5 rounded-2xl shadow-sm font-bold text-sm hover:bg-red-50 transition-all">หน้าคืน/แก้ไข</button>
                <button onClick={() => navigate('/patients')} className="bg-white text-purple-600 border border-purple-50 px-5 py-2.5 rounded-2xl shadow-sm font-bold text-sm hover:bg-purple-50 transition-all">จัดการคนไข้</button>
                <button onClick={() => navigate('/equipments')} className="bg-white text-slate-700 border border-slate-200 px-5 py-2.5 rounded-2xl shadow-sm font-bold text-sm hover:bg-slate-50 transition-all">แดชบอร์ด</button>
            </div>

            <div className="max-w-2xl mx-auto w-full bg-white rounded-3xl shadow-xl overflow-hidden border-t-8 border-blue-600 p-6 mb-12">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-blue-700 uppercase tracking-tighter">🩺 ระบบยืมเครื่องมือแพทย์</h1>
                </div>

                {/* 🔍 Check HN */}
                <div className="mb-8 p-5 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 shadow-inner">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">🔍 ตรวจสอบ HN คนไข้ก่อนลงทะเบียนใหม่</label>
                    <div className="flex gap-2">
                        <input type="text" value={checkHn} onChange={e=>setCheckHn(e.target.value)} placeholder="กรอกเลข HN เพื่อเช็คประวัติ" className="flex-1 p-3 border-2 border-white rounded-xl outline-none focus:border-blue-400 font-bold text-slate-700 shadow-sm" />
                        <button type="button" onClick={handleCheckHn} disabled={isChecking} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 active:scale-95 transition-all">
                            {isChecking ? 'รอ...' : 'ตรวจสอบ'}
                        </button>
                    </div>
                    {hnResult && (
                        <div className={`mt-3 text-xs font-bold p-3 rounded-xl border ${hnResult.exists ? (hnResult.isDeath ? 'text-red-600 bg-red-50 border-red-100' : 'text-green-600 bg-green-50 border-green-100') : 'text-orange-600 bg-orange-50 border-orange-100'}`}>
                            {hnResult.msg}
                            {!hnResult.exists && (
                                <button type="button" onClick={() => { setShowModal(true); setRegData({...regData, hn: checkHn.trim()})}} className="ml-2 text-red-500 underline font-black">[+ ลงทะเบียนใหม่]</button>
                            )}
                        </div>
                    )}
                </div>

                <form onSubmit={handleSave}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-gray-700 text-[10px] font-bold mb-1 uppercase tracking-widest">รหัสอ้างอิง</label>
                            <input type="text" value={refId} readOnly className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-sm text-slate-400 shadow-inner italic outline-none" />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-[10px] font-bold mb-1 uppercase tracking-widest">ชื่อเจ้าหน้าที่ *</label>
                            <input type="text" required value={staffName} onChange={e=>setStaffName(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:border-blue-400 transition-colors" placeholder="ระบุชื่อผู้บันทึก" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-gray-700 text-[10px] font-bold mb-1 uppercase tracking-widest">เลือก Ward *</label>
                            <select required value={selectedWard} onChange={e=>setSelectedWard(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:border-blue-400 bg-white">
                                <option value="" disabled>-- เลือก Ward --</option>
                                {wards.map(w => <option key={w.name || w} value={w.name || w}>{w.name || w}</option>)}
                            </select>
                        </div>
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <label className="block text-gray-700 text-[10px] font-bold uppercase tracking-widest">เลือกคนไข้ *</label>
                                <button type="button" onClick={() => setShowModal(true)} className="text-[10px] font-bold text-green-600 hover:underline">+ ลงทะเบียนใหม่</button>
                            </div>
                            <select required value={selectedPatient} onChange={e=>setSelectedPatient(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:border-blue-400 bg-white">
                                <option value="" disabled>-- เลือกคนไข้ --</option>
                                {patients.map(p => <option key={p.id} value={p.id}>{p.id} - {p.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Patient Status Alert */}
                    {ptData && (
                        <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between shadow-sm">
                            <div>
                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">ปรับปรุงสถานะคนไข้ (ถ้ามี)</p>
                                <select 
                                    className="w-40 p-2 border border-blue-200 rounded-xl text-xs font-black text-blue-700 outline-none bg-white shadow-inner"
                                    value={ptData.status}
                                    onChange={(e) => {
                                        // Auto update patient status in background (Optional)
                                        updateDoc(doc(db, 'patients', ptData.id), { status: e.target.value });
                                    }}
                                >
                                    <option value="Admit">Admit</option>
                                    <option value="D/C">D/C</option>
                                    <option value="เสียชีวิต">เสียชีวิต</option>
                                </select>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">สถานะเดิม</p>
                                <p className="text-sm font-black text-slate-600">{ptData.status}</p>
                            </div>
                        </div>
                    )}

                    {/* Equipment Items */}
                    <div className="space-y-4 mb-6">
                        {items.map((item, index) => (
                            <div key={item.id} className="bg-blue-50 p-4 rounded-2xl border border-blue-100 relative shadow-sm animate-in slide-in-from-bottom-2 duration-300">
                                <button type="button" onClick={() => handleRemoveItem(index)} className="absolute top-3 right-4 text-slate-300 hover:text-red-500 text-2xl font-bold leading-none">&times;</button>
                                <div className="mb-3 pr-8">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">เครื่องมือ *</label>
                                    <select required value={item.equipmentId} onChange={e=>updateItem(index, 'equipmentId', e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl font-bold bg-white text-sm outline-none mt-1">
                                        <option value="" disabled>-- เลือกเครื่องมือ --</option>
                                        {equipments.map(eq => <option key={eq.id} value={eq.id}>{eq.name} ({eq.id})</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">มัดจำ</label>
                                        <input type="number" value={item.deposit} onChange={e=>updateItem(index, 'deposit', e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-blue-600 text-sm outline-none mt-1 bg-white" />
                                    </div>
                                    <div className="flex flex-col justify-end">
                                        <label className="cursor-pointer bg-white border border-blue-200 p-2.5 rounded-xl text-center text-[10px] font-bold text-blue-600 hover:bg-blue-100 shadow-sm transition-all flex items-center justify-center gap-2">
                                            <Camera className="w-4 h-4" /> {item.photoFile ? 'เปลี่ยนรูป' : 'ถ่ายรูป/แนบไฟล์ *'}
                                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoChange(index, e)} />
                                        </label>
                                    </div>
                                </div>
                                {item.photoPreview && (
                                    <img src={item.photoPreview} alt="preview" className="w-full h-32 object-cover rounded-xl mt-3 border border-blue-200 shadow-sm" />
                                )}
                                <input type="text" value={item.note} onChange={e=>updateItem(index, 'note', e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs mt-3 outline-none shadow-sm bg-white font-medium" placeholder="รหัสเครื่อง / หมายเหตุเพิ่มเติ่ม" />
                            </div>
                        ))}
                    </div>

                    <button type="button" onClick={addNewItemBlock} className="w-full bg-blue-50/50 text-blue-700 font-bold py-3 rounded-xl mb-8 border-2 border-dashed border-blue-200 hover:bg-blue-100 transition-all active:scale-95 shadow-sm text-sm">
                        + เพิ่มรายการเครื่องมือ
                    </button>
                    
                    <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl shadow-xl text-lg active:scale-95 transition-all flex justify-center items-center gap-2">
                        <Save className="w-5 h-5"/> {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูลและออกเลขใบงาน'}
                    </button>
                </form>
            </div>

            {/* Patient Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 text-green-600 flex items-center gap-2">👤 ลงทะเบียนคนไข้ใหม่</h2>
                        <div className="space-y-3">
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">เลข HN *</label><input type="text" value={regData.hn} onChange={e=>setRegData({...regData, hn: e.target.value})} placeholder="ระบุ HN" className="w-full border border-slate-200 rounded-xl p-3 outline-none text-sm font-bold focus:border-green-400"/></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">ชื่อ-นามสกุล คนไข้ *</label><input type="text" value={regData.name} onChange={e=>setRegData({...regData, name: e.target.value})} placeholder="ชื่อ-นามสกุล" className="w-full border border-slate-200 rounded-xl p-3 outline-none text-sm font-bold focus:border-green-400"/></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">ชื่อญาติ</label><input type="text" value={regData.caregiverName} onChange={e=>setRegData({...regData, caregiverName: e.target.value})} placeholder="ชื่อญาติ" className="w-full border border-slate-200 rounded-xl p-3 outline-none text-sm focus:border-green-400"/></div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">ความสัมพันธ์</label><input type="text" value={regData.caregiverRelation} onChange={e=>setRegData({...regData, caregiverRelation: e.target.value})} placeholder="ความสัมพันธ์" className="w-full border border-slate-200 rounded-xl p-3 outline-none text-sm focus:border-green-400"/></div>
                            </div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase">ที่อยู่ปัจจุบัน</label><textarea value={regData.address} onChange={e=>setRegData({...regData, address: e.target.value})} placeholder="ระบุที่อยู่" rows="2" className="w-full border border-slate-200 rounded-xl p-3 outline-none text-sm focus:border-green-400"></textarea></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">เบอร์โทรติดต่อ</label><input type="tel" value={regData.relativePhone} onChange={e=>setRegData({...regData, relativePhone: e.target.value})} placeholder="08x-xxxxxxx" className="w-full border border-slate-200 rounded-xl p-3 outline-none text-sm focus:border-green-400"/></div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">สถานะเริ่มต้น</label>
                                    <select value={regData.status} onChange={e=>setRegData({...regData, status: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 outline-none text-sm font-bold text-green-600 focus:border-green-400 bg-white">
                                        <option value="Admit">Admit</option>
                                        <option value="D/C">D/C</option>
                                        <option value="เสียชีวิต">เสียชีวิต</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={handleRegisterPatient} disabled={submitting} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg mt-4 active:scale-95 transition-all">
                                {submitting ? 'บันทึก...' : 'บันทึกข้อมูลคนไข้'}
                            </button>
                            <button onClick={() => setShowModal(false)} className="w-full mt-3 text-slate-400 text-sm font-bold underline">ยกเลิก</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
