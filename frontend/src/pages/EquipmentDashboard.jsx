import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, BarChart2, CheckCircle, Package, ArrowRightLeft, Download, Printer } from 'lucide-react';
import { db, collection, onSnapshot, query, orderBy, setDoc, doc, addDoc } from '../services/firebase';
import { seedData } from '../seedData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#0ea5e9', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#f59e0b', '#10b981'];

export default function EquipmentDashboard({ token }) {
  const [equipments, setEquipments] = useState([]);
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState({});
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterWard, setFilterWard] = useState('ALL');
  const [filterPatientStatus, setFilterPatientStatus] = useState('ALL');

  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const unsubEquip = onSnapshot(collection(db, 'equipments'), (snapshot) => {
        const eqData = [];
        snapshot.forEach((doc) => eqData.push({ id: doc.id, ...doc.data() }));
        setEquipments(eqData);
    });

    const qRecords = query(collection(db, 'borrow_records'), orderBy('timestamp', 'desc'));
    const unsubRecords = onSnapshot(qRecords, (snapshot) => {
        const recData = [];
        snapshot.forEach((doc) => recData.push({ id: doc.id, ...doc.data() }));
        setRecords(recData);
        setLoading(false);
    });

    const unsubPatients = onSnapshot(collection(db, 'patients'), (snapshot) => {
        const ptData = {};
        snapshot.forEach((doc) => { ptData[doc.id] = doc.data(); });
        setPatients(ptData);
    });
    
    const unsubWards = onSnapshot(collection(db, 'wards'), (snapshot) => {
        const wData = [];
        snapshot.forEach((doc) => { wData.push(doc.data().name); });
        setWards(wData);
    });

    return () => {
        unsubEquip();
        unsubRecords();
        unsubPatients();
        unsubWards();
    };
  }, []);

  const handleImport = async () => {
      if (!window.confirm("คุณต้องการดึงข้อมูลจากไฟล์ Excel เก่าเข้าสู่ระบบใช่หรือไม่?")) return;
      setIsImporting(true);
      try {
          for (const w of seedData.wards) await addDoc(collection(db, 'wards'), w);
          for (const p of seedData.patients) await setDoc(doc(db, 'patients', p.id), p, { merge: true });
          for (const eq of seedData.equipments) await setDoc(doc(db, 'equipments', eq.id), eq);
          for (const rec of seedData.borrow_records) {
              rec.timestamp = new Date(rec.timestamp);
              await setDoc(doc(db, 'borrow_records', rec.refId), rec);
          }
          alert("นำเข้าข้อมูลสำเร็จแล้ว!");
      } catch (err) {
          console.error(err);
          alert("เกิดข้อผิดพลาดในการนำเข้าข้อมูล: " + err.message);
      }
      setIsImporting(false);
  };

  const totalCount = equipments.length;
  const borrowedCount = equipments.filter(e => e.status === 'ยืม').length;
  const availableCount = totalCount - borrowedCount;

  // Process Borrow Records into Bills (Grouped by Patient)
  const groupedRecords = useMemo(() => {
      const ptMap = {};
      records.forEach(r => {
          const ptId = r.patientId;
          if (!ptMap[ptId]) {
              ptMap[ptId] = { 
                  patientId: ptId, 
                  patientName: r.patientName, 
                  ward: r.ward, 
                  timestamp: null, 
                  items: {}, 
                  itemsRaw: [],
                  refIds: new Set()
              };
          }
          
          let ts = r.timestamp;
          if (ts?.toDate) ts = ts.toDate();
          else if (typeof ts === 'number') ts = new Date(ts);
          else if (ts instanceof Date) ts = ts;
          
          if (ts && (!ptMap[ptId].timestamp || ts > ptMap[ptId].timestamp)) {
              ptMap[ptId].timestamp = ts;
              ptMap[ptId].ward = r.ward;
          }
          
          if (r.refId) ptMap[ptId].refIds.add(r.refId);

          const eqId = r.equipmentId;
          const eqName = r.equipmentName;
          
          if (eqId && eqName) {
              if (!ptMap[ptId].items[eqId]) {
                  ptMap[ptId].items[eqId] = { name: eqName, count: 0, latestStatus: 'ว่าง' };
              }
              if (r.type === 'ยืม') {
                  ptMap[ptId].items[eqId].count += 1;
                  ptMap[ptId].items[eqId].latestStatus = 'ยืม';
                  ptMap[ptId].itemsRaw.push(eqName);
              } else if (r.type === 'คืน') {
                  ptMap[ptId].items[eqId].count -= 1;
                  ptMap[ptId].items[eqId].latestStatus = 'คืน';
              }
          }
      });
      
      return Object.values(ptMap).map(pt => {
          let outstandingCount = 0;
          let outstandingNames = [];
          Object.keys(pt.items).forEach(eqId => {
              if (pt.items[eqId].count > 0) {
                  outstandingCount++;
                  outstandingNames.push(`${pt.items[eqId].name}`);
              }
          });
          pt.status = outstandingCount > 0 ? 'ค้างยืม' : 'คืนครบแล้ว';
          pt.outstandingNames = outstandingNames;
          pt.refsList = Array.from(pt.refIds).sort((a,b) => b.localeCompare(a));
          pt.latestRef = pt.refsList[0] || '';
          return pt;
      }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Sort newest first
  }, [records]);

  // Apply Filters
  const filteredRecords = useMemo(() => {
      return groupedRecords.filter(pt => {
          const ptStatus = patients[pt.patientId]?.clinicalStatus || 'Admit';
          const searchMatch = !search || 
                pt.latestRef.toLowerCase().includes(search.toLowerCase()) || 
                pt.patientName.toLowerCase().includes(search.toLowerCase()) ||
                pt.outstandingNames.join(' ').toLowerCase().includes(search.toLowerCase());
          const statusMatch = filterStatus === 'ALL' || pt.status === filterStatus;
          const wardMatch = filterWard === 'ALL' || pt.ward === filterWard;
          const ptStatusMatch = filterPatientStatus === 'ALL' || ptStatus === filterPatientStatus;

          return searchMatch && statusMatch && wardMatch && ptStatusMatch;
      });
  }, [groupedRecords, search, filterStatus, filterWard, filterPatientStatus, patients]);

  // Chart 1: Status by category (available vs borrowed)
  const categoryData = useMemo(() => {
    const cats = {};
    equipments.forEach(eq => {
      // Derive category name by stripping numbers/sizes
      const mainName = eq.name
        .replace(/\s*(เบอร์|ขนาด|เล็ก|กลาง|ใหญ่)[^\s]*/gi, '')
        .replace(/\s*\d+\s*cc/gi, '')
        .replace(/\d+/, '')
        .trim();
      if (!cats[mainName]) cats[mainName] = { name: mainName, ว่าง: 0, ยืม: 0 };
      if (eq.status === 'ยืม') cats[mainName]['ยืม']++;
      else cats[mainName]['ว่าง']++;
    });
    return Object.values(cats)
      .map(c => ({ ...c, name: c.name.length > 12 ? c.name.slice(0, 12) + '..' : c.name }))
      .sort((a, b) => (b['ว่าง'] + b['ยืม']) - (a['ว่าง'] + a['ยืม']));
  }, [equipments]);

  // Chart 2: 6 Months Trend
  const trendData = useMemo(() => {
      const months = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const label = d.toLocaleString('th-TH', { month: 'short' });
          months[label] = 0;
      }
      records.forEach(r => {
          if (r.type === 'ยืม') {
              let ts = r.timestamp;
              if (ts?.toDate) ts = ts.toDate();
              else if (typeof ts === 'number') ts = new Date(ts);
              
              if (ts) {
                  const label = ts.toLocaleString('th-TH', { month: 'short' });
                  if (months[label] !== undefined) {
                      months[label]++;
                  }
              }
          }
      });
      return Object.keys(months).map(m => ({ name: m, amount: months[m] }));
  }, [records]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#f8fafc] font-['Sarabun']">
      <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
        
        {/* Navigation Tabs */}
        <div className="flex bg-white rounded-2xl shadow-sm overflow-hidden mb-6 border border-slate-100">
            <button onClick={() => navigate('/equipments')} className="flex-1 py-3.5 font-bold text-sm transition-all bg-blue-50 text-blue-700 border-b-[3px] border-blue-600">
                📊 แดชบอร์ด
            </button>
            <button onClick={() => navigate('/equipments/borrow')} className="flex-1 py-3.5 font-bold text-sm transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-b-[3px] border-transparent">
                ➕ ยืมเครื่องมือ
            </button>
            <button onClick={() => navigate('/equipments/return')} className="flex-1 py-3.5 font-bold text-sm transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-b-[3px] border-transparent">
                ↩️ คืนเครื่องมือ <span className="text-[10px] font-normal ml-1">(เฉพาะเจ้าหน้าที่)</span>
            </button>
        </div>

        {totalCount === 0 && (
            <div className="mb-6 flex justify-center">
                <button
                    onClick={handleImport}
                    disabled={isImporting}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-indigo-600/20 transition-all"
                >
                    <Download className="w-5 h-5" />
                    {isImporting ? 'กำลังนำเข้าข้อมูล...' : 'ดึงข้อมูลจาก Excel เดิม'}
                </button>
            </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 text-center">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">เครื่องมือทั้งหมด</p>
              <h2 className="text-3xl font-black text-slate-800 mt-1">{totalCount}</h2>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <p className="text-xs text-green-500 font-bold uppercase tracking-widest">ว่างพร้อมยืม</p>
              <h2 className="text-3xl font-black text-green-600 mt-1">{availableCount}</h2>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <p className="text-xs text-red-500 font-bold uppercase tracking-widest">ยืมไปแล้ว</p>
              <h2 className="text-3xl font-black text-red-600 mt-1">{borrowedCount}</h2>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-700 text-sm">📊 สถานะเครื่องมือปัจจุบัน (แยกตามหมวดหมู่)</h3>
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>ว่าง</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block"></span>ยืม</span>
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} barCategoryGap="30%" barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'Sarabun' }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'Sarabun', fontSize: 13 }}
                    formatter={(value, name) => [`${value} ชิ้น`, name]}
                  />
                  <Bar dataKey="ว่าง" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="ยืม" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-700 text-sm mb-4">📈 ยอดการยืม 6 เดือนย้อนหลัง</h3>
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                        <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ค้นหา (Ref / ชื่อ)</label>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="พิมพ์ข้อความค้นหา..." className="w-full p-3 border-2 border-slate-50 rounded-2xl bg-slate-50 outline-none focus:border-blue-400 font-bold text-slate-700 shadow-inner text-sm"/>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">สถานะใบงาน</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full p-3 border-2 border-slate-50 rounded-2xl bg-white outline-none font-bold text-slate-600 text-sm">
                <option value="ALL">ทุกสถานะใบงาน</option>
                <option value="ค้างยืม">ค้างยืม</option>
                <option value="คืนครบแล้ว">คืนครบแล้ว</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">วอร์ด (Ward)</label>
              <select value={filterWard} onChange={(e) => setFilterWard(e.target.value)} className="w-full p-3 border-2 border-slate-50 rounded-2xl bg-white outline-none font-bold text-slate-600 text-sm">
                <option value="ALL">ทุก Ward</option>
                {wards.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">สถานะคนไข้</label>
              <select value={filterPatientStatus} onChange={(e) => setFilterPatientStatus(e.target.value)} className="w-full p-3 border-2 border-slate-50 rounded-2xl bg-white outline-none font-bold text-slate-600 text-sm">
                <option value="ALL">ทุกสถานะคนไข้</option>
                <option value="Admit">Admit</option>
                <option value="D/C">D/C</option>
                <option value="เสียชีวิต">เสียชีวิต</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-8">
          <div className="bg-slate-50 p-6 border-b flex justify-between items-center">
              <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest">📋 ประวัติใบงานทั้งหมด</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b">
                <tr>
                  <th className="px-6 py-4">Ref ล่าสุด</th>
                  <th className="px-6 py-4">คนไข้/วันที่ยืม</th>
                  <th className="px-6 py-4">วอร์ด</th>
                  <th className="px-6 py-4 text-center">สถานะ</th>
                  <th className="px-6 py-4">รายการค้าง</th>
                  <th className="px-6 py-4 text-center">ตัวเลือก</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-50">
                  {filteredRecords.length === 0 ? (
                      <tr><td colSpan="6" className="p-10 text-center text-slate-300 italic font-medium">ไม่พบข้อมูลใบงาน</td></tr>
                  ) : (
                      filteredRecords.map(ref => {
                          const isDeath = patients[ref.patientId]?.clinicalStatus === 'เสียชีวิต';
                          return (
                          <tr key={ref.patientId} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-blue-600 font-mono text-xs">{ref.latestRef}</td>
                              <td className="px-6 py-4">
                                  <div className={`font-bold ${isDeath ? 'text-red-600' : 'text-slate-800'}`}>
                                      {ref.patientName} {isDeath && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-md ml-2">เสียชีวิต</span>}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-1">{ref.timestamp ? ref.timestamp.toLocaleString('th-TH') : '-'}</div>
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-600">{ref.ward}</td>
                              <td className="px-6 py-4 text-center">
                                  <span className={`text-[10px] px-3 py-1.5 rounded-xl font-bold ${ref.status === 'ค้างยืม' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                      {ref.status}
                                  </span>
                              </td>
                              <td className="px-6 py-4">
                                  {ref.outstandingNames.length > 0 ? (
                                      <ul className="list-disc pl-4 text-xs text-slate-600 font-medium">
                                          {ref.outstandingNames.map((name, i) => <li key={i}>{name}</li>)}
                                      </ul>
                                  ) : (
                                      <span className="text-xs text-slate-400">-</span>
                                  )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                  <button onClick={() => navigate(`/equipments/print/${ref.latestRef}`)} className="text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 hover:bg-blue-50 p-2 rounded-lg" title="พิมพ์ใบงานล่าสุด">
                                      <Printer className="w-4 h-4" />
                                  </button>
                              </td>
                          </tr>
                      )})
                  )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
