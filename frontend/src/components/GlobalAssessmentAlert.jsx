import React, { useState, useEffect } from 'react';
import { AlertCircle, ClipboardList } from 'lucide-react';
import { db, collection, onSnapshot } from '../services/firebase';

const playAlertSound = (isCritical) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playBeep = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(1, startTime + 0.05);
      gain.gain.setValueAtTime(1, startTime + duration - 0.05);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    if (isCritical) {
      // Urgent: 3 fast high pitched beeps
      playBeep(880, now, 0.15);
      playBeep(880, now + 0.25, 0.15);
      playBeep(880, now + 0.5, 0.15);
    } else {
      // Normal: 2 gentle beeps
      playBeep(523.25, now, 0.2); // C5
      playBeep(659.25, now + 0.3, 0.3); // E5
    }
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

export default function GlobalAssessmentAlert() {
  const [newAssessmentAlert, setNewAssessmentAlert] = useState(null);

  useEffect(() => {
    const pageLoadTime = Date.now();
    const unsubscribeAssessments = onSnapshot(collection(db, 'assessments'), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : 0;
          // Only alert for NEW assessments after the page was loaded
          if (createdAt > pageLoadTime) {
            setNewAssessmentAlert(data);
            playAlertSound(data.isCritical);
          }
        }
      });
    });

    return () => {
      unsubscribeAssessments();
    };
  }, []);

  if (!newAssessmentAlert) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className={`bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border-4 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in duration-300 ${newAssessmentAlert.isCritical ? 'border-red-500' : 'border-blue-500'}`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${newAssessmentAlert.isCritical ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
          {newAssessmentAlert.isCritical ? <AlertCircle className="w-10 h-10" /> : <ClipboardList className="w-10 h-10" />}
        </div>
        <div className="space-y-2">
          <h3 className={`text-xl font-black ${newAssessmentAlert.isCritical ? 'text-red-700' : 'text-blue-700'}`}>
            {newAssessmentAlert.isCritical ? 'ตรวจพบคะแนนวิกฤต!' : 'มีแบบประเมินใหม่'}
          </h3>
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            ผู้ป่วย <strong>{newAssessmentAlert.patientName} (HN: {newAssessmentAlert.patientId})</strong><br/>
            {newAssessmentAlert.isCritical ? (
              <>มีคะแนนประเมินอาการตั้งแต่ 7 ขึ้นไป<br/>กรุณาตรวจสอบด่วน!</>
            ) : (
              <>ได้ส่งแบบประเมินอาการเข้ามาใหม่แล้ว<br/>โปรดตรวจสอบผลลัพธ์</>
            )}
          </p>
        </div>
        <button
          onClick={() => setNewAssessmentAlert(null)}
          className={`w-full py-3.5 mt-2 text-white font-black rounded-xl shadow-lg transition-colors cursor-pointer ${newAssessmentAlert.isCritical ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          รับทราบ
        </button>
      </div>
    </div>
  );
}
