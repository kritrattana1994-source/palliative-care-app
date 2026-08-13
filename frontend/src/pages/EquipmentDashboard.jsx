import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Package, ClipboardList, AlertCircle, ArrowRightLeft, Clock, Activity, History, Download } from 'lucide-react';
import { db, collection, onSnapshot, query, orderBy, setDoc, doc, addDoc } from '../services/firebase';
import { seedData } from '../seedData';

export default function EquipmentDashboard({ token }) {
  const [equipments, setEquipments] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    // Fetch Equipments
    const unsubEquip = onSnapshot(collection(db, 'equipments'), (snapshot) => {
        const eqData = [];
        snapshot.forEach((doc) => eqData.push({ id: doc.id, ...doc.data() }));
        setEquipments(eqData);
    }, (err) => {
        console.error(err);
        setError('ไม่สามารถโหลดข้อมูลเครื่องมือได้');
    });

    // Fetch Borrow Records (Recent)
    const qRecords = query(collection(db, 'borrow_records'), orderBy('timestamp', 'desc'));
    const unsubRecords = onSnapshot(qRecords, (snapshot) => {
        const recData = [];
        snapshot.forEach((doc) => recData.push({ id: doc.id, ...doc.data() }));
        setRecords(recData);
        setLoading(false);
    }, (err) => {
        console.error(err);
        setError('ไม่สามารถโหลดข้อมูลประวัติได้');
        setLoading(false);
    });

    return () => {
        unsubEquip();
        unsubRecords();
    };
  }, []);

  const handleImport = async () => {
      if (!window.confirm("คุณต้องการดึงข้อมูลจากไฟล์ Excel เก่าเข้าสู่ระบบใช่หรือไม่?")) return;
      setIsImporting(true);
      try {
          // 1. Wards
          for (const w of seedData.wards) {
              await addDoc(collection(db, 'wards'), w);
          }
          // 2. Patients
          for (const p of seedData.patients) {
              await setDoc(doc(db, 'patients', p.id), p, { merge: true });
          }
          // 3. Equipments
          for (const eq of seedData.equipments) {
              await setDoc(doc(db, 'equipments', eq.id), eq);
          }
          // 4. Borrow Records
          for (const rec of seedData.borrow_records) {
              // Convert JS timestamp back to Date object for Firebase
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

  // Find active borrows to show in the table (Ref IDs that have not returned everything)
  // Group records by refId to determine status
  const refMap = {};
  records.forEach(r => {
      const refId = r.refId;
      if (!refMap[refId]) {
          let ts = r.timestamp;
          if (ts?.toDate) ts = ts.toDate();
          else if (ts instanceof Date) ts = ts;
          else if (typeof ts === 'number') ts = new Date(ts);

          refMap[refId] = { refId, patient: r.patientName, ward: r.ward, timestamp: ts, items: {}, hasAct: false };
      }
      const eq = r.equipmentName;
      if (eq) {
          refMap[refId].hasAct = true;
          if (r.type === 'ยืม') {
              refMap[refId].items[eq] = (refMap[refId].items[eq] || 0) + 1;
          } else if (r.type === 'คืน') {
              refMap[refId].items[eq] = (refMap[refId].items[eq] || 0) - 1;
          }
      }
  });

  const activeTransactions = [];
  for (const ref in refMap) {
      let isPendingReturn = false;
      const itemsArr = [];
      for (const eq in refMap[ref].items) {
          if (refMap[ref].items[eq] > 0) {
              isPendingReturn = true;
              itemsArr.push(eq);
          }
      }
      if (isPendingReturn) {
          activeTransactions.push({
              refId: ref,
              patient: refMap[ref].patient,
              ward: refMap[ref].ward,
              items: itemsArr,
              date: refMap[ref].timestamp ? refMap[ref].timestamp.toLocaleDateString('th-TH') : '-'
          });
      }
  }

  const filteredTransactions = activeTransactions.filter(t => {
      const q = search.toLowerCase();
      return (t.patient?.toLowerCase().includes(q) || t.refId.toLowerCase().includes(q) || t.items.some(i => i.toLowerCase().includes(q)));
  });

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-10 flex flex-wrap justify-between items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">ระบบยืม-คืนเครื่องมือแพทย์</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-black border border-blue-200">
              Equipment
            </span>
          </div>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            จัดการคลังอุปกรณ์และติดตามการยืม-คืน
          </p>
        </div>

        <div className="flex items-center gap-3">
            {totalCount === 0 && (
                <button
                    onClick={handleImport}
                    disabled={isImporting}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-indigo-600/20 transition-all mr-2"
                >
                    <Download className="w-5 h-5" />
                    {isImporting ? 'กำลังนำเข้าข้อมูล...' : 'ดึงข้อมูลจาก Excel เดิม'}
                </button>
            )}
            <button
                onClick={() => navigate('/equipments/borrow')}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
                <Plus className="w-5 h-5" />
                ทำรายการยืม
            </button>
            <button
                onClick={() => navigate('/equipments/return')}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-amber-500/20 transition-all"
            >
                <ArrowRightLeft className="w-5 h-5" />
                ทำรายการคืน
            </button>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Total */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-13 h-13 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl border border-blue-200 shadow-inner">
                <Package className="w-7 h-7" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">เครื่องมือทั้งหมด</p>
              <h3 className="text-3xl font-black text-slate-800 mt-0.5">
                {loading ? '...' : totalCount} <span className="text-sm font-bold text-slate-400">ชิ้น</span>
              </h3>
            </div>
          </div>

          {/* Borrowed */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-13 h-13 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl border border-amber-200 shadow-inner">
                <Clock className="w-7 h-7" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">ถูกยืมอยู่</p>
              <h3 className="text-3xl font-black text-slate-800 mt-0.5">
                {loading ? '...' : borrowedCount} <span className="text-sm font-bold text-slate-400">ชิ้น</span>
              </h3>
            </div>
          </div>

          {/* Available */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-13 h-13 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl border border-emerald-200 shadow-inner">
                <Activity className="w-7 h-7" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">ว่างพร้อมใช้งาน</p>
              <h3 className="text-3xl font-black text-slate-800 mt-0.5">
                {loading ? '...' : availableCount} <span className="text-sm font-bold text-slate-400">ชิ้น</span>
              </h3>
            </div>
          </div>
        </div>

        {/* Active Transactions Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4 bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center font-bold">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">รายการที่ค้างส่งคืน</h3>
                <p className="text-xs text-slate-500 font-medium">รายการยืมที่ยังไม่ได้คืนเครื่องมือ</p>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="ค้นหาชื่อ, Ref ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-60 bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
               <div className="p-12 text-center text-slate-400 font-bold flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>กำลังโหลดข้อมูล...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-bold space-y-2">
                    <p className="text-3xl">✨</p>
                    <p className="text-base text-slate-600">ไม่มีรายการค้างส่งคืน</p>
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                            <th className="px-6 py-4">Ref ID</th>
                            <th className="px-6 py-4">วันที่ยืม</th>
                            <th className="px-6 py-4">ผู้ป่วย</th>
                            <th className="px-6 py-4">วอร์ด</th>
                            <th className="px-6 py-4">รายการที่ค้าง</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredTransactions.map((t, i) => (
                            <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-6 py-4 font-mono font-bold text-slate-700">{t.refId}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">{t.date}</td>
                                <td className="px-6 py-4 font-bold text-slate-800">{t.patient || '-'}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">{t.ward || '-'}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {t.items.map((itm, idx) => (
                                            <span key={idx} className="bg-amber-100 text-amber-800 px-2 py-1 rounded-lg text-xs font-bold border border-amber-200">
                                                {itm}
                                            </span>
                                        ))}
                                    </div>
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
