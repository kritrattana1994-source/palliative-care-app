import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, Video, AlertCircle, CheckCircle, Info, ChevronRight, ChevronLeft, Volume2, VolumeX, Play } from 'lucide-react';
import { apiPublicGet, apiPublicPost, getTtsUrl } from '../config';

export default function ESASForm() {
  const { token } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState('unknown');
  const [notes, setNotes] = useState('');
  const [showVideoModal, setShowVideoModal] = useState(false);

  const [scores, setScores] = useState({
    pain: 0, shortnessOfBreath: 0, tiredness: 0, drowsiness: 0,
    nausea: 0, appetite: 0, depression: 0, anxiety: 0, wellbeing: 0
  });

  const symptomsMeta = [
    { key: 'pain', label: '1. อาการปวด (Pain)', desc: '0 = ไม่ปวดเลย, 10 = ปวดรุนแรงที่สุด', voiceLabel: 'ข้อที่หนึ่ง อาการปวด ศูนย์คือไม่มีอาการปวดเลย สิบคือปวดรุนแรงที่สุดเท่าที่จะเป็นไปได้ค่ะ' },
    { key: 'shortnessOfBreath', label: '2. หายใจเหนื่อยหอบ', desc: '0 = หายใจสะดวกดี, 10 = เหนื่อยหอบรุนแรงที่สุด', hasVideo: true, voiceLabel: 'ข้อที่สอง อาการหายใจเหนื่อยหอบ ศูนย์คือหายใจสะดวกดีปกติ สิบคือหายใจลำบากและเหนื่อยหอบรุนแรงที่สุดค่ะ' },
    { key: 'tiredness', label: '3. ความเหนื่อยล้า', desc: '0 = กระฉับกระเฉงดี, 10 = อ่อนเพลียรุนแรง', voiceLabel: 'ข้อที่สาม ความเหนื่อยล้าหรืออ่อนเพลีย ศูนย์คือกระฉับกระเฉงดี สิบคืออ่อนเพลียรุนแรงจนขยับตัวไม่ไหวค่ะ' },
    { key: 'drowsiness', label: '4. ความง่วงซึม', desc: '0 = ตื่นตัวดี, 10 = ง่วงซึมตลอด', voiceLabel: 'ข้อที่สี่ ความง่วงซึม ศูนย์คือตื่นตัวดีปกติ สิบคือง่วงซึมตลอดเวลาปลุกตื่นยากค่ะ' },
    { key: 'nausea', label: '5. อาการคลื่นไส้', desc: '0 = ไม่รู้สึกเลย, 10 = อาเจียนตลอด', voiceLabel: 'ข้อที่ห้า อาการคลื่นไส้ ศูนย์คือไม่รู้สึกคลื่นไส้เลย สิบคือคลื่นไส้และอาเจียนรุนแรงตลอดเวลาค่ะ' },
    { key: 'appetite', label: '6. ความอยากอาหาร', desc: '0 = ทานได้ปกติ, 10 = เบื่ออาหารรุนแรง', voiceLabel: 'ข้อที่หก ความอยากอาหาร ศูนย์คืออยากอาหารปกติรับประทานได้ดี สิบคือเบื่ออาหารอย่างรุนแรงและรับประทานไม่ได้เลยค่ะ' },
    { key: 'depression', label: '7. ซึมเศร้า', desc: '0 = อารมณ์ดี, 10 = เศร้าหดหู่รุนแรง', voiceLabel: 'ข้อที่เจ็ด ความรู้สึกซึมเศร้า ศูนย์คืออารมณ์ดีปกติมีกำลังใจดี สิบคือซึมเศร้าหรือท้อแท้หดหู่รุนแรงที่สุดค่ะ' },
    { key: 'anxiety', label: '8. วิตกกังวล', desc: '0 = สงบดี, 10 = วิตกกังวลรุนแรง', voiceLabel: 'ข้อที่แปด ความวิตกกังวล ศูนย์คือรู้สึกสงบปลอดภัยดีปกติ สิบคือกังวลกลัวกระสับกระส่ายรุนแรงที่สุดค่ะ' },
    { key: 'wellbeing', label: '9. สุขภาวะโดยรวม', desc: '0 = สบายดีมาก, 10 = แย่ที่สุด', voiceLabel: 'ข้อที่เก้า ความรู้สึกสบายหรือสุขภาวะโดยรวม ศูนย์คือรู้สึกสบายตัวสบายใจดีมาก สิบคือไม่สบายตัวอย่างรุนแรงที่สุดค่ะ' }
  ];

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const data = await apiPublicGet('verify-token', { token });
        setPatient(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    verifyToken();
  }, [token]);

  const audioRef = React.useRef(null);

  const speakText = (text) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); }
    try {
      const audio = new Audio(getTtsUrl(text));
      audio.volume = 1.0;
      audioRef.current = audio;
      audio.play().catch(() => {
        if ('speechSynthesis' in window) {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'th-TH'; u.rate = 0.88;
          window.speechSynthesis.speak(u);
        }
      });
    } catch (e) {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'th-TH'; u.rate = 0.88;
        window.speechSynthesis.speak(u);
      }
    }
  };

  useEffect(() => {
    if (patient && started && !submitted) {
      if (currentStep < 9) {
        const s = symptomsMeta[currentStep];
        if (s && autoPlayVoice) {
          const t = setTimeout(() => speakText(s.voiceLabel), 300);
          return () => clearTimeout(t);
        }
      } else if (currentStep === 9 && autoPlayVoice) {
        const t = setTimeout(() => speakText('ขั้นตอนสุดท้าย กรุณากรอกบันทึกเพิ่มเติมถึงพยาบาล และกดส่งแบบประเมินค่ะ'), 300);
        return () => clearTimeout(t);
      }
    }
  }, [currentStep, started, patient, autoPlayVoice]);

  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);

  const handleStart = () => { setStarted(true); speakText('สวัสดีค่ะ แบบประเมินระดับอาการคนไข้ประจำวัน ข้อที่หนึ่ง อาการปวด ศูนย์คือไม่มีอาการปวดเลย สิบคือปวดรุนแรงที่สุดเท่าที่จะเป็นไปได้ค่ะ'); };

  const handleSliderChange = (key, val) => {
    const scoreVal = parseInt(val);
    setScores(prev => ({ ...prev, [key]: scoreVal }));
    if (autoPlayVoice) {
      const info = levelDescriptions[key]?.[scoreVal];
      if (info?.voice) speakText(info.voice);
    }
  };

  const handleNext = () => { if (currentStep < 9) setCurrentStep(prev => prev + 1); };
  const handleBack = () => { if (currentStep > 0) setCurrentStep(prev => prev - 1); };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await apiPublicPost('assessments', { token, scores, notes, round: '09:00' });
      if (autoPlayVoice) speakText('ส่งแบบประเมินเรียบร้อย ขอบคุณค่ะ เจ้าหน้าที่จะคอยตรวจสอบอาการของคนไข้ค่ะ');
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Simplified level descriptions (reduced for compilation size)
  const levelDescriptions = {
    pain: Array.from({length: 11}, (_, i) => ({ desc: `ระดับ ${i}`, voice: `ระดับ${['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า','สิบ'][i]}` })),
    shortnessOfBreath: Array.from({length: 11}, (_, i) => ({ desc: `ระดับ ${i}`, voice: `ระดับ${['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า','สิบ'][i]}` })),
    tiredness: Array.from({length: 11}, (_, i) => ({ desc: `ระดับ ${i}`, voice: `ระดับ${['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า','สิบ'][i]}` })),
    drowsiness: Array.from({length: 11}, (_, i) => ({ desc: `ระดับ ${i}`, voice: `ระดับ${['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า','สิบ'][i]}` })),
    nausea: Array.from({length: 11}, (_, i) => ({ desc: `ระดับ ${i}`, voice: `ระดับ${['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า','สิบ'][i]}` })),
    appetite: Array.from({length: 11}, (_, i) => ({ desc: `ระดับ ${i}`, voice: `ระดับ${['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า','สิบ'][i]}` })),
    depression: Array.from({length: 11}, (_, i) => ({ desc: `ระดับ ${i}`, voice: `ระดับ${['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า','สิบ'][i]}` })),
    anxiety: Array.from({length: 11}, (_, i) => ({ desc: `ระดับ ${i}`, voice: `ระดับ${['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า','สิบ'][i]}` })),
    wellbeing: Array.from({length: 11}, (_, i) => ({ desc: `ระดับ ${i}`, voice: `ระดับ${['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า','สิบ'][i]}` }))
  };

  const getGrandmaImage = (score) => {
    if (score <= 3) return '/gm_happy.png';
    if (score <= 6) return '/gm_neutral.png';
    return '/gm_severe.png';
  };

  const getScoreDescription = (score) => {
    if (score === 0) return 'ไม่มีอาการปกติสุขดี 😊';
    if (score <= 3) return 'อาการระดับน้อย สบายดีอยู่ 👍';
    if (score <= 6) return 'อาการระดับปานกลาง เริ่มรู้สึกอึดอัด 😐';
    if (score <= 8) return 'อาการระดับรุนแรง ควรรีบพักผ่อน 😟';
    return 'อาการระดับรุนแรงที่สุด/วิกฤต 🚨';
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4"><div className="text-center font-bold text-slate-400">กำลังดาวน์โหลดข้อมูลแบบประเมิน...</div></div>;
  if (error && !submitted) return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4"><div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-200 text-center space-y-4"><div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600"><AlertCircle className="w-8 h-8" /></div><h3 className="text-xl font-bold text-slate-800">เกิดข้อผิดพลาด</h3><p className="text-sm text-slate-500">{error}</p><div className="pt-2 text-xs text-slate-400">กรุณาติดต่อเจ้าหน้าที่</div></div></div>;
  if (submitted) return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4"><div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-200 text-center space-y-5"><div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600"><CheckCircle className="w-8 h-8" /></div><h3 className="text-2xl font-black text-slate-800">ส่งแบบประเมินเรียบร้อย</h3><p className="text-sm text-slate-600 font-semibold">ระบบได้บันทึกข้อมูลอาการของ <span className="text-blue-600 text-base font-black">"{patient?.name}"</span> เรียบร้อยแล้ว</p></div></div>;

  const activeSymptom = symptomsMeta[currentStep];

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 flex justify-center items-center">
      <div className="w-full max-w-lg space-y-5">
        <div className="bg-white rounded-2xl px-6 py-4 border border-slate-200 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-2"><Activity className="w-5 h-5 text-blue-600" /><span className="text-sm font-black text-slate-700">แบบประเมินอาการ ESAS</span></div>
          {started && <button onClick={() => setAutoPlayVoice(!autoPlayVoice)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${autoPlayVoice ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>{autoPlayVoice ? <><Volume2 className="w-3.5 h-3.5" />เปิดเสียง</> : <><VolumeX className="w-3.5 h-3.5" />ปิดเสียง</>}</button>}
        </div>

        {!started ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-blue-50 rounded-full border border-blue-100 overflow-hidden flex items-center justify-center shadow-inner"><img src="/gm_happy.png" alt="ยาย" className="w-full h-full object-cover" /></div>
            <div className="space-y-2"><h3 className="font-extrabold text-slate-800 text-xl">ยินดีต้อนรับสู่ระบบทำแบบประเมินอาการ</h3><p className="text-sm text-blue-600 font-bold">คนไข้: {patient?.name} (HN: {patient?.HN})</p><p className="text-xs text-slate-500 font-medium">แบบประเมินนี้ใช้เพื่อติดตามอาการรายวัน มีเสียงพูดประกอบ</p></div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-[11px] text-amber-800 text-left flex gap-2"><span>🔊</span><div><strong>คำแนะนำเรื่องเสียงพูด:</strong><br/>หากเปิดผ่าน LINE แล้วไม่ได้ยินเสียง กด <strong>จุด 3 จุด → "เปิดด้วยเบราว์เซอร์อื่น"</strong></div></div>
            <button onClick={handleStart} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-bold text-base shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"><Play className="w-5 h-5 fill-white" />เริ่มทำแบบประเมิน (เปิดเสียงพูด)</button>
          </div>
        ) : currentStep < 9 ? (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5 flex flex-col items-center text-center">
            <div className="w-full flex justify-between items-center text-xs font-bold text-slate-400 border-b border-slate-100 pb-3"><span>คนไข้: {patient?.name}</span><span className="text-blue-600">ข้อที่ {currentStep + 1} / 9</span></div>
            <div className="w-48 h-48 bg-slate-50 rounded-full border border-slate-100 overflow-hidden flex items-center justify-center shadow-inner"><img src={getGrandmaImage(scores[activeSymptom.key])} alt="ยาย" className="w-full h-full object-cover transition-all duration-300" /></div>
            <div className="space-y-1.5 w-full"><div className="flex items-center justify-center gap-2"><h3 className="font-extrabold text-slate-800 text-lg">{activeSymptom.label}</h3><button onClick={() => speakText(activeSymptom.voiceLabel)} className="p-1.5 hover:bg-slate-100 rounded-full text-blue-600" title="ฟังเสียง"><Volume2 className="w-5 h-5" /></button></div><p className="text-xs text-slate-500 font-medium px-4">{activeSymptom.desc}</p></div>
            <div className="w-full space-y-3 pt-2">
              <div className="flex justify-between items-center text-xs font-black text-slate-400"><span>0 (ดี/ปกติ)</span><span className={`text-2xl px-5 py-1.5 rounded-full font-black ${scores[activeSymptom.key] >= 7 ? 'bg-red-100 text-red-700 animate-pulse' : scores[activeSymptom.key] >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{scores[activeSymptom.key]}</span><span>10 (แย่ที่สุด)</span></div>
              <input type="range" min="0" max="10" value={scores[activeSymptom.key]} onChange={(e) => handleSliderChange(activeSymptom.key, e.target.value)} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              <div className="grid grid-cols-11 gap-1 pt-1 select-none">{Array.from({length:11}, (_, n) => <button key={n} onClick={() => handleSliderChange(activeSymptom.key, n)} className={`py-1.5 rounded-lg text-xs font-black transition-all border ${scores[activeSymptom.key] === n ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>{n}</button>)}</div>
              <p className={`text-sm font-black mt-2 ${scores[activeSymptom.key] >= 7 ? 'text-red-600' : scores[activeSymptom.key] >= 4 ? 'text-amber-600' : 'text-emerald-600'}`}>{getScoreDescription(scores[activeSymptom.key])}</p>
            </div>
            <div className="w-full flex gap-3 pt-5 border-t border-slate-100 mt-2">
              <button onClick={handleBack} disabled={currentStep === 0} className="flex-1 flex items-center justify-center gap-1 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all disabled:opacity-40"><ChevronLeft className="w-4 h-4" />ย้อนกลับ</button>
              <button onClick={handleNext} className="flex-1 flex items-center justify-center gap-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-500/20 transition-all">ต่อไป<ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="w-full flex justify-between items-center text-xs font-bold text-slate-400 border-b border-slate-100 pb-3"><span>คนไข้: {patient?.name}</span><span className="text-blue-600">ขั้นตอนสุดท้าย</span></div>
            <div className="text-center py-2"><h3 className="font-extrabold text-slate-800 text-lg">บันทึกเพิ่มเติมถึงพยาบาล</h3><p className="text-xs text-slate-500 mt-1">ระบุอาการอื่นๆ เช่น ท้องผูก สะอึก หลับไม่สนิท</p></div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="กรอกข้อความเพิ่มเติม (ไม่บังคับ)..." rows="4" className="w-full p-4 border border-slate-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-xs text-blue-800 flex gap-2"><span>💡</span><p><strong>ตรวจสอบก่อนส่ง:</strong> กดย้อนกลับเพื่อตรวจทานคะแนนแต่ละข้อ</p></div>
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button onClick={handleBack} className="flex-1 flex items-center justify-center gap-1 py-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm"><ChevronLeft className="w-4 h-4" />ย้อนกลับ</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center">{submitting ? 'กำลังส่ง...' : 'ส่งแบบประเมิน'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}