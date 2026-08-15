import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, FileText, CheckCircle, TrendingUp, AlertTriangle, 
  User, MapPin, Sparkles, Phone, Pill, Activity, Users, Home, 
  ClipboardList, Clock, X, Send, ShieldAlert, Heart, HeartPulse, Gauge, Thermometer, Wind, Printer, Trash2
} from 'lucide-react';
import { db, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, addDoc, orderBy } from '../services/firebase';
import { writeAuditLog } from '../services/auditLog';

export default function ClinicalTimeline({ token, user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [eventLogs, setEventLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notes');
  // Multi-select symptom overlay — start empty, click to show
  const [selectedSymptoms, setSelectedSymptoms] = useState(new Set());
  const toggleSymptom = (key) => {
    setSelectedSymptoms(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const [category, setCategory] = useState('call');
  const [content, setContent] = useState('');
  const [recordedBy, setRecordedBy] = useState('พย.วิกานดา');
  const [submittingLog, setSubmittingLog] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const formatForDatetimeLocal = (d) => {
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const [logDatetime, setLogDatetime] = useState(formatForDatetimeLocal(new Date()));

  const symptomsList = [
    { key: 'pain', label: 'ความปวด', color: 'bg-red-500', stroke: '#ef4444' },
    { key: 'shortnessOfBreath', label: 'หายใจเหนื่อยหอบ', color: 'bg-orange-500', stroke: '#f97316' },
    { key: 'tiredness', label: 'ความเหนื่อยล้า/อ่อนเพลีย', color: 'bg-amber-500', stroke: '#f59e0b' },
    { key: 'drowsiness', label: 'ความง่วงซึม', color: 'bg-yellow-500', stroke: '#eab308' },
    { key: 'nausea', label: 'คลื่นไส้/อาเจียน', color: 'bg-lime-500', stroke: '#84cc16' },
    { key: 'appetite', label: 'ความอยากอาหาร', color: 'bg-emerald-500', stroke: '#10b981' },
    { key: 'depression', label: 'ซึมเศร้า/หดหู่', color: 'bg-purple-500', stroke: '#a855f7' },
    { key: 'anxiety', label: 'วิตกกังวล', color: 'bg-pink-500', stroke: '#ec4899' },
    { key: 'wellbeing', label: 'สุขภาวะโดยรวม', color: 'bg-blue-500', stroke: '#3b82f6' }
  ];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const patientRef = doc(db, 'patients', id);
        const patientSnap = await getDoc(patientRef);
        if (patientSnap.exists()) {
          setPatient({ id: patientSnap.id, ...patientSnap.data() });
        } else {
          setPatient(null);
        }

        const assQ = query(collection(db, 'assessments'), where('patientId', '==', id));
        const assSnap = await getDocs(assQ);
        const assessmentsData = assSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeA - timeB;
          });
        setAssessments(assessmentsData);

        const logsQ = query(collection(db, 'patients', id, 'eventLogs'), orderBy('createdAt', 'desc'));
        const logsSnap = await getDocs(logsQ);
        const logsData = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setEventLogs(logsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  const activeSymptoms = symptomsList.filter(s => selectedSymptoms.has(s.key));
  const width = 600, height = 250, padding = 40;

  // Build per-symptom SVG path data
  const getSymptomSvgData = (symptomKey) => {
    if (assessments.length === 0) return null;
    const cw = width - padding * 2, ch = height - padding * 2;
    const points = assessments.map((a, i) => {
      const x = padding + (i / (assessments.length > 1 ? assessments.length - 1 : 1)) * cw;
      const val = (a.scores && a.scores[symptomKey]) || 0;
      const y = padding + (1 - val / 10) * ch;
      let daysPassed = 0;
      if (i > 0) {
        const prevTime = assessments[i-1].createdAt?.toMillis ? assessments[i-1].createdAt.toMillis() : new Date(assessments[i-1].createdAt || assessments[i-1].date).getTime();
        const currTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || a.date).getTime();
        if (currTime && prevTime) daysPassed = Math.floor(Math.max(0, currTime - prevTime) / (1000 * 60 * 60 * 24));
      }
      return { x, y, val, date: a.date, daysPassed };
    });
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) d += ` L ${points[i].x} ${points[i].y}`;
    return { points, pathD: d };
  };

  // Shared x-axis labels — use any symptom for coordinate reference
  const xRefKey = activeSymptoms[0]?.key || symptomsList[0].key;
  const baseChartData = assessments.length > 0 ? getSymptomSvgData(xRefKey) : null;

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmittingLog(true);
    const tm = {
      call: '📞 ญาติโทรปรึกษา',
      medication: '💊 ปรับยา/ให้ยาฉุกเฉิน',
      deterioration: '🚨 อาการทรุด/เปลี่ยนแปลง',
      visit: '🏡 เยี่ยมบ้าน (Home Visit)',
      other: '📝 บันทึกอื่น ๆ'
    };
    try {
      const selectedDate = new Date(logDatetime);
      const newLog = {
        category,
        title: tm[category] || 'บันทึกเหตุการณ์',
        content,
        recordedBy,
        createdAt: selectedDate.toISOString(),
        date: selectedDate.toLocaleDateString('th-TH'),
        time: selectedDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      };
      const logRef = await addDoc(collection(db, 'patients', id, 'eventLogs'), newLog);
      setEventLogs(prev => [{ id: logRef.id, ...newLog }, ...prev]);
      writeAuditLog(user, 'ADD_EVENT', 'timeline', id, patient?.name || id, newLog.title);
      setContent('');
      setLogDatetime(formatForDatetimeLocal(new Date()));
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateDoc(doc(db, 'patients', id), {
        clinicalStatus: newStatus
      });
      setPatient(prev => ({ ...prev, clinicalStatus: newStatus }));
      
      const newLog = {
        category: 'other',
        title: `🔄 เปลี่ยนสถานะผู้ป่วยเป็น: ${newStatus}`,
        content: `เจ้าหน้าที่อัปเดตสถานะผู้ป่วยเป็น ${newStatus}`,
        recordedBy: 'ระบบ',
        createdAt: new Date().toISOString(),
        date: new Date().toLocaleDateString('th-TH'),
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      };
      await addDoc(collection(db, 'patients', id, 'eventLogs'), newLog);
      setEventLogs(prev => [newLog, ...prev]);
      writeAuditLog(user, 'CHANGE_STATUS', 'patients', id, patient?.name || id, `เปลี่ยนเป็น: ${newStatus}`);
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถอัปเดตสถานะได้: ' + err.message);
    }
  };

  const handleDeleteLog = async (log) => {
    const isConfirm = window.confirm(`คุณต้องการลบรายการ "${log.title}" ใช่หรือไม่?`);
    if (!isConfirm) return;

    try {
      if (log.isAssessment) {
        await deleteDoc(doc(db, 'assessments', log.id));
        setAssessments(prev => prev.filter(a => a.id !== log.id));
        writeAuditLog(user, 'DELETE_ASSESSMENT', 'assessments', log.id, patient?.name || id, `ลบแบบประเมินวันที่ ${log.date}`);
      } else {
        await deleteDoc(doc(db, 'patients', id, 'eventLogs', log.id));
        setEventLogs(prev => prev.filter(e => e.id !== log.id));
        writeAuditLog(user, 'DELETE_EVENT', 'eventLogs', log.id, patient?.name || id, `ลบบันทึก: ${log.title}`);
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถลบรายการได้: ' + err.message);
    }
  };

  const combinedTimeline = [
    ...eventLogs.map(log => ({ 
      ...log, 
      isAssessment: false, 
      sortTime: new Date(log.createdAt).getTime() 
    })), 
    ...assessments.map(ass => ({
      id: ass.id,
      isAssessment: true,
      title: `📊 ประเมินอาการ`,
      date: ass.date,
      time: ass.createdAt?.toDate ? ass.createdAt.toDate().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '',
      sortTime: ass.createdAt?.toMillis ? ass.createdAt.toMillis() : 0,
      assData: ass
    }))
  ].sort((a, b) => b.sortTime - a.sortTime);

  const handleAiSummary = async () => {
    setShowAiModal(true);
    setAiLoading(true);
    setAiSummary('');
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const latestAss = assessments[assessments.length - 1];
      let summaryText = `### สรุปภาพรวมอาการผู้ป่วย\n`;
      summaryText += `- **ผู้ป่วย**: ${patient?.name} (HN: ${patient?.id})\n`;
      summaryText += `- **โรคประจำตัว**: ${patient?.disease}\n\n`;
      if (latestAss && latestAss.scores) {
          summaryText += `### การประเมินล่าสุด (${latestAss.date} รอบ ${latestAss.round})\n`;
          let criticals = [];
          Object.entries(latestAss.scores).forEach(([key, val]) => {
              if (val >= 7) criticals.push(key);
          });
          if (criticals.length > 0) {
              summaryText += `1. **พบอาการวิกฤตที่ต้องจัดการด่วน (คะแนน >= 7)**: ผู้ป่วยมีอาการระดับรุนแรง กรุณาตรวจสอบบันทึกและพิจารณาปรับยา\n`;
          } else {
              summaryText += `1. **อาการทรงตัว**: คะแนนส่วนใหญ่อยู่ในระดับที่ควบคุมได้\n`;
          }
      } else {
          summaryText += `1. **ยังไม่มีข้อมูลประเมิน**: ผู้ป่วยยังไม่ได้ทำแบบประเมิน ESAS\n`;
      }
      summaryText += `\n2. **แผนการดูแล**: แนะนำให้ติดตามอาการอย่างใกล้ชิด และแนะนำให้ญาติโทรแจ้งหากอาการเปลี่ยนแปลงกะทันหัน`;
      setAiSummary(summaryText);
    } catch (err) {
      setAiSummary('เกิดข้อผิดพลาดในการประมวลผลข้อมูล AI สรุปเคส');
    } finally {
      setAiLoading(false);
    }
  };

  const getTimelineIcon = (cat) => {
    switch (cat) {
      case 'call':
        return <div className="w-10 h-10 rounded-2xl bg-amber-500 border-2 border-white text-white flex items-center justify-center shadow-md"><Phone className="w-5 h-5" /></div>;
      case 'medication':
        return <div className="w-10 h-10 rounded-2xl bg-blue-600 border-2 border-white text-white flex items-center justify-center shadow-md"><Pill className="w-5 h-5" /></div>;
      case 'deterioration':
        return <div className="w-10 h-10 rounded-2xl bg-rose-600 border-2 border-white text-white flex items-center justify-center shadow-md"><Activity className="w-5 h-5" /></div>;
      case 'visit':
        return <div className="w-10 h-10 rounded-2xl bg-emerald-600 border-2 border-white text-white flex items-center justify-center shadow-md"><Home className="w-5 h-5" /></div>;
      default:
        return <div className="w-10 h-10 rounded-2xl bg-slate-500 border-2 border-white text-white flex items-center justify-center shadow-md"><FileText className="w-5 h-5" /></div>;
    }
  };

  const renderAiSummary = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('###')) {
        return <h4 key={idx} className="text-base font-black text-slate-800 border-b border-slate-100 pb-2 mt-4 mb-2 text-emerald-800">{line.replace('###', '').trim()}</h4>;
      }
      if (line.startsWith('- **')) {
        const m = line.match(/-\s+\*\*(.*?)\*\*:(.*)/);
        if (m) return (
          <div key={idx} className="ml-2 my-2 text-sm">
            <span className="font-extrabold text-slate-800">{m[1]}:</span>
            <span className="text-slate-600 ml-1">{m[2]}</span>
          </div>
        );
      }
      if (/^\d+\./.test(line.trim())) {
        const m = line.match(/^(\d+)\.\s+(\*\*(.*?)\*\*)?(.*)/);
        if (m) return (
          <div key={idx} className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 my-2 text-sm leading-relaxed">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 font-bold text-xs mr-2">{m[1]}</span>
            {m[3] && <span className="font-extrabold text-emerald-950">{m[3]}</span>}
            <span className="text-slate-700 ml-1">{m[4]}</span>
          </div>
        );
      }
      if (line.trim() === '') return <div key={idx} className="h-2"></div>;
      return <p key={idx} className="text-sm text-slate-600 my-1">{line}</p>;
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-10 flex flex-wrap justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2.5 hover:bg-slate-100 rounded-2xl text-slate-600 transition-all cursor-pointer"
            title="กลับหน้ารวมผู้ป่วย"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold shadow-inner">
              🫁
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">{patient?.name}</h2>
                <select 
                  value={patient?.clinicalStatus || 'Admit'} 
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-black border outline-none cursor-pointer ${
                    patient?.clinicalStatus === 'Admit' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    patient?.clinicalStatus === 'เสียชีวิต' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  <option value="Admit">Admit (กำลังดูแล)</option>
                  <option value="D/C">D/C (จำหน่าย)</option>
                  <option value="เสียชีวิต">เสียชีวิต</option>
                </select>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                HN: {patient?.id} • <span className="text-emerald-800">{patient?.disease}</span>
              </p>
            </div>
          </div>
        </div>
        
        {/* Print Report Button */}
        <div>
          <button
            onClick={() => navigate(`/patients/report/${id}`)}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm border border-emerald-200 cursor-pointer"
            title="พิมพ์รายงานสรุปทางคลินิกเพื่อส่งแพทย์"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">พิมพ์รายงานแพทย์</span>
          </button>
        </div>
      </header>

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl animate-scaleUp">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-emerald-50/70">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2 text-emerald-900">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span>สรุปภาพรวมและวิเคราะห์ทางคลินิก (Clinical AI Assistant)</span>
              </h3>
              <button 
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200/50 transition-all cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-4">
              {aiLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                  <p className="text-sm font-bold text-slate-500 animate-pulse">กำลังประมวลผลคะแนน ESAS และประวัติเพื่อวิเคราะห์...</p>
                </div>
              ) : (
                <div className="bg-slate-50/60 rounded-2xl p-6 border border-slate-100 leading-relaxed text-slate-700">
                  {renderAiSummary(aiSummary)}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowAiModal(false)}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer"
              >
                รับทราบข้อเสนอแนะ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="px-8 bg-white border-b border-slate-200 flex gap-6 sticky top-[89px] z-10 shadow-sm">
        <button
          onClick={() => setActiveTab('notes')}
          className={`py-4 px-2 border-b-2 font-black text-sm flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'notes'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>บันทึกการพยาบาล & ไทม์ไลน์ (Timeline)</span>
        </button>
        <button
          onClick={() => setActiveTab('graphs')}
          className={`py-4 px-2 border-b-2 font-black text-sm flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'graphs'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>กราฟแนวโน้มอาการ ESAS</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex-1">
        {loading ? (
          <div className="text-center text-slate-400 font-bold p-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span>กำลังโหลดประวัติทางคลินิก...</span>
          </div>
        ) : !patient ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-3xl text-red-700 text-sm font-bold flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <span>ไม่พบข้อมูลผู้ป่วยรหัส {id}</span>
          </div>
        ) : activeTab === 'notes' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Form: เพิ่มบันทึก */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2 text-emerald-800">
                <span>➕ เพิ่มบันทึกการดูแล</span>
              </h3>
              <form onSubmit={handleAddLog} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">หมวดหมู่เหตุการณ์</label>
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm font-semibold bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="call">📞 ญาติโทรปรึกษา / รายงานอาการ</option>
                    <option value="medication">💊 ปรับยา / สั่งจ่ายยาฉุกเฉิน</option>
                    <option value="deterioration">🚨 อาการทรุด / ต้องเฝ้าระวัง</option>
                    <option value="visit">🏡 เยี่ยมบ้าน (Home Visit)</option>
                    <option value="other">📝 บันทึกความก้าวหน้าอื่น ๆ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">วันที่และเวลา</label>
                  <input 
                    type="datetime-local" 
                    value={logDatetime} 
                    onChange={e => setLogDatetime(e.target.value)} 
                    required 
                    className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">รายละเอียดการดูแล / สื่อสาร</label>
                  <textarea 
                    value={content} 
                    onChange={e => setContent(e.target.value)} 
                    placeholder="ระบุข้อความ เช่น ญาติแจ้งว่าคนไข้มีอาการหอบเหนื่อยเพิ่มขึ้น ได้แนะนำการจัดท่านั่งและพ่นยา..." 
                    rows={5} 
                    required 
                    className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ผู้บันทึก</label>
                  <input 
                    type="text" 
                    value={recordedBy} 
                    onChange={e => setRecordedBy(e.target.value)} 
                    required 
                    className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm font-semibold bg-slate-50 text-slate-700"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={submittingLog} 
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>บันทึกลงไทม์ไลน์</span>
                </button>
              </form>
            </div>

            {/* Right: History Timeline */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  <span>ประวัติเหตุการณ์และการติดตาม ({eventLogs.length} รายการ)</span>
                </h3>
              </div>

              {combinedTimeline.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold text-sm">
                  ยังไม่มีบันทึกเหตุการณ์สำหรับผู้ป่วยรายนี้
                </div>
              ) : (
                <div className="relative border-l-2 border-emerald-200 pl-6 ml-5 space-y-6">
                  {combinedTimeline.map(log => (
                    <div key={log.id} className="relative">
                      <div className="absolute -left-[45px] top-0">
                        {log.isAssessment ? (
                           <div className="w-10 h-10 rounded-2xl bg-indigo-500 border-2 border-white text-white flex items-center justify-center shadow-md"><ClipboardList className="w-5 h-5" /></div>
                        ) : getTimelineIcon(log.category)}
                      </div>
                      <div className="bg-slate-50/90 hover:bg-white border border-slate-200/80 rounded-2xl p-5 space-y-2 shadow-xs transition-all">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                          <h4 className={`font-black text-sm ${log.isAssessment ? 'text-indigo-700' : 'text-slate-900'}`}>{log.title}</h4>
                          <div className="flex items-center gap-2">
                            <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600">
                              {log.date} {log.time && `• ${log.time}`}
                            </span>
                            <button 
                              onClick={() => handleDeleteLog(log)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="ลบรายการนี้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {log.isAssessment ? (
                          <div className="mt-3">
                            <div className="grid grid-cols-4 sm:grid-cols-9 gap-1.5">
                               {symptomsList.map(s => {
                                 const val = (log.assData.scores && log.assData.scores[s.key]) ?? 0;
                                 return (
                                   <div key={s.key} className="text-center p-1.5 bg-white border border-slate-100 rounded-xl shadow-xs">
                                     <p className="text-[9px] font-bold text-slate-400 truncate">{s.label.split('/')[0].split(' ')[0]}</p>
                                     <p className={`text-sm font-black ${val >= 7 ? 'text-red-500' : 'text-slate-700'}`}>{val}</p>
                                   </div>
                                 );
                               })}
                            </div>
                            {(log.assData.vitalSigns || log.assData.bp || log.assData.pulse) && (
                                <div className="flex flex-wrap gap-3 text-[10px] mt-3 font-bold text-slate-500 bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs">
                                   <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-rose-500"/> BP: {log.assData.vitalSigns?.bp || log.assData.bp || '-'}</span>
                                   <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-500"/> HR: {log.assData.vitalSigns?.pulse || log.assData.pulse || '-'}</span>
                                   <span className="flex items-center gap-1"><Thermometer className="w-3 h-3 text-amber-500"/> Temp: {log.assData.vitalSigns?.temp || log.assData.temp || '-'}</span>
                                   <span className="flex items-center gap-1"><Wind className="w-3 h-3 text-blue-500"/> SpO2: {log.assData.vitalSigns?.spo2 || log.assData.spo2 || '-'}</span>
                                </div>
                            )}
                            {log.assData.notes && (
                              <div className="text-xs text-slate-600 mt-3 bg-amber-50/70 border border-amber-100 p-2.5 rounded-xl font-medium">💬 {log.assData.notes}</div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-700 leading-relaxed font-medium mt-1">
                            {log.content}
                          </p>
                        )}
                        {!log.isAssessment && (
                          <div className="text-[11px] text-slate-400 font-bold pt-2 flex justify-end">
                            ✍️ โดย: {log.recordedBy}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Graph Tab — vertical stack layout */
          <div className="space-y-6">

            {/* 1. CHART — full width */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-wrap justify-between items-start gap-2 pb-4 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <span>แนวโน้มอาการ ESAS (0 – 10)</span>
                </h3>
                {/* Active legend badges */}
                <div className="flex flex-wrap gap-1.5">
                  {activeSymptoms.map(s => (
                    <span
                      key={s.key}
                      className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                      style={{ backgroundColor: s.stroke + '18', color: s.stroke }}
                      onClick={() => toggleSymptom(s.key)}
                      title="คลิกเพื่อเอาออก"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.stroke }} />
                      {s.label} ×
                    </span>
                  ))}
                </div>
              </div>

              {assessments.length === 0 ? (
                <div className="h-60 flex items-center justify-center text-slate-400 font-bold text-sm">
                  ยังไม่มีข้อมูลแบบประเมินสำหรับแสดงกราฟ
                </div>
              ) : selectedSymptoms.size === 0 ? (
                <div className="h-60 flex flex-col items-center justify-center text-slate-400 font-bold text-sm gap-2">
                  <TrendingUp className="w-10 h-10 opacity-20" />
                  <span>คลิกหัวข้ออาการด้านล่างเพื่อแสดงกราฟ</span>
                </div>
              ) : (
                <div className="w-full overflow-hidden" style={{ height: 280 }}>
                  <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
                    {/* Grid */}
                    {[0, 2, 4, 6, 8, 10].map(val => {
                      const y = padding + (1 - val / 10) * (height - padding * 2);
                      return (
                        <g key={val} opacity="0.4">
                          <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4" />
                          <text x={padding - 10} y={y + 4} textAnchor="end" fontSize="10" fontWeight="bold" fill="#94a3b8">{val}</text>
                        </g>
                      );
                    })}

                    {/* One line per selected symptom */}
                    {activeSymptoms.map(sym => {
                      const data = getSymptomSvgData(sym.key);
                      if (!data) return null;
                      return (
                        <g key={sym.key}>
                          <path d={data.pathD} fill="none" stroke={sym.stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
                          {data.points.map((pt, idx) => (
                            <circle key={idx} cx={pt.x} cy={pt.y} r="5" fill={sym.stroke} stroke="#fff" strokeWidth="2">
                              <title>{`${sym.label} — ${pt.date}: ${pt.val}/10`}</title>
                            </circle>
                          ))}
                        </g>
                      );
                    })}

                    {/* X-axis date labels */}
                    {baseChartData && baseChartData.points.map((pt, idx) => (
                      <g key={idx}>
                        <text x={pt.x} y={height - padding + 18} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#64748b">
                          {pt.date.split('/')[0] + '/' + pt.date.split('/')[1]}
                        </text>
                        {pt.daysPassed >= 0 && idx > 0 && (
                          <text x={pt.x} y={height - padding + 30} textAnchor="middle" fontSize="9" fill="#94a3b8">+{pt.daysPassed} วัน</text>
                        )}
                      </g>
                    ))}
                  </svg>
                </div>
              )}
            </div>

            {/* 2. SYMPTOM PILLS — horizontal scrollable row */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <h4 className="text-sm font-black text-emerald-800 uppercase tracking-wider shrink-0">เลือกอาการ</h4>
                {selectedSymptoms.size > 0 && (
                  <button
                    onClick={() => setSelectedSymptoms(new Set())}
                    className="text-xs font-bold text-slate-400 hover:text-red-400 transition-colors cursor-pointer ml-auto"
                  >
                    ล้างทั้งหมด
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {symptomsList.map(s => {
                  const active = selectedSymptoms.has(s.key);
                  return (
                    <button
                      key={s.key}
                      onClick={() => toggleSymptom(s.key)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-bold transition-all cursor-pointer ${
                        active ? 'border-2 text-slate-900 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                      style={active ? { borderColor: s.stroke, backgroundColor: s.stroke + '14', color: s.stroke } : {}}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.color}`} />
                      {s.label}
                      {active && <span className="ml-1 opacity-70">×</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. PATIENT INFO (compact) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
              <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">ข้อมูลทั่วไป</span>
              <div className="mt-2 flex flex-wrap gap-4 items-center">
                <div>
                  <p className="text-lg font-black text-slate-900">{patient.name}</p>
                  <p className="text-xs text-slate-400 font-bold">HN: {patient.id} • {patient.disease}</p>
                </div>
                <div className="flex gap-3 ml-auto text-xs font-bold text-slate-500">
                  <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    <p className="text-slate-400">เพศ/อายุ</p>
                    <p className="text-slate-800 font-black">{patient.gender || '-'} / {patient.age || '-'} ปี</p>
                  </div>
                  <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    <p className="text-slate-400">ผู้รับผิดชอบ</p>
                    <p className="text-slate-800 font-black">{patient.responsibleStaff || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. ASSESSMENT HISTORY */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 pb-4 border-b border-slate-100">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>ประวัติแบบประเมินทั้งหมด ({assessments.length} รอบ)</span>
              </h3>
              <div className="space-y-4">
                {assessments.slice().reverse().map(ass => (
                  <div key={ass.id} className="p-5 rounded-3xl border bg-slate-50/70 border-slate-200 space-y-4">
                    <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-black text-slate-800">{ass.date}</span>
                      </div>
                    </div>

                    {(ass.vitalSigns || ass.bp || ass.pulse || ass.temp || ass.spo2) && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700"><Activity className="w-3.5 h-3.5 text-rose-500" /><span>BP: {ass.vitalSigns?.bp || ass.bp || '-'}</span></div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-700"><Heart className="w-3.5 h-3.5 text-red-500" /><span>HR: {ass.vitalSigns?.pulse || ass.pulse || '-'} bpm</span></div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-700"><Thermometer className="w-3.5 h-3.5 text-amber-500" /><span>Temp: {ass.vitalSigns?.temp || ass.temp || '-'} °C</span></div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-700"><Wind className="w-3.5 h-3.5 text-blue-500" /><span>SpO2: {ass.vitalSigns?.spo2 || ass.spo2 || '-'}%</span></div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                      {symptomsList.map(s => {
                        const val = (ass.scores && ass.scores[s.key]) ?? 0;
                        const isHigh = val >= 7;
                        const isMid = val >= 4 && val <= 6;
                        return (
                          <div key={s.key} className={`p-2.5 rounded-2xl border text-center shadow-xs ${
                            isHigh ? 'bg-red-50 border-red-200 text-red-700'
                            : isMid ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : 'bg-white border-slate-200 text-slate-700'
                          }`}>
                            <p className="text-[10px] font-black truncate">{s.label.split('/')[0].split(' ')[0]}</p>
                            <p className={`text-base font-black mt-0.5 ${isHigh ? 'text-red-600' : 'text-slate-900'}`}>{val}</p>
                          </div>
                        );
                      })}
                    </div>

                    {ass.notes && (
                      <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-slate-700 leading-relaxed font-semibold">
                        <strong className="text-amber-800">💬 บันทึกเพิ่มเติมจากผู้ป่วย/ญาติ:</strong> {ass.notes}
                      </div>
                    )}


                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
