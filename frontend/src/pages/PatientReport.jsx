import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, HeartPulse, Activity, ClipboardList, ShieldAlert, Heart, Thermometer, Wind } from 'lucide-react';
import { db, doc, getDoc, collection, query, where, getDocs, orderBy } from '../services/firebase';

export default function PatientReport() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    const symptomsList = [
        { key: 'pain', label: 'ความปวด', short: 'ปวด', color: 'bg-red-500' },
        { key: 'shortnessOfBreath', label: 'หายใจเหนื่อยหอบ', short: 'หอบ', color: 'bg-orange-500' },
        { key: 'tiredness', label: 'ความเหนื่อยล้า/อ่อนเพลีย', short: 'เพลีย', color: 'bg-amber-500' },
        { key: 'drowsiness', label: 'ความง่วงซึม', short: 'ซึม', color: 'bg-yellow-500' },
        { key: 'nausea', label: 'คลื่นไส้/อาเจียน', short: 'คลื่นไส้', color: 'bg-lime-500' },
        { key: 'appetite', label: 'ความอยากอาหาร', short: 'เบื่ออาหาร', color: 'bg-emerald-500' },
        { key: 'depression', label: 'ซึมเศร้า/หดหู่', short: 'ซึมเศร้า', color: 'bg-purple-500' },
        { key: 'anxiety', label: 'วิตกกังวล', short: 'กังวล', color: 'bg-pink-500' },
        { key: 'wellbeing', label: 'สุขภาวะโดยรวม', short: 'สุขภาวะ', color: 'bg-blue-500' }
    ];

    useEffect(() => {
        const fetchReportData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Patient
                const patientRef = doc(db, 'patients', id);
                const patientSnap = await getDoc(patientRef);
                if (!patientSnap.exists()) {
                    setData(null);
                    setLoading(false);
                    return;
                }
                const patientData = { id: patientSnap.id, ...patientSnap.data() };

                // 2. Fetch Assessments
                const assQ = query(collection(db, 'assessments'), where('patientId', '==', id));
                const assSnap = await getDocs(assQ);
                const assessments = assSnap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => {
                        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                        return timeB - timeA; // Descending
                    });

                // 3. Fetch Event Logs (Timeline)
                const logsQ = query(collection(db, 'patients', id, 'eventLogs'), orderBy('createdAt', 'desc'));
                const logsSnap = await getDocs(logsQ);
                const eventLogs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // 4. Fetch Equipments
                const eqQ = query(collection(db, 'borrow_records'), where('patientId', '==', id));
                const eqSnap = await getDocs(eqQ);
                const eqRecords = eqSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
                    const ta = a.timestamp?.seconds || 0;
                    const tb = b.timestamp?.seconds || 0;
                    return ta - tb;
                });
                
                const eqMap = {};
                eqRecords.forEach(r => {
                    const eqId = r.equipmentId;
                    if (!eqMap[eqId]) {
                        eqMap[eqId] = { name: r.equipmentName, count: 0 };
                    }
                    if (r.type === 'ยืม') {
                        eqMap[eqId].count += 1;
                    } else if (r.type === 'คืน') {
                        eqMap[eqId].count -= 1;
                    }
                });
                
                const outstandingEq = [];
                Object.values(eqMap).forEach(eq => {
                    if (eq.count > 0) outstandingEq.push(eq.name);
                });

                setData({
                    patient: patientData,
                    latestAssessment: assessments[0] || null,
                    assessments: assessments,
                    timeline: eventLogs.slice(0, 8), // Show last 8 events
                    equipments: outstandingEq
                });
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        fetchReportData();
    }, [id]);

    if (loading) return <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div><p className="mt-4 font-bold text-slate-400">กำลังเตรียมข้อมูลรายงาน...</p></div>;
    if (!data) return <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100"><p className="text-xl font-bold text-red-500">❌ ไม่พบข้อมูลผู้ป่วย</p><button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">กลับ</button></div>;

    const pt = data.patient;
    const isDeath = pt.clinicalStatus === 'เสียชีวิต';

    return (
        <div className="bg-[#f3f4f6] min-h-screen text-[#1f2937] font-['Sarabun'] pb-10">
            {/* Action Bar (Hidden on Print) */}
            <div className="print:hidden sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b py-3 flex justify-center gap-4 shadow-sm">
                <button onClick={() => navigate(-1)} className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> กลับ
                </button>
                <button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-colors">
                    <Printer className="w-5 h-5" /> พิมพ์รายงาน (A4 แนวนอน)
                </button>
            </div>

            {/* A4 Landscape Paper Container */}
            <div className="bg-white mx-auto mt-6 rounded shadow-lg p-8 print:shadow-none print:m-0 print:p-0 print:w-full print:rounded-none" style={{ width: '297mm', minHeight: '210mm' }}>
                
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-emerald-700 pb-4 mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center text-3xl font-bold shadow-inner">
                            🫁
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-emerald-800 uppercase tracking-tight">รายงานสรุปทางคลินิก (Patient Clinical Summary)</h1>
                            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-0.5">Palliative Care Information System</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="bg-slate-50 border-2 px-4 py-2 rounded-lg border-slate-200">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">วันที่พิมพ์รายงาน</p>
                            <p className="text-sm font-mono font-black text-slate-800 tracking-wider mt-0.5">{new Date().toLocaleString('th-TH')}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-6">
                    {/* Left Column (Patient Info + Equipment) */}
                    <div className="col-span-4 space-y-4">
                        
                        {/* Patient Demographics */}
                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 h-[190px]">
                            <h3 className="text-xs font-black text-emerald-700 uppercase mb-3 flex items-center gap-1.5"><HeartPulse className="w-4 h-4"/> ข้อมูลผู้ป่วย</h3>
                            <p className={`text-xl font-black ${isDeath ? 'text-red-700' : 'text-slate-800'}`}>
                                {pt.name} 
                                {isDeath && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-lg align-middle">เสียชีวิต</span>}
                            </p>
                            <div className="mt-2 text-sm text-slate-600 font-semibold space-y-1">
                                <p>HN: <span className="text-slate-900">{pt.id}</span></p>
                                <p>อายุ: <span className="text-slate-900">{pt.age || '-'} ปี</span> • เพศ: <span className="text-slate-900">{pt.gender || '-'}</span></p>
                                <p>การวินิจฉัย (Dx): <span className="text-emerald-800 font-bold">{pt.disease}</span></p>
                                <p>สถานะคลินิก: <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md">{pt.clinicalStatus || 'Admit'}</span></p>
                                <p>ผู้ดูแล: <span className="text-slate-900">{pt.caregiverName || '-'} ({pt.caregiverRelation || '-'})</span></p>
                                <p>เบอร์ติดต่อ: <span className="text-slate-900">{pt.relativePhone || pt.phone || '-'}</span></p>
                            </div>
                        </div>

                        {/* Equipments */}
                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 h-[175px]">
                            <h3 className="text-xs font-black text-emerald-700 uppercase mb-2 flex items-center gap-1.5"><ShieldAlert className="w-4 h-4"/> เครื่องมือแพทย์ที่กำลังยืม (Active Equipments)</h3>
                            {data.equipments.length === 0 ? (
                                <p className="text-slate-400 font-semibold text-sm italic mt-4 text-center">ไม่มีรายการเครื่องมือค้างยืม</p>
                            ) : (
                                <ul className="list-disc pl-5 text-xs font-semibold text-slate-700 space-y-1.5">
                                    {data.equipments.map((eq, i) => (
                                        <li key={i}>{eq}</li>
                                    ))}
                                </ul>
                            )}
                        </div>

                    </div>

                    {/* Middle Column (ESAS History) */}
                    <div className="col-span-8">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-[380px] flex flex-col">
                            <h3 className="text-xs font-black text-indigo-700 uppercase mb-4 flex items-center gap-1.5 justify-between">
                                <span className="flex items-center gap-1.5"><Activity className="w-4 h-4"/> ประวัติผลการประเมินอาการ (ESAS History)</span>
                            </h3>
                            
                            {!data.assessments || data.assessments.length === 0 ? (
                                <div className="flex-1 flex justify-center items-center text-slate-400 font-bold text-sm italic">ยังไม่มีข้อมูลการประเมิน</div>
                            ) : (
                                <div className="overflow-auto flex-1 pr-2">
                                    <table className="w-full text-center border-collapse border-b border-slate-200">
                                        <thead className="bg-indigo-50 text-[10px] font-black text-indigo-800 uppercase sticky top-0">
                                            <tr>
                                                <th className="border-y border-slate-200 px-2 py-2 text-left bg-indigo-50">วัน-เวลา</th>
                                                {symptomsList.map(s => <th key={s.key} className="border-y border-slate-200 px-1 py-2 bg-indigo-50">{s.short}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.assessments.slice(0, 15).map((ass, idx) => (
                                                <tr key={idx} className="bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                                                    <td className="border-b border-slate-200 px-2 py-2 whitespace-nowrap text-left">{ass.date} {ass.createdAt?.toDate ? ass.createdAt.toDate().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''}</td>
                                                    {symptomsList.map(s => {
                                                        const val = (ass.scores && ass.scores[s.key]) ?? 0;
                                                        const isHigh = val >= 7;
                                                        return (
                                                            <td key={s.key} className={`border-b border-slate-200 px-1 py-2 ${isHigh ? 'text-red-600 font-black bg-red-50/50' : 'text-slate-600'}`}>
                                                                {val}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Row (Timeline) */}
                <div className="mt-6">
                    <h3 className="text-xs font-black text-emerald-700 uppercase mb-3 flex items-center gap-1.5 border-b-2 border-emerald-100 pb-2">
                        <ClipboardList className="w-4 h-4"/> ประวัติเหตุการณ์ล่าสุด (Recent Timeline Events)
                    </h3>
                    {data.timeline.length === 0 ? (
                        <p className="text-slate-400 font-semibold text-sm italic text-center py-4">ไม่มีประวัติเหตุการณ์</p>
                    ) : (
                        <table className="w-full text-left border-collapse border border-slate-200">
                            <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase">
                                <tr>
                                    <th className="border border-slate-200 px-3 py-2 w-[15%]">วัน-เวลา</th>
                                    <th className="border border-slate-200 px-3 py-2 w-[20%]">หมวดหมู่</th>
                                    <th className="border border-slate-200 px-3 py-2 w-[50%]">รายละเอียด</th>
                                    <th className="border border-slate-200 px-3 py-2 w-[15%]">ผู้บันทึก</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.timeline.map((log, idx) => (
                                    <tr key={idx} className="bg-white text-[11px] font-semibold text-slate-700">
                                        <td className="border border-slate-200 px-3 py-2 whitespace-nowrap">{log.date} {log.time}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-emerald-800">{log.title}</td>
                                        <td className="border border-slate-200 px-3 py-2 leading-relaxed">{log.content}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-slate-500">{log.recordedBy}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

            </div>
            
            {/* Global Print Styles inside React */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { size: A4 landscape; margin: 0; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
                }
            `}} />
        </div>
    );
}
