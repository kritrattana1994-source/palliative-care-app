import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, AlertCircle, CheckCircle, Clock, Link as LinkIcon, ExternalLink, Calendar, BellRing, ChevronDown, ChevronUp, User, MapPin, FileText, Heart } from 'lucide-react';
import { apiGet, apiPost, getAssessmentLink } from '../config';

export default function Dashboard({ token }) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [expandedPatientId, setExpandedPatientId] = useState(null);
  const navigate = useNavigate();

  const fetchPatients = async () => {
    try { const data = await apiGet('/api/patients'); setPatients(data); } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchPatients(); }, [token]);

  const handleCopyLink = async (patient) => {
    const link = getAssessmentLink(patient.token);
    try {
      await navigator.clipboard.writeText(link); setCopiedId(patient.id); setTimeout(() => setCopiedId(null), 2000);
      if (patient.status === 'ยังไม่ส่งลิงก์') {
        await apiPost('/api/patients/' + patient.id + '/generate-token', { status: 'ส่งแล้ว (รอผล)' });
        fetchPatients();
      }
    } catch (err) { alert('Failed to copy link'); }
  };

  const handleOpenLine = () => window.open('https://line.me/', '_blank');

  const isCritical = (a) => { if (!a?.scores) return false; const { pain, shortnessOfBreath, anxiety, depression } = a.scores; return pain >= 7 || shortnessOfBreath >= 7 || anxiety >= 7 || depression >= 7; };

  const activeCount = patients.length;
  const pendingLinkCount = patients.filter(p => p.status === 'ยังไม่ส่งลิงก์').length;
  const criticalCount = patients.filter(p => p.status === 'ประเมินแล้ว' && isCritical(p.latestAssessment)).length;
  const filteredPatients = patients.filter(p => p.name.includes(search) || p.id.includes(search) || (p.disease||'').toLowerCase().includes(search.toLowerCase()));

  const getTodayThaiDate = () => {
    const days = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
    const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    const now = new Date(); return `วัน${days[now.getDay()]}ที่ ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()+543}`;
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-10 flex justify-between items-center">
        <div><h2 className="text-2xl font-bold text-slate-800">ตารางงานประจำวัน</h2><p className="text-sm text-slate-500 font-medium mt-1">{getTodayThaiDate()} | รอบเช้า (09:00 น.)</p></div>
        <div className="flex items-center gap-3 bg-slate-100 border border-slate-200 px-4 py-2 rounded-full"><span className="text-xl">👩‍⚕️</span><span className="text-sm font-bold text-slate-700">พย.วิกานดา (แอดมิน)</span></div>
      </header>
      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        {error && <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-sm text-red-700"><AlertCircle className="w-5 h-5 shrink-0 text-red-600" /><span>{error}</span></div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-5"><div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl shadow-inner border border-blue-200">👥</div><div><p className="text-sm font-bold text-slate-500 mb-1">ผู้ป่วย Active</p><h3 className="text-3xl font-black text-slate-800">{loading?'...':activeCount} <span className="text-base font-semibold text-slate-400">ราย</span></h3></div></div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-5"><div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-2xl shadow-inner border border-amber-200">⏳</div><div><p className="text-sm font-bold text-slate-500 mb-1">รอส่งลิงก์</p><h3 className="text-3xl font-black text-slate-800">{loading?'...':pendingLinkCount} <span className="text-base font-semibold text-slate-400">ราย</span></h3></div></div>
          <div className={`bg-white rounded-2xl p-6 border shadow-sm flex items-center gap-5 relative overflow-hidden ${criticalCount>0?'border-red-200 bg-gradient-to-br from-white to-red-50':'border-slate-200'}`}>{criticalCount>0 && <div className="absolute -right-4 -top-4 text-red-100 opacity-50 text-8xl animate-pulse">🚨</div>}<div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-inner border z-10 ${criticalCount>0?'bg-red-100 border-red-200 text-red-600':'bg-slate-100 border-slate-200'}`}>🚨</div><div className="z-10"><p className={`text-sm font-bold mb-1 ${criticalCount>0?'text-red-600':'text-slate-500'}`}>แจ้งเตือนวิกฤต!</p><h3 className="text-3xl font-black text-slate-800">{loading?'...':criticalCount} <span className="text-base font-semibold text-slate-400">เคส</span></h3></div></div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50"><h3 className="text-lg font-bold text-slate-800">คิวส่งแบบประเมิน ESAS</h3><div className="relative"><span className="absolute left-4 top-3 text-slate-400 text-sm"><Search className="w-4 h-4" /></span><input type="text" placeholder="ค้นหา HN หรือ ชื่อ..." value={search} onChange={(e)=>setSearch(e.target.value)} className="pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all" /></div></div>
          <div className="overflow-x-auto">
            {loading ? <div className="p-8 text-center text-slate-400 font-bold">กำลังโหลดรายชื่อผู้ป่วย...</div> : filteredPatients.length===0 ? <div className="p-8 text-center text-slate-400 font-bold">ไม่พบข้อมูลรายชื่อผู้ป่วย</div> : (
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold"><th className="w-10 px-4 py-4"></th><th className="px-6 py-4">ข้อมูลผู้ป่วย</th><th className="px-6 py-4">เบอร์โทรญาติ</th><th className="px-6 py-4">สถานะประเมิน</th><th className="px-6 py-4">ผลคะแนน</th><th className="px-6 py-4 text-center">จัดการ</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map(patient => {
                    const latest = patient.latestAssessment; const critical = isCritical(latest); const isExpanded = expandedPatientId === patient.id;
                    return (<React.Fragment key={patient.id}>
                      <tr className={`transition-colors ${patient.status==='ประเมินแล้ว'&&critical?'bg-red-50/30 hover:bg-red-50/50':isExpanded?'bg-slate-50/80':'hover:bg-slate-50'}`}>
                        <td className="px-4 py-4 text-center"><button onClick={()=>setExpandedPatientId(isExpanded?null:patient.id)} className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-600 transition-all">{isExpanded?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</button></td>
                        <td className="px-6 py-4"><div className="font-bold text-slate-900 text-base">{patient.name}</div><div className="text-sm text-slate-500 mt-0.5">HN: {patient.id} <span className="mx-1 text-slate-300">•</span> {patient.disease}</div></td>
                        <td className="px-6 py-4 font-semibold text-slate-700">{patient.relativePhone}</td>
                        <td className="px-6 py-4">{patient.status==='ยังไม่ส่งลิงก์'?<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200"><span className="w-2 h-2 rounded-full bg-slate-400"></span> ยังไม่ส่งลิงก์</span>:patient.status==='ส่งแล้ว (รอผล)'?<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> ส่งแล้ว (รอผล)</span>:<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${critical?'bg-red-100 text-red-700 border-red-200 shadow-sm':'bg-emerald-50 text-emerald-700 border-emerald-200'}`}><span className={`w-2 h-2 rounded-full ${critical?'bg-red-600':'bg-emerald-500'}`}></span> ประเมินแล้ว</span>}</td>
                        <td className="px-6 py-4">{patient.status!=='ประเมินแล้ว'||!latest?<span className="text-slate-400 text-sm font-medium">-</span>:<div className="flex items-center gap-1.5">{Object.entries(latest.scores).map(([key,val])=>{const lb={pain:'ปวด',shortnessOfBreath:'หายใจ',anxiety:'กังวล',depression:'ซึมเศร้า',tiredness:'เหนื่อย',wellbeing:'สุขภาวะ'};const l=lb[key];if(!l)return null;const h=val>=7;if(!h&&val<=3&&key!=='wellbeing')return null;return <div key={key} title={`${l}: ${val}`} className={`w-7 h-7 rounded-md font-black flex items-center justify-center text-sm shadow-sm ${h?'bg-red-600 text-white':'bg-emerald-100 border border-emerald-200 text-emerald-800'}`}>{val}</div>})}{critical&&<span className="ml-2 text-xs font-black text-red-600 uppercase tracking-wider animate-pulse">วิกฤต!</span>}</div>}</td>
                        <td className="px-6 py-4"><div className="flex items-center justify-center gap-2">{patient.status==='ประเมินแล้ว'?<button onClick={()=>navigate(`/timeline/${patient.id}`)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 border border-blue-700 rounded-lg text-sm font-bold text-white hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/30"><Clock className="w-4 h-4"/>ดู Timeline</button>:<><button onClick={()=>handleCopyLink(patient)} className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-bold transition-all shadow-sm ${copiedId===patient.id?'bg-emerald-50 border-emerald-300 text-emerald-700':patient.status==='ส่งแล้ว (รอผล)'?'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed':'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'}`} disabled={patient.status==='ส่งแล้ว (รอผล)'&&copiedId!==patient.id}><LinkIcon className="w-4 h-4"/>{copiedId===patient.id?'คัดลอกแล้ว!':'📋 Copy ลิงก์'}</button><button onClick={()=>handleOpenLine(patient.relativePhone)} className="flex items-center gap-1.5 px-3 py-2 bg-line border border-line-hover rounded-lg text-sm font-bold text-white hover:bg-line-hover transition-all shadow-sm"><ExternalLink className="w-4 h-4"/>💬 เปิดแชท LINE</button></>}</div></td>
                      </tr>
                      {isExpanded && <tr className="bg-slate-50/70"><td colSpan={6} className="px-8 py-6 border-b border-slate-200"><div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 text-sm"><div className="space-y-3.5"><h4 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2 flex items-center gap-2"><User className="w-5 h-5 text-blue-500"/>ข้อมูลทั่วไป</h4><div className="grid grid-cols-2 gap-3 text-xs text-slate-600"><div><p className="font-bold text-slate-400">เพศ / อายุ</p><p className="text-slate-800 font-bold mt-0.5">{patient.gender||'ไม่ระบุ'} / {patient.age||'ไม่ระบุ'} ปี</p></div><div><p className="font-bold text-slate-400">เจ้าหน้าที่</p><p className="text-slate-800 font-bold mt-0.5">{patient.responsibleStaff||'ไม่ระบุ'}</p></div></div><div><p className="font-bold text-slate-400 text-xs">ที่อยู่</p><p className="text-slate-800 font-semibold mt-0.5 flex items-start gap-1"><MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5"/>{patient.address||'ไม่ระบุที่อยู่'}</p></div></div><div className="space-y-3.5"><h4 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2 flex items-center gap-2"><FileText className="w-5 h-5 text-amber-500"/>การดูแลประคับประคอง</h4><div className="grid grid-cols-2 gap-3 text-xs text-slate-600"><div><p className="font-bold text-slate-400">ญาติผู้ดูแล</p><p className="text-slate-800 font-bold mt-0.5">{patient.caregiverName||'ไม่ระบุ'}</p></div><div><p className="font-bold text-slate-400">เบอร์ติดต่อ</p><p className="text-slate-800 font-bold mt-0.5">{patient.relativePhone||'ไม่ระบุ'}</p></div></div><div><p className="font-bold text-slate-400 text-xs">Clinical Notes</p><p className="text-slate-800 font-semibold mt-0.5 bg-slate-50 p-3 rounded-xl border border-slate-100 italic leading-relaxed">{patient.clinicalNotes||'ไม่มีบันทึก'}</p></div>{latest?.notes && <div><p className="font-bold text-red-500 text-xs">บันทึกจากญาติ</p><p className="text-red-800 font-bold mt-0.5 bg-red-50/50 p-3 rounded-xl border border-red-100 leading-relaxed">"{latest.notes}"</p></div>}</div></div></td></tr>}
                    </React.Fragment>);
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3 text-sm text-blue-800"><span className="text-xl">💡</span><p><strong>คำแนะนำ:</strong> กด <strong>"📋 Copy ลิงก์"</strong> แล้ววางใน LINE ส่งให้ญาติ</p></div>
      </div>
    </div>
  );
}