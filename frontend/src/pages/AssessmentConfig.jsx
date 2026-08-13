import React, { useState, useEffect } from 'react';
import { db, doc, getDoc, setDoc } from '../services/firebase';
import { CheckCircle, AlertCircle, RefreshCw, Save, ChevronDown, List } from 'lucide-react';

const SYMPTOMS = [
  { id: 'pain', label: '1. อาการปวด (Pain)' },
  { id: 'shortnessOfBreath', label: '2. หายใจเหนื่อยหอบ (Shortness of Breath)' },
  { id: 'tiredness', label: '3. ความเหนื่อยล้า (Tiredness)' },
  { id: 'nausea', label: '4. อาการคลื่นไส้ (Nausea)' },
  { id: 'depression', label: '5. ความรู้สึกซึมเศร้า (Depression)' },
  { id: 'anxiety', label: '6. ความวิตกกังวล (Anxiety)' },
  { id: 'drowsiness', label: '7. อาการง่วงซึม (Drowsiness)' },
  { id: 'appetite', label: '8. ความอยากอาหาร (Appetite)' },
  { id: 'wellbeing', label: '9. สุขภาวะโดยรวม (Wellbeing)' }
];

export default function AssessmentConfig({ user }) {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeSymptom, setActiveSymptom] = useState(SYMPTOMS[0].id);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'systemSettings', 'assessmentConfig');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setConfig(docSnap.data());
      } else {
        initializeDefaultConfig();
      }
    } catch (err) {
      showMessage('error', 'ไม่สามารถโหลดการตั้งค่าได้');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultConfig = () => {
    const newConfig = {};
    SYMPTOMS.forEach(s => {
      newConfig[s.id] = Array.from({ length: 11 }, (_, i) => ({
        score: i,
        displayMessage: '',
        speechMessage: '',
        selfCareGuide: ''
      }));
    });
    setConfig(newConfig);
  };

  const loadHardcodedDefaults = () => {
    if (!window.confirm('คำเตือน: ข้อมูลเดิมทั้งหมดจะถูกแทนที่ด้วยค่าเริ่มต้นระบบ คุณแน่ใจหรือไม่?')) return;
    
    const newConfig = {};
    SYMPTOMS.forEach(s => {
      newConfig[s.id] = Array.from({ length: 11 }, (_, i) => {
        let displayMessage = '';
        let speechMessage = '';
        if (i === 0) { displayMessage = 'ไม่มีอาการเลย สบายดี'; speechMessage = 'ระดับศูนย์ ไม่มีอาการเลยค่ะ'; }
        else if (i <= 3) { displayMessage = 'อาการเล็กน้อย ยังทำกิจกรรมได้ปกติ'; speechMessage = `ระดับ${i} อาการเล็กน้อย ยังทำกิจกรรมได้ปกติค่ะ`; }
        else if (i <= 6) { displayMessage = 'อาการปานกลาง เริ่มรบกวนการใช้ชีวิต'; speechMessage = `ระดับ${i} อาการปานกลาง จำเป็นต้องพักผ่อนค่ะ`; }
        else if (i <= 9) { displayMessage = 'อาการรุนแรง ขยับตัวลำบาก'; speechMessage = `ระดับ${i} อาการรุนแรง ควรแจ้งพยาบาลค่ะ`; }
        else { displayMessage = 'อาการรุนแรงที่สุด ต้องการความช่วยเหลือด่วน'; speechMessage = `ระดับ${i} อาการรุนแรงที่สุด ต้องการความช่วยเหลือด่วนค่ะ`; }

        return {
          score: i,
          displayMessage,
          speechMessage,
          selfCareGuide: i >= 7 ? 'แนะนำให้ติดต่อพยาบาลด่วนเพื่อรับคำแนะนำเพิ่มเติม' : 'พักผ่อนให้เพียงพอและสังเกตอาการ'
        };
      });
    });
    setConfig(newConfig);
    showMessage('success', 'โหลดข้อมูลเริ่มต้นเรียบร้อยแล้ว (อย่าลืมกดบันทึก)');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'systemSettings', 'assessmentConfig');
      await setDoc(docRef, config);
      showMessage('success', 'บันทึกการตั้งค่าเรียบร้อยแล้ว');
    } catch (err) {
      showMessage('error', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleInputChange = (symptomId, scoreIndex, field, value) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      if (!newConfig[symptomId]) {
        newConfig[symptomId] = Array.from({ length: 11 }, (_, i) => ({ score: i, displayMessage: '', speechMessage: '', selfCareGuide: '' }));
      }
      newConfig[symptomId][scoreIndex] = { ...newConfig[symptomId][scoreIndex], [field]: value };
      return newConfig;
    });
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex-1 p-8 flex items-center justify-center bg-slate-50 h-screen">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-red-200 text-center space-y-4 max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-black text-slate-800">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-slate-500 text-sm">เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถจัดการข้อความแบบประเมินได้</p>
        </div>
      </div>
    );
  }

  const currentSymptomData = config[activeSymptom] || Array.from({ length: 11 }, (_, i) => ({ score: i, displayMessage: '', speechMessage: '', selfCareGuide: '' }));

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-10 flex flex-wrap justify-between items-center gap-4 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <List className="w-6 h-6 text-emerald-600" />
            จัดการข้อความประเมิน
          </h2>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            ปรับแต่งข้อความแสดงผล เสียงอ่าน และคำแนะนำสำหรับคนไข้ในแต่ละระดับคะแนน
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadHardcodedDefaults}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            โหลดข้อมูลเริ่มต้น
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
          </button>
        </div>
      </header>

      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        {message.text && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-sm ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200 overflow-x-auto">
            {SYMPTOMS.map(sym => (
              <button
                key={sym.id}
                onClick={() => setActiveSymptom(sym.id)}
                className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 outline-none cursor-pointer ${
                  activeSymptom === sym.id 
                    ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50' 
                    : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {sym.label}
              </button>
            ))}
          </div>

          <div className="p-6 overflow-x-auto">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 font-bold">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                กำลังโหลดข้อมูล...
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="py-3 px-4 font-black text-slate-700 w-24 text-center">คะแนน</th>
                    <th className="py-3 px-4 font-black text-slate-700 w-1/4">แนวทางการดูแลตนเอง</th>
                    <th className="py-3 px-4 font-black text-slate-700 w-1/4">ข้อความแสดงผล</th>
                    <th className="py-3 px-4 font-black text-slate-700 w-1/4">ข้อความเสียงพูด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentSymptomData.map((item, index) => {
                    let scoreBg = 'bg-slate-100 text-slate-700';
                    if (index === 0) scoreBg = 'bg-slate-800 text-white';
                    else if (index <= 3) scoreBg = 'bg-yellow-300 text-yellow-900';
                    else if (index <= 6) scoreBg = 'bg-orange-400 text-white';
                    else if (index <= 9) scoreBg = 'bg-red-600 text-white';
                    else scoreBg = 'bg-red-900 text-white';

                    return (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-center">
                          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-lg shadow-sm ${scoreBg}`}>
                            {index}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <textarea
                            value={item.selfCareGuide || ''}
                            onChange={(e) => handleInputChange(activeSymptom, index, 'selfCareGuide', e.target.value)}
                            placeholder="เช่น ดื่มน้ำอุ่น พักผ่อนให้เพียงพอ..."
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-y min-h-[60px]"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <textarea
                            value={item.displayMessage || ''}
                            onChange={(e) => handleInputChange(activeSymptom, index, 'displayMessage', e.target.value)}
                            placeholder="เช่น ปวดรุนแรง ขยับตัวลำบาก"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-y min-h-[60px]"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <textarea
                            value={item.speechMessage || ''}
                            onChange={(e) => handleInputChange(activeSymptom, index, 'speechMessage', e.target.value)}
                            placeholder="เช่น ระดับเจ็ด อาการรุนแรง ขยับตัวลำบากค่ะ"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-y min-h-[60px]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
