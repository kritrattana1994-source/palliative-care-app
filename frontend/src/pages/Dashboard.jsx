import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, AlertCircle, CheckCircle2, Clock, Link as LinkIcon, ExternalLink, Calendar, ChevronDown, ChevronUp, User, MapPin, FileText, Heart, Activity, Check, Filter, Sparkles, Printer } from 'lucide-react';
import { getAssessmentLink } from '../config';
import { db, collection, onSnapshot, doc, updateDoc } from '../services/firebase';

export default function Dashboard({ token }) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [expandedPatientId, setExpandedPatientId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'patients'), (snapshot) => {
        const patientsData = [];
        snapshot.forEach((doc) => {
            patientsData.push({ id: doc.id, ...doc.data() });
        });
        setPatients(patientsData);
        setLoading(false);
    }, (err) => {
        setError(err.message || 'ไม่สามารถโหลดข้อมูลรายชื่อผู้ป่วยได้');
        setLoading(false);
    });

    return () => unsubscribe();
  }, [token]);

  const handleCopyLink = async (patient) => {
    const link = getAssessmentLink(patient.token);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(patient.id);
      setTimeout(() => setCopiedId(null), 2000);
      if (patient.status === 'ยังไม่ส่งลิงก์') {
        // We assume token was generated previously or handle it.
        // If no token exists, we should generate one before copying.
        let ptToken = patient.token;
        if (!ptToken) {
            ptToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            await updateDoc(doc(db, 'patients', patient.id), { status: 'ส่งแล้ว (รอผล)', token: ptToken });
            await navigator.clipboard.writeText(getAssessmentLink(ptToken));
        } else {
            await updateDoc(doc(db, 'patients', patient.id), { status: 'ส่งแล้ว (รอผล)' });
        }
      }
    } catch (err) {
      alert('ไม่สามารถคัดลอกลิงก์ได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleOpenLine = (phone) => {
    window.open('https://line.me/', '_blank');
  };

  const isCritical = (a) => {
    if (!a?.scores) return false;
    const { pain, shortnessOfBreath, anxiety, depression, tiredness, nausea } = a.scores;
    return (pain >= 7) || (shortnessOfBreath >= 7) || (anxiety >= 7) || (depression >= 7) || (tiredness >= 8) || (nausea >= 7);
  };

  const safePatients = Array.isArray(patients) ? patients : [];
  const activeCount = safePatients.length;
  const pendingLinkCount = safePatients.filter(p => p.status === 'ยังไม่ส่งลิงก์').length;
  const waitingResultCount = safePatients.filter(p => p.status === 'ส่งแล้ว (รอผล)').length;
  const assessedCount = safePatients.filter(p => p.status === 'ประเมินแล้ว').length;
  const criticalCount = safePatients.filter(p => p.status === 'ประเมินแล้ว' && isCritical(p.latestAssessment)).length;

  const filteredPatients = safePatients.filter(p => {
    if (!p) return false;
    const pName = String(p.name || '').toLowerCase();
    const pId = String(p.id || p.HN || '');
    const pDisease = String(p.disease || '').toLowerCase();
    const q = search.toLowerCase();
    
    const matchSearch = pName.includes(q) || pId.includes(q) || pDisease.includes(q);
    if (!matchSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return p.status === 'ยังไม่ส่งลิงก์';
    if (statusFilter === 'waiting') return p.status === 'ส่งแล้ว (รอผล)';
    if (statusFilter === 'assessed') return p.status === 'ประเมินแล้ว';
    if (statusFilter === 'critical') return p.status === 'ประเมินแล้ว' && isCritical(p.latestAssessment);
    return true;
  });

  const getTodayThaiDate = () => {
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const now = new Date();
    return `วัน${days[now.getDay()]}ที่ ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear() + 543}`;
  };

  const getCurrentRoundText = () => {
    return 'ประเมินล่าสุด';
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-10 flex flex-wrap justify-between items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">ตารางงานประจำวัน</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-200">
              Home Ward
            </span>
          </div>
          <p className="text-sm text-slate-500 font-semibold mt-1 flex items-center gap-2">
            <span>📅 {getTodayThaiDate()}</span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
              ⏰ {getCurrentRoundText()}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 bg-emerald-50/80 border border-emerald-200/80 px-4 py-2 rounded-2xl shadow-sm">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shadow">
            👩‍⚕️
          </div>
          <div>
            <p className="text-[11px] text-emerald-700 font-bold leading-tight">พยาบาลผู้ดูแล</p>
            <p className="text-sm font-black text-slate-800 leading-tight">พย.วิกานดา (แอดมิน)</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-sm text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Active Patients */}
          <div 
            onClick={() => setStatusFilter('all')}
            className={`bg-white rounded-3xl p-6 border transition-all cursor-pointer shadow-sm hover:shadow-md ${statusFilter === 'all' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30' : 'border-slate-200/90'}`}
          >
            <div className="flex items-center justify-between">
              <div className="w-13 h-13 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl border border-emerald-200 shadow-inner">
                👥
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                ทั้งหมด
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">ผู้ป่วย Active</p>
              <h3 className="text-3xl font-black text-slate-800 mt-0.5">
                {loading ? '...' : activeCount} <span className="text-sm font-bold text-slate-400">ราย</span>
              </h3>
            </div>
          </div>

          {/* Pending Links */}
          <div 
            onClick={() => setStatusFilter('pending')}
            className={`bg-white rounded-3xl p-6 border transition-all cursor-pointer shadow-sm hover:shadow-md ${statusFilter === 'pending' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30' : 'border-slate-200/90'}`}
          >
            <div className="flex items-center justify-between">
              <div className="w-13 h-13 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl border border-amber-200 shadow-inner">
                ⏳
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-full">
                ต้องส่งลิงก์
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">รอส่งลิงก์</p>
              <h3 className="text-3xl font-black text-slate-800 mt-0.5">
                {loading ? '...' : pendingLinkCount} <span className="text-sm font-bold text-slate-400">ราย</span>
              </h3>
            </div>
          </div>

          {/* Assessed */}
          <div 
            onClick={() => setStatusFilter('assessed')}
            className={`bg-white rounded-3xl p-6 border transition-all cursor-pointer shadow-sm hover:shadow-md ${statusFilter === 'assessed' ? 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/30' : 'border-slate-200/90'}`}
          >
            <div className="flex items-center justify-between">
              <div className="w-13 h-13 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center text-2xl border border-teal-200 shadow-inner">
                ✅
              </div>
              <span className="text-xs font-bold text-teal-700 bg-teal-100/80 px-2.5 py-1 rounded-full">
                ได้ผลแล้ว
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">ประเมินแล้ว</p>
              <h3 className="text-3xl font-black text-slate-800 mt-0.5">
                {loading ? '...' : assessedCount} <span className="text-sm font-bold text-slate-400">ราย</span>
              </h3>
            </div>
          </div>

          {/* Critical Alerts */}
          <div 
            onClick={() => setStatusFilter('critical')}
            className={`bg-white rounded-3xl p-6 border transition-all cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden ${criticalCount > 0 ? 'border-red-300 bg-gradient-to-br from-white via-red-50/40 to-red-100/50 ring-2 ring-red-500/30' : statusFilter === 'critical' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200/90'}`}
          >
            {criticalCount > 0 && (
              <div className="absolute -right-3 -top-3 text-red-100 opacity-60 text-7xl select-none animate-pulse pointer-events-none">
                🚨
              </div>
            )}
            <div className="flex items-center justify-between z-10 relative">
              <div className={`w-13 h-13 rounded-2xl flex items-center justify-center text-2xl border shadow-inner ${criticalCount > 0 ? 'bg-red-100 border-red-200 text-red-600 animate-bounce' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                🚨
              </div>
              <span className={`text-xs font-black px-2.5 py-1 rounded-full ${criticalCount > 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                {criticalCount > 0 ? 'ด่วนวิกฤต!' : 'ปกติ'}
              </span>
            </div>
            <div className="mt-4 z-10 relative">
              <p className={`text-xs font-bold uppercase tracking-wide ${criticalCount > 0 ? 'text-red-700' : 'text-slate-500'}`}>
                แจ้งเตือนวิกฤต (≥7)
              </p>
              <h3 className="text-3xl font-black text-slate-800 mt-0.5">
                {loading ? '...' : criticalCount} <span className="text-sm font-bold text-slate-400">เคส</span>
              </h3>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Table Toolbar */}
          <div className="px-6 py-5 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4 bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
                📋
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">คิวส่งแบบประเมิน ESAS ประจำวัน</h3>
                <p className="text-xs text-slate-500 font-medium">กดปุ่ม Copy ลิงก์ เพื่อส่งให้คนไข้หรือญาติใน LINE</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'all' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  ทั้งหมด ({patients.length})
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  รอส่ง ({pendingLinkCount})
                </button>
                <button
                  onClick={() => setStatusFilter('assessed')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'assessed' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  ประเมินแล้ว ({assessedCount})
                </button>
                {criticalCount > 0 && (
                  <button
                    onClick={() => setStatusFilter('critical')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'critical' ? 'bg-red-600 text-white shadow-sm' : 'text-red-600 hover:bg-red-50 font-black'}`}
                  >
                    🚨 วิกฤต ({criticalCount})
                  </button>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="ค้นหา HN หรือ ชื่อผู้ป่วย..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-60 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Table Data */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-bold flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <span>กำลังโหลดข้อมูลผู้ป่วย...</span>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold space-y-2">
                <p className="text-3xl">🔍</p>
                <p className="text-base text-slate-600">ไม่พบรายชื่อผู้ป่วยตามเงื่อนไขที่เลือก</p>
                <p className="text-xs text-slate-400 font-normal">ลองเปลี่ยนคำค้นหา หรือกดเลือกตัวกรอง "ทั้งหมด"</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="w-12 px-4 py-4 text-center">ขยาย</th>
                    <th className="px-6 py-4">ข้อมูลผู้ป่วย</th>
                    <th className="px-6 py-4">ผู้ดูแล / เบอร์ติดต่อ</th>
                    <th className="px-6 py-4">สถานะประเมิน</th>
                    <th className="px-6 py-4">คะแนน ESAS ล่าสุด</th>
                    <th className="px-6 py-4 text-center">จัดการ / ส่งลิงก์</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map(patient => {
                    const latest = patient.latestAssessment;
                    const critical = isCritical(latest);
                    const isExpanded = expandedPatientId === patient.id;

                    return (
                      <React.Fragment key={patient.id}>
                        <tr className={`transition-colors ${patient.status === 'ประเมินแล้ว' && critical ? 'bg-red-50/40 hover:bg-red-50/60' : isExpanded ? 'bg-emerald-50/30' : 'hover:bg-slate-50/70'}`}>
                          {/* Expand Button */}
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => setExpandedPatientId(isExpanded ? null : patient.id)}
                              className="p-2 hover:bg-slate-200/70 rounded-xl text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                              title="ดูรายละเอียดเพิ่มเติม"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-emerald-600 font-bold" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>

                          {/* Patient Info */}
                          <td className="px-6 py-4">
                            <div className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                              <span>{patient.name}</span>
                              {patient.gender && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                  {patient.gender} {patient.age ? `${patient.age} ปี` : ''}
                                </span>
                              )}
                              {patient.clinicalStatus && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black border ${
                                  patient.clinicalStatus === 'Admit' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  patient.clinicalStatus === 'D/C' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  patient.clinicalStatus === 'เสียชีวิต' ? 'bg-red-50 text-red-700 border-red-200' :
                                  'bg-slate-100 text-slate-700 border-slate-200'
                                }`}>
                                  {patient.clinicalStatus}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-2">
                              <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">HN: {patient.id}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-emerald-800 font-bold">{patient.disease}</span>
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800 text-sm">
                              {patient.relativePhone || 'ไม่ระบุเบอร์'}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {patient.caregiverName ? `ญาติ: ${patient.caregiverName}` : 'ไม่ระบุชื่อญาติ'}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            {patient.status === 'ยังไม่ส่งลิงก์' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                ยังไม่ส่งลิงก์
                              </span>
                            ) : patient.status === 'ส่งแล้ว (รอผล)' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                                ส่งแล้ว (รอผล)
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${critical ? 'bg-red-100 text-red-700 border-red-200 shadow-sm' : 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'}`}>
                                <span className={`w-2 h-2 rounded-full ${critical ? 'bg-red-600 animate-pulse' : 'bg-emerald-500'}`}></span>
                                {critical ? 'ประเมินแล้ว (วิกฤต 🚨)' : 'ประเมินแล้ว'}
                              </span>
                            )}
                          </td>

                          {/* Scores Preview */}
                          <td className="px-6 py-4">
                            {patient.status !== 'ประเมินแล้ว' || !latest ? (
                              <span className="text-slate-400 text-sm font-medium">รอการประเมิน</span>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1 flex-wrap">
                                  {Object.entries(latest.scores).map(([key, val]) => {
                                    const labels = {
                                      pain: 'ปวด',
                                      shortnessOfBreath: 'เหนื่อย',
                                      anxiety: 'กังวล',
                                      depression: 'ซึมเศร้า',
                                      tiredness: 'เพลีย',
                                      wellbeing: 'สุขภาวะ'
                                    };
                                    const label = labels[key];
                                    if (!label) return null;
                                    const isHigh = val >= 7;
                                    const isMid = val >= 4 && val <= 6;
                                    return (
                                      <div
                                        key={key}
                                        title={`${label}: ${val}/10`}
                                        className={`px-2 py-1 rounded-lg text-xs font-black flex items-center gap-1 shadow-sm ${
                                          isHigh
                                            ? 'bg-red-600 text-white animate-pulse'
                                            : isMid
                                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        }`}
                                      >
                                        <span>{label}</span>
                                        <span className="text-sm">{val}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                                  <p className="text-[11px] text-slate-400 font-semibold">
                                    {latest.date}
                                  </p>
                              </div>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              {patient.status === 'ประเมินแล้ว' && (
                                <button
                                  onClick={() => navigate(`/timeline/${patient.id}`)}
                                  className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 border border-emerald-700 rounded-xl text-sm font-bold text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                                >
                                  <Clock className="w-4 h-4" />
                                  <span>ดู Timeline</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleCopyLink(patient)}
                                className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer ${
                                  copiedId === patient.id
                                    ? 'bg-emerald-600 text-white border-emerald-600 scale-105 shadow-emerald-500/25'
                                    : 'bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                                }`}
                              >
                                {copiedId === patient.id ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    <span>คัดลอกแล้ว!</span>
                                  </>
                                ) : (
                                  <>
                                    <LinkIcon className="w-4 h-4 text-emerald-600" />
                                    <span>📋 Copy ลิงก์</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => window.open(`/print-qr/${patient.token}`, '_blank')}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 transition-all shadow-sm cursor-pointer"
                                title="พิมพ์ QR Code สำหรับให้คนไข้สแกน"
                              >
                                <Printer className="w-4 h-4" />
                                <span>พิมพ์ QR</span>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Accordion Expand Details */}
                        {isExpanded && (
                          <tr className="bg-emerald-50/20">
                            <td colSpan={6} className="px-8 py-6 border-b border-slate-200">
                              <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                {/* Left Column: Patient Profile */}
                                <div className="space-y-4">
                                  <h4 className="font-black text-slate-800 text-base border-b border-slate-100 pb-2 flex items-center gap-2 text-emerald-700">
                                    <User className="w-5 h-5 text-emerald-600" />
                                    <span>ข้อมูลทั่วไปและที่อยู่</span>
                                  </h4>
                                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                      <p className="font-bold text-slate-400">เพศ / อายุ</p>
                                      <p className="text-slate-800 font-extrabold text-sm mt-0.5">
                                        {patient.gender || 'ไม่ระบุ'} / {patient.age || 'ไม่ระบุ'} ปี
                                      </p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                      <p className="font-bold text-slate-400">พยาบาลผู้รับผิดชอบ</p>
                                      <p className="text-slate-800 font-extrabold text-sm mt-0.5">
                                        {patient.responsibleStaff || 'พย.วิกานดา'}
                                      </p>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-400 text-xs mb-1">ที่อยู่คนไข้</p>
                                    <p className="text-slate-800 font-semibold bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-start gap-2">
                                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                      <span>{patient.address || 'ไม่ระบุที่อยู่'}</span>
                                    </p>
                                  </div>
                                </div>

                                {/* Right Column: Care Plan & Latest notes */}
                                <div className="space-y-4">
                                  <h4 className="font-black text-slate-800 text-base border-b border-slate-100 pb-2 flex items-center gap-2 text-emerald-700">
                                    <FileText className="w-5 h-5 text-emerald-600" />
                                    <span>แผนการดูแลและข้อความจากญาติ</span>
                                  </h4>
                                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                      <p className="font-bold text-slate-400">ญาติผู้ดูแล</p>
                                      <p className="text-slate-800 font-extrabold text-sm mt-0.5">
                                        {patient.caregiverName || 'ไม่ระบุ'}
                                      </p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                      <p className="font-bold text-slate-400">เบอร์ติดต่อด่วน</p>
                                      <p className="text-slate-800 font-extrabold text-sm mt-0.5">
                                        {patient.relativePhone || 'ไม่ระบุ'}
                                      </p>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-400 text-xs mb-1">แผนการดูแล (Clinical Notes)</p>
                                    <p className="text-slate-800 font-semibold bg-slate-50 p-3 rounded-2xl border border-slate-100 leading-relaxed">
                                      {patient.clinicalNotes || 'ไม่มีบันทึกแผนการดูแล'}
                                    </p>
                                  </div>
                                  {latest?.notes && (
                                    <div>
                                      <p className="font-bold text-amber-700 text-xs mb-1">💬 บันทึกเพิ่มเติมจากคนไข้/ญาติล่าสุด</p>
                                      <p className="text-slate-800 font-bold bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80 leading-relaxed">
                                        "{latest.notes}"
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Tip Box */}
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-3xl p-5 flex items-center gap-4 text-sm text-emerald-900 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-xl shrink-0">
            💡
          </div>
          <div className="leading-relaxed">
            <strong className="font-black text-emerald-950">คำแนะนำการใช้งาน:</strong> กดปุ่ม{' '}
            <strong className="bg-white px-2 py-0.5 rounded-lg border border-emerald-200 text-emerald-800 font-bold">
              "📋 Copy ลิงก์"
            </strong>{' '}
            แล้วนำไปส่งในแชท LINE ให้ญาติหรือคนไข้เปิดทำแบบประเมินบนมือถือได้ทันที โดยไม่ต้องดาวน์โหลดแอปเพิ่ม
          </div>
        </div>
      </div>
    </div>
  );
}