import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Activity, AlertCircle, CheckCircle, ChevronRight, ChevronLeft, 
  Volume2, VolumeX, Play, Heart, Thermometer, Gauge, Scale, 
  Clock, ShieldAlert, Sparkles, Send, Check, HeartPulse, User, PlusCircle, CheckSquare, Square, Download, ClipboardList, Wind
} from 'lucide-react';
import { apiPublicGet, apiPublicPost, getTtsUrl } from '../config';
import { db, collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, getDoc } from '../services/firebase';
import html2canvas from 'html2canvas';

const THAI_NUMBER_WORDS = [
  'ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 
  'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า', 'สิบ'
];

export default function ESASForm() {
  const { token } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [started, setStarted] = useState(false);
  const [assessmentConfig, setAssessmentConfig] = useState(null);
  const [lastAssessments, setLastAssessments] = useState([]);
  
  // Step: 0 to 8 = ESAS symptoms (9 items)
  // Step: 9 = Vital Signs & Other Symptoms
  // Step: 10 = Notes & Final Review
  const [currentStep, setCurrentStep] = useState(0);
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);

  const [notes, setNotes] = useState('');
  
  // Vital Signs state (Optional)
  const [vitalSigns, setVitalSigns] = useState({
    bp: '',
    pulse: '',
    temp: '',
    spo2: '',
    weight: ''
  });

  // Other symptoms checkboxes
  const [otherSymptoms, setOtherSymptoms] = useState([]);
  const commonOtherSymptoms = [
    'ท้องผูก ถ่ายลำบาก',
    'สะอึก ต่อเนื่อง',
    'อาการคัน ตามผิวหนัง',
    'ชาปลายมือปลายเท้า',
    'นอนไม่หลับ / หลับไม่สนิท',
    'แผลกดทับ / ปวดแผล',
    'มีเสมหะเหนียวข้น ขับไม่ออก'
  ];

  // 9 ESAS Symptoms (0-10 scale)
  const [scores, setScores] = useState({
    pain: 0,
    shortnessOfBreath: 0,
    tiredness: 0,
    drowsiness: 0,
    nausea: 0,
    appetite: 0,
    depression: 0,
    anxiety: 0,
    wellbeing: 0
  });

  const symptomsMeta = [
    { 
      key: 'pain', 
      title: 'อาการปวด (Pain)',
      short: 'ปวด',
      label: '1. อาการปวด (Pain)', 
      desc: '0 = ไม่ปวดเลย, 10 = ปวดรุนแรงที่สุดเท่าที่จะเป็นไปได้', 
      voiceLabel: 'ข้อที่หนึ่ง อาการปวด ศูนย์คือไม่มีอาการปวดเลย สิบคือปวดรุนแรงที่สุดเท่าที่จะเป็นไปได้ค่ะ',
      speechMap: (score, numWord) => {
        if (assessmentConfig && assessmentConfig['pain'] && assessmentConfig['pain'][score]) {
           return assessmentConfig['pain'][score].speechMessage;
        }
        if (score === 0) return 'อาการปวด ศูนย์คะแนน ไม่มีอาการปวดเลย สบายดีเป็นปกติค่ะ';
        if (score <= 3) return `อาการปวด เลือกระดับ ${numWord} คะแนน ปวดเล็กน้อย ยังทนไหวค่ะ`;
        if (score <= 6) return `อาการปวด เลือกระดับ ${numWord} คะแนน ปวดปานกลาง เริ่มรบกวนการใช้ชีวิตค่ะ`;
        if (score <= 8) return `อาการปวด เลือกระดับ ${numWord} คะแนน ปวดรุนแรง ควรรีบพักหรือแจ้งพยาบาลค่ะ`;
        return `อาการปวด เลือกระดับ ${numWord} คะแนน ปวดรุนแรงที่สุด หรือมีภาวะวิกฤตค่ะ`;
      }
    },
    { 
      key: 'shortnessOfBreath', 
      title: 'หายใจเหนื่อยหอบ (Dyspnea)',
      short: 'หอบ',
      label: '2. หายใจเหนื่อยหอบ (Dyspnea)', 
      desc: '0 = หายใจสะดวกดี, 10 = หายใจลำบาก เหนื่อยหอบรุนแรงที่สุด', 
      voiceLabel: 'ข้อที่สอง อาการหายใจเหนื่อยหอบ ศูนย์คือหายใจสะดวกดีปกติ สิบคือหายใจลำบากและเหนื่อยหอบรุนแรงที่สุดค่ะ',
      speechMap: (score, numWord) => {
        if (assessmentConfig && assessmentConfig['shortnessOfBreath'] && assessmentConfig['shortnessOfBreath'][score]) {
           return assessmentConfig['shortnessOfBreath'][score].speechMessage;
        }
        if (score === 0) return 'หายใจเหนื่อยหอบ ศูนย์คะแนน หายใจสะดวกดีเป็นปกติค่ะ';
        if (score <= 3) return `หายใจเหนื่อยหอบ เลือกระดับ ${numWord} คะแนน เหนื่อยเล็กน้อยเวลาออกแรงค่ะ`;
        if (score <= 6) return `หายใจเหนื่อยหอบ เลือกระดับ ${numWord} คะแนน เหนื่อยปานกลาง เริ่มรู้สึกอึดอัดค่ะ`;
        if (score <= 8) return `หายใจเหนื่อยหอบ เลือกระดับ ${numWord} คะแนน เหนื่อยหอบรุนแรง ควรรีบใช้ออกซิเจนหรือแจ้งพยาบาลค่ะ`;
        return `หายใจเหนื่อยหอบ เลือกระดับ ${numWord} คะแนน หายใจลำบากวิกฤตค่ะ`;
      }
    },
    { 
      key: 'tiredness', 
      title: 'ความเหนื่อยล้า / อ่อนเพลีย',
      short: 'เพลีย',
      label: '3. ความเหนื่อยล้า / อ่อนเพลีย (Tiredness)', 
      desc: '0 = กระฉับกระเฉงดี, 10 = อ่อนเพลียรุนแรงจนขยับตัวไม่ไหว', 
      voiceLabel: 'ข้อที่สาม ความเหนื่อยล้าหรืออ่อนเพลีย ศูนย์คือกระฉับกระเฉงดี สิบคืออ่อนเพลียรุนแรงจนขยับตัวไม่ไหวค่ะ',
      speechMap: (score, numWord) => {
        if (assessmentConfig && assessmentConfig['tiredness'] && assessmentConfig['tiredness'][score]) {
           return assessmentConfig['tiredness'][score].speechMessage;
        }
        if (score === 0) return 'ความเหนื่อยล้าหรืออ่อนเพลีย ศูนย์คะแนน กระฉับกระเฉงดีเป็นปกติค่ะ';
        if (score <= 3) return `ความเหนื่อยล้า เลือกระดับ ${numWord} คะแนน อ่อนเพลียเล็กน้อย พักแล้วดีขึ้นค่ะ`;
        if (score <= 6) return `ความเหนื่อยล้า เลือกระดับ ${numWord} คะแนน อ่อนเพลียปานกลาง ทำกิจวัตรได้ช้าลงค่ะ`;
        if (score <= 8) return `ความเหนื่อยล้า เลือกระดับ ${numWord} คะแนน อ่อนเพลียมาก แทบไม่มีแรงลุกค่ะ`;
        return `ความเหนื่อยล้า เลือกระดับ ${numWord} คะแนน อ่อนเพลียรุนแรง ขยับตัวไม่ไหวค่ะ`;
      }
    },
    { 
      key: 'drowsiness', 
      title: 'ความง่วงซึม (Drowsiness)',
      short: 'ซึม',
      label: '4. ความง่วงซึม (Drowsiness)', 
      desc: '0 = ตื่นตัวดี, 10 = ง่วงซึมตลอดเวลา ปลุกตื่นยาก', 
      voiceLabel: 'ข้อที่สี่ ความง่วงซึม ศูนย์คือตื่นตัวดีปกติ สิบคือง่วงซึมตลอดเวลาปลุกตื่นยากค่ะ',
      speechMap: (score, numWord) => {
        if (assessmentConfig && assessmentConfig['drowsiness'] && assessmentConfig['drowsiness'][score]) {
           return assessmentConfig['drowsiness'][score].speechMessage;
        }
        if (score === 0) return 'ความง่วงซึม ศูนย์คะแนน ตื่นตัวสดชื่นดีค่ะ';
        if (score <= 3) return `ความง่วงซึม เลือกระดับ ${numWord} คะแนน ง่วงเล็กน้อยในระหว่างวันค่ะ`;
        if (score <= 6) return `ความง่วงซึม เลือกระดับ ${numWord} คะแนน ง่วงปานกลาง เผลอหลับบ่อยค่ะ`;
        if (score <= 8) return `ความง่วงซึม เลือกระดับ ${numWord} คะแนน ง่วงซึมมาก ตอบสนองช้าลงค่ะ`;
        return `ความง่วงซึม เลือกระดับ ${numWord} คะแนน ง่วงซึมตลอดเวลา ปลุกตื่นยากมากค่ะ`;
      }
    },
    { 
      key: 'nausea', 
      title: 'อาการคลื่นไส้ (Nausea)',
      short: 'คลื่นไส้',
      label: '5. อาการคลื่นไส้ (Nausea)', 
      desc: '0 = ไม่รู้สึกคลื่นไส้เลย, 10 = คลื่นไส้และอาเจียนรุนแรงตลอด', 
      voiceLabel: 'ข้อที่ห้า อาการคลื่นไส้ ศูนย์คือไม่รู้สึกคลื่นไส้เลย สิบคือคลื่นไส้และอาเจียนรุนแรงตลอดเวลาค่ะ',
      speechMap: (score, numWord) => {
        if (assessmentConfig && assessmentConfig['nausea'] && assessmentConfig['nausea'][score]) {
           return assessmentConfig['nausea'][score].speechMessage;
        }
        if (score === 0) return 'อาการคลื่นไส้ ศูนย์คะแนน ไม่รู้สึกคลื่นไส้เลย สบายดีค่ะ';
        if (score <= 3) return `อาการคลื่นไส้ เลือกระดับ ${numWord} คะแนน คลื่นไส้เล็กน้อย ไม่อาเจียนค่ะ`;
        if (score <= 6) return `อาการคลื่นไส้ เลือกระดับ ${numWord} คะแนน คลื่นไส้ปานกลาง รู้สึกพะอืดพะอมค่ะ`;
        if (score <= 8) return `อาการคลื่นไส้ เลือกระดับ ${numWord} คะแนน คลื่นไส้รุนแรง มีอาการอาเจียนค่ะ`;
        return `อาการคลื่นไส้ เลือกระดับ ${numWord} คะแนน คลื่นไส้อาเจียนรุนแรงตลอดเวลาค่ะ`;
      }
    },
    { 
      key: 'appetite', 
      title: 'ความอยากอาหาร',
      short: 'เบื่ออาหาร',
      label: '6. ความอยากอาหาร (Lack of Appetite)', 
      desc: '0 = ทานได้ปกติ, 10 = เบื่ออาหารอย่างรุนแรง ทานไม่ได้เลย', 
      voiceLabel: 'ข้อที่หก ความอยากอาหาร ศูนย์คืออยากอาหารปกติรับประทานได้ดี สิบคือเบื่ออาหารอย่างรุนแรงและรับประทานไม่ได้เลยค่ะ',
      speechMap: (score, numWord) => {
        if (assessmentConfig && assessmentConfig['appetite'] && assessmentConfig['appetite'][score]) {
           return assessmentConfig['appetite'][score].speechMessage;
        }
        if (score === 0) return 'ความอยากอาหาร ศูนย์คะแนน รับประทานอาหารได้ปกติ เอร็ดอร่อยดีค่ะ';
        if (score <= 3) return `ความอยากอาหาร เลือกระดับ ${numWord} คะแนน เบื่ออาหารเล็กน้อย ยังทานได้พอสมควรค่ะ`;
        if (score <= 6) return `ความอยากอาหาร เลือกระดับ ${numWord} คะแนน เบื่ออาหารปานกลาง ทานได้ลดลงครึ่งหนึ่งค่ะ`;
        if (score <= 8) return `ความอยากอาหาร เลือกระดับ ${numWord} คะแนน เบื่ออาหารมาก ทานได้เพียงเล็กน้อยค่ะ`;
        return `ความอยากอาหาร เลือกระดับ ${numWord} คะแนน เบื่ออาหารรุนแรง ทานอาหารไม่ได้เลยค่ะ`;
      }
    },
    { 
      key: 'depression', 
      title: 'ความรู้สึกซึมเศร้า',
      short: 'ซึมเศร้า',
      label: '7. ความรู้สึกซึมเศร้า (Depression)', 
      desc: '0 = อารมณ์ดี มีกำลังใจ, 10 = ซึมเศร้า ท้อแท้หดหู่รุนแรงที่สุด', 
      voiceLabel: 'ข้อที่เจ็ด ความรู้สึกซึมเศร้า ศูนย์คืออารมณ์ดีปกติมีกำลังใจดี สิบคือซึมเศร้าหรือท้อแท้หดหู่รุนแรงที่สุดค่ะ',
      speechMap: (score, numWord) => {
        if (assessmentConfig && assessmentConfig['depression'] && assessmentConfig['depression'][score]) {
           return assessmentConfig['depression'][score].speechMessage;
        }
        if (score === 0) return 'ความรู้สึกซึมเศร้า ศูนย์คะแนน อารมณ์ดี มีกำลังใจแจ่มใสค่ะ';
        if (score <= 3) return `ความรู้สึกซึมเศร้า เลือกระดับ ${numWord} คะแนน ซึมเศร้าหรือเหงาเล็กน้อยค่ะ`;
        if (score <= 6) return `ความรู้สึกซึมเศร้า เลือกระดับ ${numWord} คะแนน รู้สึกหดหู่ท้อแท้ปานกลางค่ะ`;
        if (score <= 8) return `ความรู้สึกซึมเศร้า เลือกระดับ ${numWord} คะแนน ซึมเศร้ามาก รู้สึกหมดหวังค่ะ`;
        return `ความรู้สึกซึมเศร้า เลือกระดับ ${numWord} คะแนน ท้อแท้หดหู่รุนแรงที่สุดค่ะ`;
      }
    },
    { 
      key: 'anxiety', 
      title: 'ความวิตกกังวล',
      short: 'กังวล',
      label: '8. ความวิตกกังวล (Anxiety)', 
      desc: '0 = สงบ ปลอดภัยดี, 10 = วิตกกังวล กลัว กระสับกระส่ายรุนแรง', 
      voiceLabel: 'ข้อที่แปด ความวิตกกังวล ศูนย์คือรู้สึกสงบปลอดภัยดีปกติ สิบคือกังวลกลัวกระสับกระส่ายรุนแรงที่สุดค่ะ',
      speechMap: (score, numWord) => {
        if (assessmentConfig && assessmentConfig['anxiety'] && assessmentConfig['anxiety'][score]) {
           return assessmentConfig['anxiety'][score].speechMessage;
        }
        if (score === 0) return 'ความวิตกกังวล ศูนย์คะแนน รู้สึกสงบ ปลอดภัย สบายใจดีค่ะ';
        if (score <= 3) return `ความวิตกกังวล เลือกระดับ ${numWord} คะแนน กังวลเล็กน้อย ยังควบคุมได้ค่ะ`;
        if (score <= 6) return `ความวิตกกังวล เลือกระดับ ${numWord} คะแนน กังวลปานกลาง รู้สึกกระวนกระวายค่ะ`;
        if (score <= 8) return `ความวิตกกังวล เลือกระดับ ${numWord} คะแนน กังวลมาก กลัว กระสับกระส่ายค่ะ`;
        return `ความวิตกกังวล เลือกระดับ ${numWord} คะแนน วิตกกังวลและตื่นตระหนกรุนแรงที่สุดค่ะ`;
      }
    },
    { 
      key: 'wellbeing', 
      title: 'สุขภาวะโดยรวม',
      short: 'สุขภาวะ',
      label: '9. สุขภาวะโดยรวม (Overall Wellbeing)', 
      desc: '0 = สบายตัวสบายใจดีมาก, 10 = รู้สึกไม่สบายตัวแย่ที่สุด', 
      voiceLabel: 'ข้อที่เก้า ความรู้สึกสบายหรือสุขภาวะโดยรวม ศูนย์คือรู้สึกสบายตัวสบายใจดีมาก สิบคือไม่สบายตัวอย่างรุนแรงที่สุดค่ะ',
      speechMap: (score, numWord) => {
        if (assessmentConfig && assessmentConfig['wellbeing'] && assessmentConfig['wellbeing'][score]) {
           return assessmentConfig['wellbeing'][score].speechMessage;
        }
        if (score === 0) return 'สุขภาวะโดยรวม ศูนย์คะแนน สบายตัว สบายใจดีมากค่ะ';
        if (score <= 3) return `สุขภาวะโดยรวม เลือกระดับ ${numWord} คะแนน รู้สึกสบายดี มีอาการรบกวนเพียงเล็กน้อยค่ะ`;
        if (score <= 6) return `สุขภาวะโดยรวม เลือกระดับ ${numWord} คะแนน ไม่ค่อยสบายตัว ปานกลางค่ะ`;
        if (score <= 8) return `สุขภาวะโดยรวม เลือกระดับ ${numWord} คะแนน ไม่สบายตัวมาก รู้สึกทรมานค่ะ`;
        return `สุขภาวะโดยรวม เลือกระดับ ${numWord} คะแนน รู้สึกแย่และทรมานที่สุดค่ะ`;
      }
    }
  ];

  useEffect(() => {
    const verifyTokenAndLoadConfig = async () => {
      try {
        const q = query(collection(db, 'patients'), where('token', '==', token));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            throw new Error('ลิงก์ทำแบบประเมินไม่ถูกต้องหรือหมดอายุ');
        }
        const patientData = snapshot.docs[0].data();
        patientData.id = snapshot.docs[0].id;
        setPatient(patientData);

        // Fetch last 2 assessments
        const assQ = query(collection(db, 'assessments'), where('patientId', '==', patientData.id));
        const assSnap = await getDocs(assQ);
        const assessments = assSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return timeB - timeA;
            })
            .slice(0, 2);
        setLastAssessments(assessments);

        // Fetch config
        const docRef = doc(db, 'systemSettings', 'assessmentConfig');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAssessmentConfig(docSnap.data());
        }
      } catch (err) {
        setError(err.message || 'ลิงก์ทำแบบประเมินไม่ถูกต้องหรือหมดอายุ');
      } finally {
        setLoading(false);
      }
    };
    if (token) verifyTokenAndLoadConfig();
  }, [token]);

  const audioRef = useRef(null);
  const thaiVoiceRef = useRef(null);
  const summaryRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEngine, setTtsEngine] = useState('native');
  const hasSpokenWelcomeRef = useRef(false);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setTtsEngine('google');
      return;
    }
    const updateVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return; // Wait for onvoiceschanged to fire

      // Try to find a female Thai voice first
      let voice = voices.find(v => 
        (v.lang === 'th-TH' || v.lang.startsWith('th')) && 
        (v.name.includes('Premwadee') || v.name.includes('Siri') || v.name.includes('Kanya') || v.name.includes('Google') || v.name.toLowerCase().includes('female'))
      );
      
      // If no specific female voice found, fallback to ANY Thai voice
      if (!voice) {
        voice = voices.find(v => v.lang === 'th-TH' || v.lang.startsWith('th'));
      }
      
      if (voice) {
        thaiVoiceRef.current = voice;
        setTtsEngine('native');
      } else {
        setTtsEngine('google');
      }
    };
    
    // Attempt immediately in case voices are already loaded
    updateVoice();
    
    // Also set a fallback timeout in case onvoiceschanged never fires (some Android browsers)
    const timeout = setTimeout(() => {
      if (window.speechSynthesis.getVoices().length === 0) {
        setTtsEngine('google');
      } else {
        updateVoice();
      }
    }, 1000);

    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(timeout);
      updateVoice();
    };
  }, []);

  useEffect(() => () => { 
    if ('speechSynthesis' in window) window.speechSynthesis.cancel(); 
    if (audioRef.current) audioRef.current.pause();
  }, []);

  const speakText = (text) => {
    if (!text) return;
    setIsSpeaking(true);
    
    const cleanText = text.replace(/[😊👍😐😟🚨💚❤️🩺📝]/g, '').trim();

    if (ttsEngine === 'google') {
      try {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (audioRef.current) audioRef.current.pause();
        
        const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=th&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
        const audio = document.createElement('audio');
        audio.referrerPolicy = 'no-referrer';
        audio.src = fallbackUrl;
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        audio.play().catch(() => setIsSpeaking(false));
        audioRef.current = audio;
      } catch(e) {
        setIsSpeaking(false);
      }
      return;
    }

    // Native Web Speech API (Strict Thai)
    try {
      if (audioRef.current) audioRef.current.pause();
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'th-TH';
      utterance.rate = 0.75; // Slower rate (was 0.9)
      utterance.pitch = 1.1; // Slightly higher pitch for female voice
      if (thaiVoiceRef.current) utterance.voice = thaiVoiceRef.current;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      setTimeout(() => window.speechSynthesis.speak(utterance), 50);
    } catch(e) {
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    if (!loading && !started && autoPlayVoice && !hasSpokenWelcomeRef.current && !error) {
      hasSpokenWelcomeRef.current = true;
      const welcomeMessage = "สวัสดีค่ะ ยินดีต้อนรับสู่ระบบประเมินอาการ แบบประเมินนี้ประกอบด้วย 9 อาการหลัก ได้แก่ 1. อาการปวด, 2. หายใจเหนื่อยหอบ, 3. ความเหนื่อยล้า, 4. ความง่วงซึม, 5. อาการคลื่นไส้, 6. ความอยากอาหาร, 7. ความรู้สึกซึมเศร้า, 8. ความวิตกกังวล, และ 9. สุขภาวะโดยรวม กดปุ่ม เริ่มทำแบบประเมิน เพื่อเริ่มต้นได้เลยค่ะ";
      setTimeout(() => {
        speakText(welcomeMessage);
      }, 1000);
    }
  }, [loading, started, autoPlayVoice, error]);

  const handleStart = () => { 
    setStarted(true); 
    if (autoPlayVoice) {
      speakText(symptomsMeta[0].voiceLabel); 
    }
  };

  const handleScoreSelect = (key, val) => {
    const scoreVal = parseInt(val);
    setScores(prev => ({ ...prev, [key]: scoreVal }));
    
    if (autoPlayVoice) {
      const meta = symptomsMeta.find(s => s.key === key);
      const numWord = THAI_NUMBER_WORDS[scoreVal] || String(scoreVal);
      if (meta && meta.speechMap) {
        const msg = meta.speechMap(scoreVal, numWord);
        speakText(msg);
      } else {
        const desc = getScoreDescription(scoreVal);
        speakText(`เลือกระดับ ${numWord} คะแนน ${desc}`);
      }
    }
  };

  const handleNext = () => { 
    if (currentStep < 10) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep); 
      if (autoPlayVoice) {
        if (nextStep < 9) {
          speakText(symptomsMeta[nextStep].voiceLabel);
        } else if (nextStep === 9) {
          speakText('ขั้นตอนที่สิบ สัญญาณชีพและอาการอื่นๆ หากมีเครื่องวัดที่บ้าน สามารถกรอกได้ค่ะ');
        } else if (nextStep === 10) {
          speakText('ขั้นตอนสุดท้าย บันทึกเพิ่มเติมถึงพยาบาล และกดส่งแบบประเมินค่ะ');
        }
      }
    }
  };
  
  const handleBack = () => { 
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep); 
      if (autoPlayVoice && prevStep < 9) {
        speakText(symptomsMeta[prevStep].voiceLabel);
      }
    }
  };

  const toggleOtherSymptom = (item) => {
    setOtherSymptoms(prev => 
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const selfCareGuides = {};
      Object.entries(scores).forEach(([key, score]) => {
          const defaultGuide = score >= 7 ? 'แนะนำให้ติดต่อพยาบาลด่วนเพื่อรับคำแนะนำเพิ่มเติม' : 'พักผ่อนให้เพียงพอและสังเกตอาการ';
          selfCareGuides[key] = assessmentConfig?.[key]?.[score]?.selfCareGuide || defaultGuide;
      });

      const assessmentData = {
        patientId: patient.id,
        scores,
        notes,
        vitalSigns,
        otherSymptoms: otherSymptoms.join(', '),
        selfCareGuides,
        createdAt: serverTimestamp(),
        date: new Date().toLocaleDateString('th-TH')
      };
      
      await addDoc(collection(db, 'assessments'), assessmentData);
      
      await updateDoc(doc(db, 'patients', patient.id), {
          status: 'ประเมินแล้ว',
          latestAssessment: assessmentData
      });

      if (autoPlayVoice) speakText('ส่งแบบประเมินเรียบร้อย ขอบคุณค่ะ แคปเจอร์หน้าจอนี้เก็บไว้เพื่อดูคำแนะนำการดูแลตนเองนะคะ');
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการส่งแบบประเมิน กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  const getGrandmaImage = (score) => {
    if (score <= 3) return '/gm_happy.png';
    if (score <= 6) return '/gm_neutral.png';
    return '/gm_severe.png';
  };

  const getScoreDescription = (score) => {
    const symId = activeSymptom?.key;
    if (symId && assessmentConfig && assessmentConfig[symId] && assessmentConfig[symId][score] && assessmentConfig[symId][score].displayMessage) {
        return assessmentConfig[symId][score].displayMessage;
    }
    if (score === 0) return 'ไม่มีอาการเลย สบายดีเป็นปกติ 😊';
    if (score <= 3) return 'อาการระดับน้อย สบายดีอยู่ ยังทนไหว 👍';
    if (score <= 6) return 'อาการระดับปานกลาง เริ่มรู้สึกอึดอัดรบกวน 😐';
    if (score <= 8) return 'อาการระดับรุนแรง ควรรีบพักหรือแจ้งพยาบาล 😟';
    return 'อาการระดับรุนแรงที่สุด / วิกฤต 🚨';
  };

  const getScoreBadgeClass = (score) => {
    if (score >= 7) return 'bg-red-600 text-white border-red-700 shadow-md ring-4 ring-red-100';
    if (score >= 4) return 'bg-amber-500 text-white border-amber-600 shadow-md ring-4 ring-amber-100';
    return 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-4 ring-emerald-100';
  };

  const getScoreCardClass = (score) => {
    if (score >= 7) return 'bg-red-50 border-2 border-red-400 text-red-900';
    if (score >= 4) return 'bg-amber-50 border-2 border-amber-400 text-amber-900';
    return 'bg-emerald-50 border-2 border-emerald-400 text-emerald-900';
  };

  const isAnyCritical = Object.values(scores).some(s => s >= 7);

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3 bg-white p-8 rounded-3xl shadow-md border border-emerald-100">
          <HeartPulse className="w-12 h-12 text-emerald-600 animate-bounce mx-auto" />
          <h3 className="text-lg font-black text-slate-800">กำลังดาวน์โหลดข้อมูลแบบประเมิน...</h3>
          <p className="text-xs text-slate-500 font-medium">ระบบ Palliative Care รพ.พล</p>
        </div>
      </div>
    );
  }

  if (error && !submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-red-100 text-center space-y-5">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800">เกิดข้อผิดพลาด</h3>
            <p className="text-sm text-slate-500 font-medium">{error}</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 text-left">
            📞 <strong>ติดต่อสายด่วน:</strong> หากมีข้อสงสัยหรืออาการผิดปกติ กรุณาติดต่อเบอร์ศูนย์ดูแลประคับประคอง รพ.พล โดยตรง
          </div>
        </div>
      </div>
    );
  }

  const handleDownloadImage = async () => {
    if (!summaryRef.current) return;
    try {
      const canvas = await html2canvas(summaryRef.current, {
        scale: 2,
        backgroundColor: '#f8fafc',
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `esas-summary-${patient?.name || 'patient'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating image', err);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-emerald-50/60 py-8 px-4 flex items-center justify-center">
        <div className="w-full max-w-md space-y-4">
          
          <div ref={summaryRef} className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-100 text-center space-y-6 animate-fadeIn">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 border-4 border-emerald-50 shadow-inner">
              <CheckCircle className="w-10 h-10" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-slate-800">ส่งแบบประเมินเรียบร้อย</h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                ระบบได้บันทึกข้อมูลอาการของ <br/>
                <span className="text-emerald-700 text-base sm:text-lg font-black">"{patient?.name}"</span> เรียบร้อยแล้ว
              </p>
            </div>

            {/* Score Summary and Self-Care */}
            <div className="space-y-3">
              {symptomsMeta.map(s => {
                const val = scores[s.key];
                let badgeClass = 'bg-emerald-50 border-emerald-200 text-emerald-900';
                let scoreBadge = 'bg-emerald-200 text-emerald-900 border-emerald-300';
                if (val >= 7) {
                  badgeClass = 'bg-red-50 border-red-200 text-red-900';
                  scoreBadge = 'bg-red-200 text-red-900 border-red-300';
                } else if (val >= 4) {
                  badgeClass = 'bg-amber-50 border-amber-200 text-amber-900';
                  scoreBadge = 'bg-amber-200 text-amber-900 border-amber-300';
                }
                const defaultGuide = val >= 7 ? 'แนะนำให้ติดต่อพยาบาลด่วนเพื่อรับคำแนะนำเพิ่มเติม' : 'พักผ่อนให้เพียงพอและสังเกตอาการ';
                const guide = assessmentConfig?.[s.key]?.[val]?.selfCareGuide || defaultGuide;

                return (
                  <div key={s.key} className={`p-4 rounded-2xl border text-left shadow-sm ${badgeClass}`}>
                    <div className="flex justify-between items-center">
                       <span className="font-bold text-sm sm:text-base">{s.title}</span>
                       <span className={`font-black px-3 py-1 rounded-lg border text-sm shadow-sm ${scoreBadge}`}>
                          คะแนน: {val} / 10
                       </span>
                    </div>
                    {guide && (
                      <div className="text-xs sm:text-sm pt-3 mt-3 border-t border-black/5 flex items-start gap-2 font-medium">
                        <HeartPulse className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
                        <span>{guide}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {isAnyCritical && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-xs text-red-700 text-left space-y-1.5 shadow-sm">
                <div className="flex items-center gap-1.5 font-black text-red-800 text-sm">
                  <ShieldAlert className="w-4 h-4" /> ตรวจพบคะแนนอาการระดับวิกฤต (≥ 7)
                </div>
                <p className="leading-relaxed font-medium">
                  ระบบได้ส่งการแจ้งเตือนด่วนไปยังพยาบาลและทีมแพทย์แล้ว หากคนไข้มีอาการเหนื่อยหอบมากหรือไม่รู้สึกตัว กรุณาโทรติดต่อ รพ.พล ทันที
                </p>
              </div>
            )}

            <div className="pt-2 text-[10px] sm:text-xs text-slate-400 font-bold border-t border-slate-100 mt-4">
              โรงพยาบาลพล • ศูนย์การดูแลแบบประคับประคอง
            </div>
          </div>

          <button 
            onClick={handleDownloadImage}
            className="w-full flex items-center justify-center gap-2 py-4 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white border-2 border-slate-700 rounded-2xl font-black text-base shadow-lg transition-all cursor-pointer"
          >
            <Download className="w-5 h-5" />
            <span>บันทึกรูปภาพคำแนะนำ</span>
          </button>
        </div>
      </div>
    );
  }

  const activeSymptom = currentStep < 9 ? symptomsMeta[currentStep] : null;

  return (
    <div className="min-h-screen bg-slate-100/70 py-6 px-4 flex justify-center items-center font-sans">
      <div className="w-full max-w-lg space-y-4">
        
        {/* Header Bar */}
        <div className="bg-white rounded-2xl px-5 py-4 border border-slate-200 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200 shadow-inner">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-black text-slate-800">แบบประเมินอาการ ESAS</div>
              <div className="text-xs text-slate-500 font-medium">รพ.พล Home Ward</div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1.5">
            <button 
              type="button"
              onClick={() => {
                const nextVal = !autoPlayVoice;
                setAutoPlayVoice(nextVal);
                if (nextVal) speakText('เปิดระบบเสียงพูดแล้วค่ะ');
              }} 
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-black transition-all border cursor-pointer ${
                autoPlayVoice 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm ring-2 ring-emerald-100' 
                  : 'bg-slate-100 border-slate-300 text-slate-500'
              }`}
            >
              {autoPlayVoice ? (
                <><Volume2 className="w-4 h-4 text-emerald-600" /><span>เปิดเสียง</span></>
              ) : (
                <><VolumeX className="w-4 h-4 text-slate-400" /><span>ปิดเสียง</span></>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => {
                const nextEngine = ttsEngine === 'native' ? 'google' : 'native';
                setTtsEngine(nextEngine);
                
                setTimeout(() => {
                  const alertMsg = nextEngine === 'google' 
                    ? 'เปลี่ยนมาใช้ระบบเสียงสำรอง' 
                    : 'เปลี่ยนกลับมาใช้ระบบเสียงมาตรฐาน';
                  
                  if (nextEngine === 'google') {
                     const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=th&client=tw-ob&q=${encodeURIComponent(alertMsg)}`;
                     const audio = document.createElement('audio');
                     audio.referrerPolicy = 'no-referrer';
                     audio.src = url;
                     audio.play().catch(e=>console.log(e));
                  } else {
                     if ('speechSynthesis' in window) {
                       window.speechSynthesis.cancel();
                       const u = new SpeechSynthesisUtterance(alertMsg);
                       u.lang = 'th-TH';
                       if (thaiVoiceRef.current) u.voice = thaiVoiceRef.current;
                       setTimeout(() => window.speechSynthesis.speak(u), 50);
                     }
                  }
                }, 50);
              }}
              className="text-[10px] text-slate-400 hover:text-emerald-600 font-bold underline cursor-pointer"
            >
              ไม่มีเสียง? ลองเปลี่ยนระบบ (ปัจจุบัน: {ttsEngine === 'native' ? 'มาตรฐาน' : 'สำรอง'})
            </button>
          </div>
        </div>

          {/* Header Bar */}

        {/* STEP 0: Welcome Screen */}
        {!started ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-6">
            <div className="w-28 h-28 bg-emerald-50 rounded-full border-4 border-emerald-100 overflow-hidden flex items-center justify-center shadow-inner">
              <img src="/gm_happy.png" alt="คุณยาย" className="w-full h-full object-cover" />
            </div>
            
            <div className="space-y-2">
              <h2 className="font-black text-slate-800 text-xl sm:text-2xl">
                ยินดีต้อนรับสู่ระบบประเมินอาการ
              </h2>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 rounded-full text-sm font-bold text-emerald-800 border border-emerald-200">
                <User className="w-4 h-4 text-emerald-600" /> คนไข้: {patient?.name} (HN: {patient?.HN})
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium pt-1">
                แบบประเมิน 9 อาการหลัก เพื่อให้แพทย์และพยาบาลติดตามอาการได้ต่อเนื่อง
              </p>
            </div>



            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800 text-left flex gap-2.5 leading-relaxed shadow-sm">
              <span className="text-lg">🔊</span>
              <div>
                <strong>คำแนะนำเรื่องเสียงพูด:</strong> หากเปิดผ่าน LINE แล้วไม่ได้ยินเสียง กรุณากด <strong>จุด 3 จุด มุมขวาบน → "เปิดด้วยเบราว์เซอร์อื่น" (Chrome/Safari)</strong>
              </div>
            </div>

            {/* Last 2 Assessments History */}
            {lastAssessments.length > 0 && (
              <div className="w-full text-left space-y-3 mt-2">
                <h3 className="text-sm font-black text-slate-700 flex items-center gap-1.5 border-b pb-2"><ClipboardList className="w-4 h-4"/> ประวัติการประเมินอาการ 2 ครั้งล่าสุด</h3>
                <div className="space-y-3">
                  {lastAssessments.map((ass, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <div className="text-xs font-bold text-slate-500 mb-2">{ass.date} {ass.createdAt?.toDate ? ass.createdAt.toDate().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                      <div className="grid grid-cols-9 gap-1">
                        {symptomsMeta.map(s => {
                          const val = (ass.scores && ass.scores[s.key]) ?? 0;
                          return (
                            <div key={s.key} className={`text-center py-1 border rounded ${val >= 7 ? 'bg-red-50 text-red-600 border-red-200 font-bold' : 'bg-white text-slate-600 border-slate-200'}`}>
                              <div className="text-[8px] truncate">{s.short}</div>
                              <div className="text-xs">{val}</div>
                            </div>
                          )
                        })}
                      </div>
                      {(ass.vitalSigns || ass.bp) && (
                        <div className="flex flex-wrap gap-3 text-[10px] mt-2 font-bold text-slate-500 bg-white p-1.5 rounded border border-slate-100">
                            <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-rose-500"/> BP: {ass.vitalSigns?.bp || ass.bp || '-'}</span>
                            <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-500"/> HR: {ass.vitalSigns?.pulse || ass.pulse || '-'}</span>
                            <span className="flex items-center gap-1"><Thermometer className="w-3 h-3 text-amber-500"/> Temp: {ass.vitalSigns?.temp || ass.temp || '-'}</span>
                            <span className="flex items-center gap-1"><Wind className="w-3 h-3 text-blue-500"/> SpO2: {ass.vitalSigns?.spo2 || ass.spo2 || '-'}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button 
              type="button"
              onClick={handleStart} 
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl font-black text-base sm:text-lg shadow-lg shadow-emerald-600/30 border border-emerald-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" /> เริ่มทำแบบประเมิน (เปิดเสียงพูด)
            </button>
          </div>
        ) : currentStep < 9 ? (
          /* STEP 1-9: ESAS 9 Symptoms */
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5 flex flex-col items-center text-center">
            
            {/* Step & Patient Header */}
            <div className="w-full flex justify-between items-center text-xs sm:text-sm font-bold text-slate-500 border-b border-slate-100 pb-3">
              <span className="truncate max-w-[200px]">คนไข้: <strong className="text-slate-800 font-black">{patient?.name}</strong></span>
              <span className="text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 font-black">
                ข้อที่ {currentStep + 1} / 9
              </span>
            </div>

            {/* Avatar based on score */}
            <div className="w-40 h-40 sm:w-48 sm:h-48 bg-slate-50 rounded-full border-4 border-emerald-100 overflow-hidden flex items-center justify-center shadow-inner relative group">
              <img 
                src={getGrandmaImage(scores[activeSymptom.key])} 
                alt="ระดับความรู้สึก" 
                className="w-full h-full object-cover transition-all duration-300 transform scale-105" 
              />
            </div>

            {/* Symptom Title & Voice prompt */}
            <div className="space-y-1 w-full">
              <div className="flex items-center justify-center gap-2">
                <h3 className="font-black text-slate-800 text-xl sm:text-2xl">
                  {activeSymptom.label}
                </h3>
                <button 
                  type="button"
                  onClick={() => {
                    const score = scores[activeSymptom.key];
                    const numWord = THAI_NUMBER_WORDS[score] || String(score);
                    speakText(activeSymptom.speechMap(score, numWord));
                  }} 
                  className={`p-2 rounded-full transition-colors border cursor-pointer ${
                    isSpeaking 
                      ? 'bg-emerald-200 text-emerald-700 border-emerald-400 scale-110 shadow-md' 
                      : 'hover:bg-emerald-100 text-emerald-600 border-emerald-200'
                  }`}
                  title="ฟังเสียงบรรยายอาการซ้ำ"
                >
                  <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-pulse' : ''}`} />
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-bold px-2">
                {activeSymptom.desc}
              </p>
            </div>

            {/* Score Slider & Buttons */}
            <div className="w-full space-y-4 pt-1">
              
              {/* Score Display Box */}
              <div className="flex justify-between items-center text-xs sm:text-sm font-black text-slate-600 px-1">
                <span className="text-emerald-700 font-black">0 (ไม่รู้สึกเลย)</span>
                <span className={`text-3xl sm:text-4xl px-7 py-2 rounded-2xl font-black transition-all ${getScoreBadgeClass(scores[activeSymptom.key])}`}>
                  {scores[activeSymptom.key]}
                </span>
                <span className="text-red-600 font-black">10 (แย่ที่สุด)</span>
              </div>

              {/* Slider */}
              <input 
                type="range" 
                min="0" 
                max="10" 
                value={scores[activeSymptom.key]} 
                onChange={(e) => handleScoreSelect(activeSymptom.key, e.target.value)} 
                className="w-full h-4 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" 
              />

              {/* 0-10 Button Grid (Clear & High Contrast) */}
              <div className="grid grid-cols-11 gap-1 sm:gap-1.5 pt-1 select-none">
                {Array.from({ length: 11 }, (_, n) => {
                  const isSelected = scores[activeSymptom.key] === n;
                  let btnColorClass = 'bg-white text-slate-800 border-slate-300 hover:bg-emerald-50 hover:border-emerald-400';
                  if (isSelected) {
                    if (n >= 7) btnColorClass = 'bg-red-600 text-white border-red-700 shadow-lg scale-110 ring-4 ring-red-200 font-black';
                    else if (n >= 4) btnColorClass = 'bg-amber-500 text-white border-amber-600 shadow-lg scale-110 ring-4 ring-amber-200 font-black';
                    else btnColorClass = 'bg-emerald-600 text-white border-emerald-700 shadow-lg scale-110 ring-4 ring-emerald-200 font-black';
                  }

                  return (
                    <button 
                      key={n} 
                      type="button"
                      onClick={() => handleScoreSelect(activeSymptom.key, n)} 
                      className={`py-3 sm:py-4 rounded-xl text-xs sm:text-base font-black transition-all border-2 cursor-pointer ${btnColorClass}`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>

              {/* Live score description card */}
              <div className={`text-sm sm:text-base font-black p-3.5 rounded-2xl shadow-sm transition-all ${getScoreCardClass(scores[activeSymptom.key])}`}>
                {getScoreDescription(scores[activeSymptom.key])}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="w-full flex gap-3 pt-3 border-t border-slate-100">
              <button 
                type="button"
                onClick={handleBack} 
                disabled={currentStep === 0} 
                className="flex-1 flex items-center justify-center gap-1 py-4 bg-slate-200 hover:bg-slate-300 border-2 border-slate-300 text-slate-800 rounded-2xl font-black text-base transition-all disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" /> ย้อนกลับ
              </button>
              <button 
                type="button"
                onClick={handleNext} 
                className="flex-1 flex items-center justify-center gap-1 py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border-2 border-emerald-700 rounded-2xl font-black text-base shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                ต่อไป <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : currentStep === 9 ? (
          /* STEP 10: Vital Signs & Other Symptoms */
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
            <div className="w-full flex justify-between items-center text-xs sm:text-sm font-bold text-slate-500 border-b border-slate-100 pb-3">
              <span>คนไข้: <strong className="text-slate-800 font-black">{patient?.name}</strong></span>
              <span className="text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 font-black">
                สัญญาณชีพ & อาการอื่น
              </span>
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-black text-slate-800 text-lg sm:text-xl">สัญญาณชีพประจำวัน (ถ้ามี)</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">หากที่บ้านมีเครื่องวัด สามารถกรอกข้อมูลได้ (ไม่บังคับ)</p>
            </div>

            {/* Vital Signs Inputs */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="text-xs font-black text-slate-700 flex items-center gap-1 mb-1">
                  <Gauge className="w-3.5 h-3.5 text-blue-500" /> ความดันโลหิต (BP)
                </label>
                <input
                  type="text"
                  placeholder="เช่น 120/80"
                  value={vitalSigns.bp}
                  onChange={(e) => setVitalSigns({ ...vitalSigns, bp: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 flex items-center gap-1 mb-1">
                  <Heart className="w-3.5 h-3.5 text-red-500" /> ชีพจร (Pulse, bpm)
                </label>
                <input
                  type="number"
                  placeholder="เช่น 78"
                  value={vitalSigns.pulse}
                  onChange={(e) => setVitalSigns({ ...vitalSigns, pulse: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 flex items-center gap-1 mb-1">
                  <Thermometer className="w-3.5 h-3.5 text-amber-500" /> อุณหภูมิ (°C)
                </label>
                <input
                  type="text"
                  placeholder="เช่น 36.8"
                  value={vitalSigns.temp}
                  onChange={(e) => setVitalSigns({ ...vitalSigns, temp: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 flex items-center gap-1 mb-1">
                  <Activity className="w-3.5 h-3.5 text-emerald-500" /> ออกซิเจน (SpO2, %)
                </label>
                <input
                  type="number"
                  placeholder="เช่น 98"
                  value={vitalSigns.spo2}
                  onChange={(e) => setVitalSigns({ ...vitalSigns, spo2: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1 mb-1">
                  <Scale className="w-3.5 h-3.5 text-purple-500" /> น้ำหนักตัว (กก.)
                </label>
                <input
                  type="text"
                  placeholder="เช่น 55.0"
                  value={vitalSigns.weight}
                  onChange={(e) => setVitalSigns({ ...vitalSigns, weight: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Other Symptoms Checklist */}
            <div className="space-y-2.5">
              <label className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-emerald-600" /> อาการอื่นๆ ที่พบร่วมด้วยในวันนี้:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {commonOtherSymptoms.map(item => {
                  const checked = otherSymptoms.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleOtherSymptom(item)}
                      className={`p-3 rounded-2xl text-left text-xs sm:text-sm font-black transition-all border-2 flex items-center gap-2.5 cursor-pointer ${
                        checked
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="w-full flex gap-3 pt-3 border-t border-slate-100">
              <button 
                type="button"
                onClick={handleBack} 
                className="flex-1 flex items-center justify-center gap-1 py-4 bg-slate-200 hover:bg-slate-300 border-2 border-slate-300 text-slate-800 rounded-2xl font-black text-base transition-all cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" /> ย้อนกลับ
              </button>
              <button 
                type="button"
                onClick={handleNext} 
                className="flex-1 flex items-center justify-center gap-1 py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border-2 border-emerald-700 rounded-2xl font-black text-base shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                ต่อไป <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          /* STEP 11: Final Review & Submit */
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
            <div className="w-full flex justify-between items-center text-xs sm:text-sm font-bold text-slate-500 border-b border-slate-100 pb-3">
              <span>คนไข้: <strong className="text-slate-800 font-black">{patient?.name}</strong></span>
              <span className="text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 font-black">
                สรุปและส่งแบบประเมิน
              </span>
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-black text-slate-800 text-xl sm:text-2xl">สรุปผลการประเมิน</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">สำหรับผู้ป่วย: {patient?.name}</p>
            </div>

            {/* Symptoms Summary Grid */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              {symptomsMeta.map(s => {
                const val = scores[s.key];
                let badge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                if (val >= 7) badge = 'bg-red-100 text-red-800 border-red-300 font-black';
                else if (val >= 4) badge = 'bg-amber-100 text-amber-800 border-amber-300 font-black';
                return (
                  <div key={s.key} className="bg-white p-2.5 rounded-xl border border-slate-200 text-center shadow-xs">
                    <div className="text-[11px] font-bold text-slate-600 truncate">{s.title}</div>
                    <div className={`text-base font-black px-2 py-0.5 rounded-lg border mt-1 inline-block ${badge}`}>
                      {val}
                    </div>
                  </div>
                );
              })}
            </div>

            {isAnyCritical && (
              <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 text-xs sm:text-sm text-red-800 flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-black">ข้อควรระวัง:</strong> ตรวจพบคะแนนอาการระดับวิกฤต (≥ 7) ระบบจะส่งสัญญาณเตือนด่วนไปยังพยาบาลและทีมแพทย์ทันที
                </div>
              </div>
            )}

            {/* Notes textarea */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-black text-slate-700">
                📝 ข้อความหรือข้อสงสัยเพิ่มเติมถึงพยาบาล (ถ้ามี):
              </label>
              <textarea
                rows="3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ระบุอาการเพิ่มเติม หรือสิ่งที่ต้องการให้พยาบาลช่วยเหลือ..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none resize-none"
              />
            </div>

            {/* Final Action Buttons */}
            <div className="w-full flex gap-3 pt-3 border-t border-slate-100">
              <button 
                type="button"
                onClick={handleBack} 
                className="flex-1 flex items-center justify-center gap-1 py-4 bg-slate-200 hover:bg-slate-300 border-2 border-slate-300 text-slate-800 rounded-2xl font-black text-base transition-all cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" /> ย้อนกลับ
              </button>
              <button 
                type="button"
                onClick={handleSubmit} 
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border-2 border-emerald-700 rounded-2xl font-black text-base shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>กำลังส่ง...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>ยืนยันส่งแบบประเมิน</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
      <audio ref={audioRef} className="hidden" referrerPolicy="no-referrer" />
    </div>
  );
}