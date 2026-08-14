import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { db, collection, query, where, getDocs, doc, getDoc } from '../services/firebase';

export default function EquipmentPrintSlip() {
    const { refId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchSlipData = async () => {
            setLoading(true);
            try {
                // Fetch borrow records for this RefID
                const q = query(collection(db, 'borrow_records'), where('refId', '==', refId));
                const snap = await getDocs(q);
                
                if (snap.empty) {
                    setLoading(false);
                    return;
                }

                const refRecords = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                
                // Get patientId from the ref records
                const borrowRecord = refRecords.find(r => r.type === 'ยืม') || refRecords[0];
                const patientId = borrowRecord?.patientId;

                let records = refRecords;
                if (patientId) {
                    // Fetch ALL records for this patient to show full history on the slip
                    const ptQ = query(collection(db, 'borrow_records'), where('patientId', '==', patientId));
                    const ptSnap = await getDocs(ptQ);
                    records = ptSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                }
                
                // Sort records chronologically to handle borrow/return sequences correctly
                records.sort((a, b) => {
                    const ta = a.timestamp?.seconds || 0;
                    const tb = b.timestamp?.seconds || 0;
                    return ta - tb;
                });

                // Group by equipment to find borrow date and return date
                const itemsMap = {};
                records.forEach(r => {
                    const eqId = r.equipmentId;
                    if (!itemsMap[eqId]) {
                        itemsMap[eqId] = { 
                            equipmentName: r.equipmentName, 
                            note: r.note,
                            deposit: r.deposit || 0,
                            borrowDate: null,
                            returnDate: null,
                            status: 'ค้างยืม'
                        };
                    }
                    const ts = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
                    if (r.type === 'ยืม') {
                        itemsMap[eqId].borrowDate = ts;
                        itemsMap[eqId].returnDate = null; // Reset return date
                        itemsMap[eqId].status = 'ค้างยืม'; // Reset status
                        itemsMap[eqId].note = r.note; // Keep note from borrow
                    } else if (r.type === 'คืน') {
                        itemsMap[eqId].returnDate = ts;
                        itemsMap[eqId].status = 'คืนแล้ว';
                    }
                });

                // Find the latest borrow record for patient details
                const latestBorrowRecord = records.filter(r => r.type === 'ยืม').sort((a,b) => b.timestamp - a.timestamp)[0] || borrowRecord;
                
                // Fetch Patient details
                let pt = { phone: '-', address: '-', relative: '-', relationship: '-', status: 'Unknown' };
                if (borrowRecord?.patientId) {
                    const ptSnap = await getDoc(doc(db, 'patients', borrowRecord.patientId));
                    if (ptSnap.exists()) {
                        const ptData = ptSnap.data();
                        pt.phone = ptData.relativePhone || ptData.phone || '-';
                        pt.address = ptData.address || '-';
                        pt.relative = ptData.caregiverName || '-';
                        pt.relationship = ptData.caregiverRelation || '-';
                        pt.status = ptData.status || '-';
                    }
                }

                setData({
                    refId: refId,
                    patientName: latestBorrowRecord?.patientName || '-',
                    ward: latestBorrowRecord?.ward || '-',
                    staff: latestBorrowRecord?.staff || '-',
                    pt,
                    items: Object.values(itemsMap)
                });
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        fetchSlipData();
    }, [refId]);

    const calculateDuration = (bDate, rDate) => {
        if (!bDate) return '-';
        const start = bDate.getTime();
        const end = rDate ? rDate.getTime() : new Date().getTime();
        const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 ? `${diffDays} วัน` : '0 วัน';
    };

    if (loading) return <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div><p className="mt-4 font-bold text-slate-400">กำลังเตรียมข้อมูล...</p></div>;
    
    if (!data) return <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100"><p className="text-xl font-bold text-red-500">❌ ไม่พบข้อมูลใบงาน</p><button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">กลับ</button></div>;

    return (
        <div className="bg-[#f3f4f6] min-h-screen text-[#1f2937] font-['Sarabun'] pb-10">
            {/* Action Bar (Hidden on Print) */}
            <div className="print:hidden sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b py-3 flex justify-center gap-4 shadow-sm">
                <button onClick={() => navigate(-1)} className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
                </button>
                <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-colors">
                    <Printer className="w-5 h-5" /> พิมพ์ใบงาน (A4)
                </button>
            </div>

            {/* A4 Paper Container */}
            <div className="bg-white mx-auto mt-6 rounded shadow-lg p-10 print:shadow-none print:m-0 print:p-0 print:w-full print:rounded-none" style={{ width: '210mm', minHeight: '297mm' }}>
                <div className="flex justify-between items-start border-b-2 border-blue-600 pb-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-blue-700 uppercase tracking-tighter">ใบยืม-คืนเครื่องมือแพทย์</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">HHC Management Record</p>
                    </div>
                    <div className="text-right">
                        <div className="bg-slate-50 border-2 px-5 py-3 rounded-lg border-slate-200">
                            <p className="text-[9px] text-slate-400 font-bold uppercase">REF ID</p>
                            <p className="text-xl font-mono font-black text-slate-800 tracking-widest leading-none mt-1">{data.refId}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    <div>
                        <h3 className="text-[10px] font-black text-blue-600 uppercase mb-3">ข้อมูลผู้ป่วยและผู้ยืม</h3>
                        <p className="text-lg font-bold text-slate-800">{data.patientName}</p>
                        <div className="mt-3 space-y-2 text-sm text-slate-600 font-medium">
                            <p>📞 เบอร์โทร: {data.pt.phone}</p>
                            <p>🏠 ที่อยู่: {data.pt.address}</p>
                            <div className="mt-3 pt-3 border-t border-slate-200 font-bold flex items-center gap-2">
                                👤 ผู้ยืม: <span className="text-blue-700">{data.pt.relative}</span> 
                                <span className="text-xs font-medium text-slate-500">({data.pt.relationship})</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right flex flex-col justify-between">
                        <div>
                            <h3 className="text-[10px] font-black text-blue-600 uppercase mb-3">รายละเอียดใบงาน</h3>
                            <p className="text-sm font-semibold text-slate-700 mb-1">Ward: {data.ward}</p>
                            <p className="text-sm text-slate-600 mb-3">เจ้าหน้าที่: {data.staff}</p>
                            <p className="text-sm font-bold text-blue-600 uppercase tracking-wide bg-blue-50 inline-block px-3 py-1 rounded-lg">สถานะคนไข้: {data.pt.status}</p>
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold mt-4">
                            พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}
                        </div>
                    </div>
                </div>

                <div className="mb-12">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase flex items-center gap-2 tracking-wide">
                        📋 รายการเครื่องมือในใบงานนี้
                    </h3>
                    <table className="w-full text-left border-collapse border border-slate-200">
                        <thead className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase">
                            <tr>
                                <th className="border border-slate-200 px-4 py-3">ชื่อรายการเครื่องมือ / หมายเหตุ</th>
                                <th className="border border-slate-200 px-4 py-3 text-center">สถานะ</th>
                                <th className="border border-slate-200 px-4 py-3 text-center">วันที่ยืม - วันที่คืน</th>
                                <th className="border border-slate-200 px-4 py-3 text-center">ระยะเวลา</th>
                                <th className="border border-slate-200 px-4 py-3 text-right">มัดจำ (฿)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.length === 0 ? (
                                <tr><td colSpan="5" className="py-12 text-center text-slate-300 italic border border-slate-200 font-bold">ไม่มีรายการ</td></tr>
                            ) : data.items.map((item, idx) => {
                                const isDone = item.status === 'คืนแล้ว';
                                return (
                                <tr key={idx} className={isDone ? 'bg-slate-50' : 'bg-white'}>
                                    <td className="border border-slate-200 px-4 py-4">
                                        <div className={`font-bold ${isDone ? 'text-slate-500' : 'text-slate-800'}`}>{item.equipmentName}</div>
                                        <div className="text-[11px] text-slate-400 mt-1 font-medium">{item.note || '-'}</div>
                                    </td>
                                    <td className="border border-slate-200 text-center">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold ${isDone ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="border border-slate-200 text-center text-xs font-mono font-medium text-slate-600">
                                        <div>ยืม: {item.borrowDate ? item.borrowDate.toLocaleString('th-TH') : '-'}</div>
                                        {isDone && <div className="mt-1">คืน: {item.returnDate ? item.returnDate.toLocaleString('th-TH') : '-'}</div>}
                                    </td>
                                    <td className="border border-slate-200 text-center font-bold text-red-600 text-sm">
                                        {calculateDuration(item.borrowDate, item.returnDate)}
                                    </td>
                                    <td className="border border-slate-200 text-right font-mono font-bold text-slate-700">
                                        {Number(item.deposit).toLocaleString()}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-2 gap-12 mt-24 text-center text-sm font-bold text-slate-600">
                    <div className="border-t-2 border-slate-200 pt-4 w-64 mx-auto border-dashed">
                        <p>ลงชื่อผู้ยืม (ญาติ)</p>
                    </div>
                    <div className="border-t-2 border-slate-200 pt-4 w-64 mx-auto border-dashed">
                        <p>ลงชื่อเจ้าหน้าที่</p>
                    </div>
                </div>
            </div>
            
            {/* Global Print Styles inside React */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { size: A4; margin: 0; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
                }
            `}} />
        </div>
    );
}
