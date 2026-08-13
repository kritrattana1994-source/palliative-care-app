import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, BarChart2, CheckCircle, Package, ArrowRightLeft, Download } from 'lucide-react';
import { db, collection, onSnapshot, query, orderBy, setDoc, doc, addDoc } from '../services/firebase';
import { seedData } from '../seedData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

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

  // Process Borrow Records into Bills (Ref IDs)
  const groupedRecords = useMemo(() => {
      const refMap = {};
      records.forEach(r => {
          const refId = r.refId;
          if (!refMap[refId]) {
              let ts = r.timestamp;
              if (ts?.toDate) ts = ts.toDate();
              else if (typeof ts === 'number') ts = new Date(ts);
              else if (ts instanceof Date) ts = ts;
              
              refMap[refId] = { 
                  refId, 
                  patientId: r.patientId, 
                  patientName: r.patientName, 
                  ward: r.ward, 
                  timestamp: ts, 
                  items: {}, 
                  itemsRaw: []
              };
          }
          const eqId = r.equipmentId;
          const eqName = r.equipmentName;
          
          if (eqId && eqName) {
              if (!refMap[refId].items[eqId]) {
                  refMap[refId].items[eqId] = { name: eqName, count: 0, latestStatus: 'ว่าง' };
              }
              if (r.type === 'ยืม') {
                  refMap[refId].items[eqId].count += 1;
                  refMap[refId].items[eqId].latestStatus = 'ยืม';
                  refMap[refId].itemsRaw.push(eqName);
              } else if (r.type === 'คืน') {
                  refMap[refId].items[eqId].count -= 1;
                  refMap[refId].items[eqId].latestStatus = 'คืน';
              }
          }
      });
      
      return Object.values(refMap).map(ref => {
          let outstandingCount = 0;
          let outstandingNames = [];
          Object.keys(ref.items).forEach(eqId => {
              if (ref.items[eqId].count > 0) {
                  outstandingCount++;
                  outstandingNames.push(`${ref.items[eqId].name}`);
              }
          });
          ref.status = outstandingCount > 0 ? 'ค้างยืม' : 'คืนครบแล้ว';
          ref.outstandingNames = outstandingNames;
          return ref;
      });
  }, [records]);

  // Apply Filters
  const filteredRecords = useMemo(() => {
      return groupedRecords.filter(ref => {
          const ptStatus = patients[ref.patientId]?.status || 'Unknown';
          const searchMatch = !search || 
                ref.refId.toLowerCase().includes(search.toLowerCase()) || 
                ref.patientName.toLowerCase().includes(search.toLowerCase()) ||
                ref.outstandingNames.join(' ').toLowerCase().includes(search.toLowerCase());
          const statusMatch = filterStatus === 'ALL' || ref.status === filterStatus;
          const wardMatch = filterWard === 'ALL' || ref.ward === filterWard;
          const ptStatusMatch = filterPatientStatus === 'ALL' || ptStatus === filterPatientStatus;

          return searchMatch && statusMatch && wardMatch && ptStatusMatch;
      });
  }, [groupedRecords, search, filterStatus, filterWard, filterPatientStatus, patients]);

  // Chart 1: Categories
  const categoryData = useMemo(() => {
      const cats = {};
      equipments.forEach(eq => {
          const mainName = eq.name.replace(/เบอร์.*/, '').replace(/\d+/, '').trim();
          cats[mainName] = (cats[mainName] || 0) + 1;
      });
      return Object.keys(cats).map(name => ({ name: name.length > 15 ? name.slice(0,15)+'..' : name, value: cats[name] }));
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
        
        {/* Navigation Buttons */}
        <div className="mb-8 flex flex-wrap justify-center gap-3">
          <button onClick={() => navigate('/equipments/borrow')} className="bg-white text-blue-600 border border-blue-50 px-5 py-2.5 rounded-2xl shadow-sm font-bold text-sm transition-all hover:bg-blue-50">หน้ายืมเครื่อง</button>
          <button onClick={() => navigate('/equipments/return')} className="bg-white text-red-600 border border-red-50 px-5 py-2.5 rounded-2xl shadow-sm font-bold text-sm transition-all hover:bg-red-50 text-center">
              หน้าคืน/แก้ไข <br/><span className="text-[9px]">(เฉพาะเจ้าหน้าที่)</span>
          </button>
          <button onClick={() => navigate('/patients')} className="bg-white text-purple-600 border border-purple-50 px-5 py-2.5 rounded-2xl shadow-sm font-bold text-sm transition-all hover:bg-purple-50 text-center">
              จัดการคนไข้ <br/><span className="text-[9px]">(เฉพาะเจ้าหน้าที่)</span>
          </button>
          <button className="bg-slate-800 text-white px-5 py-2.5 rounded-2xl shadow-md font-bold text-sm">📊 แดชบอร์ด/พิมพ์ใบงาน</button>
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
            <h3 className="font-bold text-slate-700 text-sm mb-4">📊 สถานะเครื่องมือปัจจุบัน (แยกตามหมวดหมู่)</h3>
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value" label={({name})=>name}>
                            {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                    </PieChart>
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
                  <th className="px-6 py-4">Ref</th>
                  <th className="px-6 py-4">คนไข้/วันที่ยืม</th>
                  <th className="px-6 py-4">วอร์ด</th>
                  <th className="px-6 py-4 text-center">สถานะ</th>
                  <th className="px-6 py-4">รายการค้าง</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-50">
                  {filteredRecords.length === 0 ? (
                      <tr><td colSpan="5" className="p-10 text-center text-slate-300 italic font-medium">ไม่พบข้อมูลใบงาน</td></tr>
                  ) : (
                      filteredRecords.map(ref => {
                          const isDeath = patients[ref.patientId]?.status === 'เสียชีวิต';
                          return (
                          <tr key={ref.refId} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-blue-600 font-mono text-xs">{ref.refId}</td>
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
