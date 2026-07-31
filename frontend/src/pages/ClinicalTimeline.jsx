import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, CheckCircle, TrendingUp, AlertTriangle, User, MapPin, Sparkles, Phone, Pill, Activity, Users, Home, ClipboardList, Clock, X, Send, ShieldAlert } from 'lucide-react';
import { apiGet, apiPost } from '../config';

export default function ClinicalTimeline({ token }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [eventLogs, setEventLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notes');
  const [selectedSymptom, setSelectedSymptom] = useState('shortnessOfBreath');
  const [category, setCategory] = useState('call'); const [content, setContent] = useState(''); const [recordedBy, setRecordedBy] = useState('พย. สมหญิง (เวรเช้า)'); const [submittingLog, setSubmittingLog] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false); const [aiSummary, setAiSummary] = useState(''); const [aiLoading, setAiLoading] = useState(false);

  const symptomsList = [
    { key:'pain',label:'ความปวด',color:'bg-red-500',stroke:'#ef4444'},{ key:'shortnessOfBreath',label:'หายใจเหนื่อยหอบ',color:'bg-orange-500',stroke:'#f97316'},{ key:'tiredness',label:'ความเหนื่อยล้า',color:'bg-amber-500',stroke:'#f59e0b'},{ key:'drowsiness',label:'ความง่วงซึม',color:'bg-yellow-500',stroke:'#eab308'},{ key:'nausea',label:'คลื่นไส้',color:'bg-lime-500',stroke:'#84cc16'},{ key:'appetite',label:'ความอยากอาหาร',color:'bg-emerald-500',stroke:'#10b981'},{ key:'depression',label:'ซึมเศร้า',color:'bg-purple-500',stroke:'#a855f7'},{ key:'anxiety',label:'วิตกกังวล',color:'bg-pink-500',stroke:'#ec4899'},{ key:'wellbeing',label:'สุขภาวะ',color:'bg-blue-500',stroke:'#3b82f6'}
  ];

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet('/api/patients');
        const found = data.find(p => p.id === id); setPatient(found);
        const assessmentsData = await apiGet('/api/assessments/' + id); setAssessments(assessmentsData);
        const logs = await apiGet('/api/patients/' + id + '/event-logs'); setEventLogs(logs);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    })();
  }, [id, token]);

  const activeSymptom = symptomsList.find(s => s.key === selectedSymptom);
  const width=600, height=250, padding=40;

  const getSvgElements = () => {
    if(assessments.length===0) return null;
    const cw=width-padding*2, ch=height-padding*2;
    const points = assessments.map((a,i)=>{
      const x=padding+(i/(assessments.length>1?assessments.length-1:1))*cw;
      const val=a.scores[selectedSymptom]||0; const y=padding+(1-val/10)*ch;
      return {x,y,val,date:a.date,round:a.round};
    });
    let d=`M ${points[0].x} ${points[0].y}`;
    for(let i=1;i<points.length;i++) d+=` L ${points[i].x} ${points[i].y}`;
    return {points,pathD:d};
  };
  const chartData = getSvgElements();

  const handleAddLog = async (e) => {
    e.preventDefault(); if(!content.trim()) return; setSubmittingLog(true);
    const tm={call:'ญาติโทรปรึกษา',medication:'ปรับยา/ให้ยาฉุกเฉิน',deterioration:'อาการทรุด/เปลี่ยนแปลง',visit:'เยี่ยมบ้าน',other:'อื่น ๆ'};
    try {
      const data=await apiPost('/api/patients/'+id+'/event-logs',{category,title:tm[category]||'บันทึกเหตุการณ์',content,recordedBy});
      setEventLogs(prev=>[data,...prev]); setContent('');
    } catch(err){ console.error(err); } finally { setSubmittingLog(false); }
  };

  const handleAiSummary = async () => {
    setShowAiModal(true); setAiLoading(true); setAiSummary('');
    try { const data=await apiPost('/api/patients/'+id+'/ai-summary',{}); setAiSummary(data.summary); } catch(err){ setAiSummary('เกิดข้อผิดพลาด'); } finally { setAiLoading(false); }
  };

  const getTimelineIcon = (cat) => {
    switch(cat){ case'call':return <div className="w-10 h-10 rounded-full bg-amber-500 border-2 border-white text-white flex items-center justify-center shadow-md"><Phone className="w-5 h-5"/></div>; case'medication':return <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-white text-white flex items-center justify-center shadow-md"><Pill className="w-5 h-5"/></div>; case'deterioration':return <div className="w-10 h-10 rounded-full bg-rose-600 border-2 border-white text-white flex items-center justify-center shadow-md"><Activity className="w-5 h-5"/></div>; case'visit':return <div className="w-10 h-10 rounded-full bg-teal-500 border-2 border-white text-white flex items-center justify-center shadow-md"><Home className="w-5 h-5"/></div>; default:return <div className="w-10 h-10 rounded-full bg-slate-400 border-2 border-white text-white flex items-center justify-center shadow-md"><FileText className="w-5 h-5"/></div>; }
  };

  const renderAiSummary = (text) => {
    if(!text) return null;
    return text.split('\n').map((line,idx)=>{
      if(line.startsWith('###')) return <h4 key={idx} className="text-lg font-black text-slate-800 border-b border-slate-100 pb-2 mt-4 mb-2">{line.replace('###','').trim()}</h4>;
      if(line.startsWith('- **')){ const m=line.match(/-\s+\*\*(.*?)\*\*:(.*)/); if(m) return <div key={idx} className="ml-2 my-2 text-sm"><span className="font-extrabold text-slate-700">{m[1]}:</span><span className="text-slate-600 ml-1">{m[2]}</span></div>; }
      if(/^\d+\./.test(line.trim())){ const m=line.match(/^(\d+)\.\s+(\*\*(.*?)\*\*)?(.*)/); if(m) return <div key={idx} className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 my-2 text-sm leading-relaxed"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs mr-2">{m[1]}</span>{m[3]&&<span className="font-extrabold text-blue-900">{m[3]}</span>}<span className="text-slate-700 ml-1">{m[4]}</span></div>; }
      if(line.trim()==='') return <div key={idx} className="h-2"></div>;
      return <p key={idx} className="text-sm text-slate-600 my-1">{line}</p>;
    });
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={()=>navigate('/dashboard')} className="p-2.5 hover:bg-slate-100 rounded-2xl"><ArrowLeft className="w-5 h-5 text-slate-600"/></button>
          <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold shadow-inner">👤</div><div><div className="flex items-center gap-2"><h2 className="text-xl font-extrabold text-slate-900">{patient?.name}</h2><span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span></div><p className="text-xs text-slate-500 font-bold mt-1">HN: {patient?.id} • {patient?.disease}</p></div></div>
        </div>
        <button onClick={handleAiSummary} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-purple-500/20"><Sparkles className="w-4 h-4 text-purple-200 fill-purple-200 animate-pulse"/>ให้ AI สรุปเคสนี้</button>
      </header>
      {showAiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50"><h3 className="text-base font-black text-slate-800 flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-600"/>สรุปภาพรวมและวิเคราะห์คนไข้</h3><button onClick={()=>setShowAiModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button></div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">{aiLoading?<div className="flex flex-col items-center justify-center py-12 space-y-3"><div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div><p className="text-sm font-bold text-slate-400 animate-pulse">กำลังวิเคราะห์...</p></div>:<div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 leading-relaxed text-slate-700">{renderAiSummary(aiSummary)}</div>}</div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end"><button onClick={()=>setShowAiModal(false)} className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900">รับทราบคำแนะนำ</button></div>
          </div>
        </div>
      )}
      <div className="px-8 bg-white border-b border-slate-200 flex gap-6 sticky top-[89px] z-10 shadow-sm">
        <button onClick={()=>setActiveTab('notes')} className={`py-4 px-2 border-b-2 font-black text-sm flex items-center gap-2 ${activeTab==='notes'?'border-blue-600 text-blue-600':'border-transparent text-slate-500 hover:text-slate-800'}`}><ClipboardList className="w-4 h-4"/>บันทึกการพยาบาล</button>
        <button onClick={()=>setActiveTab('graphs')} className={`py-4 px-2 border-b-2 font-black text-sm flex items-center gap-2 ${activeTab==='graphs'?'border-blue-600 text-blue-600':'border-transparent text-slate-500 hover:text-slate-800'}`}><TrendingUp className="w-4 h-4"/>กราฟแนวโน้ม</button>
      </div>
      <div className="p-8 max-w-7xl mx-auto w-full flex-1">
        {loading?<div className="text-center text-slate-400 font-bold p-8">กำลังโหลด...</div>:!patient?<div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">ไม่พบผู้ป่วย</div>:activeTab==='notes'?(
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-800 pb-2 border-b border-slate-100">➕ เพิ่มบันทึก</h3>
              <form onSubmit={handleAddLog} className="space-y-4">
                <div><label className="block text-xs font-bold text-slate-700 mb-1.5">หมวดหมู่</label><select value={category} onChange={e=>setCategory(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm bg-white"><option value="call">📞 ญาติโทรปรึกษา</option><option value="medication">💊 ปรับยา</option><option value="deterioration">📈 อาการทรุด</option><option value="visit">🏥 เยี่ยมบ้าน</option><option value="other">📝 อื่น ๆ</option></select></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1.5">รายละเอียด</label><textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="พิมพ์รายละเอียด..." rows="5" required className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm"/></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1.5">ผู้บันทึก</label><input type="text" value={recordedBy} onChange={e=>setRecordedBy(e.target.value)} required className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm bg-slate-50 text-slate-600"/></div>
                <button type="submit" disabled={submittingLog} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"><CheckCircle className="w-4.5 h-4.5"/>บันทึก</button>
              </form>
            </div>
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Clock className="w-5 h-5 text-slate-500"/>ประวัติเหตุการณ์</h3><span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{eventLogs.length} รายการ</span></div>
              {eventLogs.length===0?<div className="text-center py-12 text-slate-400 font-bold text-sm">ยังไม่มีประวัติ</div>:(
                <div className="relative border-l border-slate-200 pl-6 ml-5 space-y-6">
                  {eventLogs.map(log=>(<div key={log.id} className="relative"><div className="absolute -left-11 top-0">{getTimelineIcon(log.category)}</div><div className="bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-2xl p-5 space-y-2"><div className="flex justify-between items-center text-xs font-bold text-slate-400"><h4 className="text-slate-850 font-black text-sm">{log.title}</h4><span>{log.date}, {log.time}</span></div><p className="text-sm text-slate-600 leading-relaxed">{log.content}</p><div className="text-[11px] text-slate-400 font-bold pt-1.5 flex justify-end">✍️ {log.recordedBy}</div></div></div>))}
                  <div className="text-center text-xs text-slate-400 font-bold pt-4">สิ้นสุดประวัติ</div>
                </div>
              )}
            </div>
          </div>
        ):(
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4"><div className="pb-4 border-b border-slate-100"><span className="text-xs font-black text-blue-600 uppercase">ข้อมูลผู้ป่วย</span><h3 className="text-lg font-bold text-slate-900 mt-1">{patient.name}</h3><p className="text-xs text-slate-500 font-medium mt-0.5">HN: {patient.id} • {patient.disease}</p></div><div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-500"><div><p>เพศ/อายุ</p><p className="text-sm font-black text-slate-800 mt-0.5">{patient.gender||'ไม่ระบุ'} / {patient.age||'ไม่ระบุ'} ปี</p></div><div><p>ผู้รับผิดชอบ</p><p className="text-sm font-black text-slate-800 mt-0.5">{patient.responsibleStaff||'ไม่ระบุ'}</p></div></div></div>
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3"><h4 className="text-sm font-black text-slate-800 uppercase">เลือกอาการ</h4><div className="grid grid-cols-1 gap-2">{symptomsList.map(s=><button key={s.key} onClick={()=>setSelectedSymptom(s.key)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-bold ${selectedSymptom===s.key?'bg-blue-50 border-blue-200 text-blue-700 shadow-sm':'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><span className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${s.color}`}></span>{s.label}</span></button>)}</div></div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4"><div className="flex justify-between items-center pb-4 border-b border-slate-100"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500"/>แนวโน้ม: {activeSymptom?.label}</h3></div>{assessments.length===0?<div className="h-60 flex items-center justify-center text-slate-400 font-bold text-sm">ยังไม่มีข้อมูล</div>:<div className="w-full overflow-hidden flex flex-col items-center justify-center p-2"><svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-xl">{[0,2,4,6,8,10].map(val=>{const y=padding+(1-val/10)*(height-padding*2);return <g key={val} className="opacity-40"><line x1={padding} y1={y} x2={width-padding} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4"/><text x={padding-10} y={y+4} textAnchor="end" fontSize="10" fontWeight="bold" fill="#94a3b8">{val}</text></g>})}{chartData&&<path d={chartData.pathD} fill="none" stroke={activeSymptom?.stroke||'#3b82f6'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>}{chartData&&chartData.points.map((pt,idx)=><g key={idx}><circle cx={pt.x} cy={pt.y} r="5" fill={activeSymptom?.stroke||'#3b82f6'} stroke="#fff" strokeWidth="2"/><title>{`${pt.date} คะแนน: ${pt.val}`}</title></g>)}</svg></div>}</div>
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 pb-4 border-b border-slate-100"><FileText className="w-5 h-5 text-slate-500"/>ประวัติแบบประเมิน ({assessments.length} รายการ)</h3><div className="space-y-4">{assessments.slice().reverse().map(ass=>(<div key={ass.id} className="p-5 rounded-2xl border bg-slate-50/50 border-slate-100"><div className="flex justify-between items-start"><div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-500"/><span className="text-sm font-black text-slate-700">{ass.date}</span><span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">รอบ {ass.round}</span></div></div><div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 mt-4">{symptomsList.map(s=><div key={s.key} className="bg-white p-2 rounded-xl border border-slate-200 text-center shadow-sm"><p className="text-[10px] font-bold text-slate-500">{s.label.split(' ')[0]}</p><p className={`text-base font-black mt-1 ${(ass.scores[s.key]||0)>=7?'text-red-600':'text-slate-800'}`}>{ass.scores[s.key]||0}</p></div>)}</div>{ass.notes&&<div className="mt-4 p-3 bg-white/70 border border-slate-200 rounded-xl text-sm text-slate-600"><strong>บันทึก:</strong> {ass.notes}</div>}</div>))}</div></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}