import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, collection, query, where, getDocs } from '../services/firebase';
import { Printer, HeartPulse } from 'lucide-react';

export default function PrintQR() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatient = async () => {
      const q = query(collection(db, 'patients'), where('token', '==', token));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setPatient({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
      setLoading(false);
    };
    fetchPatient();
  }, [token]);

  if (loading) return <div className="p-8 text-center font-bold text-slate-400">กำลังโหลด...</div>;
  if (!patient) return <div className="p-8 text-center text-red-500 font-bold">ไม่พบข้อมูลผู้ป่วย</div>;

  const assessLink = `${window.location.origin}/assess/${token}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(assessLink)}&margin=10`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 md:p-8 font-['Sarabun']">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-8 md:p-12 shadow-2xl print:shadow-none print:w-full print:p-0 print:border-none print:bg-transparent">
        
        <div className="flex justify-between items-start mb-8 print:hidden">
          <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all cursor-pointer">
            กลับ
          </button>
          <button onClick={() => window.print()} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer">
            <Printer className="w-5 h-5" /> พิมพ์ใบ QR
          </button>
        </div>

        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 border-4 border-emerald-50 mb-4 print:border-none">
            <HeartPulse className="w-10 h-10" />
          </div>
          
          <h1 className="text-3xl font-black text-slate-800">รพ.พล Palliative Care</h1>
          <h2 className="text-xl font-bold text-emerald-700 bg-emerald-50 inline-block px-6 py-2 rounded-full border border-emerald-100">
            สแกนเพื่อประเมินอาการ (ESAS)
          </h2>
          
          <div className="p-6 border-4 border-dashed border-emerald-200 rounded-3xl inline-block bg-white my-8 print:border-solid print:border-slate-800 print:shadow-none">
            <img src={qrUrl} alt="QR Code" className="w-64 h-64 mx-auto mix-blend-multiply" crossOrigin="anonymous" />
          </div>
          
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-3 max-w-sm mx-auto print:bg-transparent print:border-slate-300">
             <div className="text-xl font-black text-slate-800">ผู้ป่วย: {patient.name}</div>
             <div className="text-sm font-bold text-slate-500">HN: {patient.id}</div>
          </div>
          
          <div className="text-sm font-bold text-amber-800 bg-amber-50 p-5 rounded-2xl border border-amber-200 max-w-md mx-auto leading-relaxed print:border-dashed print:border-slate-400 print:bg-transparent print:text-slate-800">
             <strong>สำหรับญาติหรือผู้ดูแล:</strong> โปรดสแกน QR Code นี้ผ่านกล้องหรือแอปพลิเคชัน LINE เพื่อรายงานอาการประจำวัน เพื่อแจ้งให้ทีมแพทย์และพยาบาลทราบอย่างรวดเร็ว
          </div>
        </div>
      </div>
    </div>
  );
}
