import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, ClipboardList, X, Bell } from 'lucide-react';
import { db, collection, onSnapshot } from '../services/firebase';

// Returns a stop function; loops beep pattern until stop() is called
const startLoopingAlert = (isCritical) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return () => {};
    const ctx = new AudioContext();
    let stopped = false;

    const playBeep = (freq, startTime, duration, vol = 0.7) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.04);
      gain.gain.setValueAtTime(vol, startTime + duration - 0.04);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const schedulePattern = (baseTime) => {
      if (stopped) return;

      if (isCritical) {
        // 3 fast urgent beeps — total ~1.4s per loop
        playBeep(880, baseTime,        0.18, 0.8);
        playBeep(880, baseTime + 0.28, 0.18, 0.8);
        playBeep(880, baseTime + 0.56, 0.18, 0.8);
        const loopDuration = 1.4;
        setTimeout(() => schedulePattern(ctx.currentTime), loopDuration * 1000);
      } else {
        // 2 gentle tones — total ~1.8s per loop
        playBeep(523.25, baseTime,       0.22, 0.65);
        playBeep(659.25, baseTime + 0.35, 0.28, 0.65);
        const loopDuration = 1.8;
        setTimeout(() => schedulePattern(ctx.currentTime), loopDuration * 1000);
      }
    };

    schedulePattern(ctx.currentTime);

    return () => {
      stopped = true;
      ctx.close();
    };
  } catch (e) {
    console.error('Audio playback failed', e);
    return () => {};
  }
};

export default function GlobalAssessmentAlert() {
  const [alerts, setAlerts] = useState([]);
  // Map alertId -> stopFn
  const stopFnsRef = useRef({});

  useEffect(() => {
    const pageLoadTime = Date.now();
    const unsub = onSnapshot(collection(db, 'assessments'), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const createdAt = data.createdAt?.toMillis
            ? data.createdAt.toMillis()
            : data.createdAt?.seconds
            ? data.createdAt.seconds * 1000
            : Date.now();

          if (createdAt > pageLoadTime) {
            const alertObj = { ...data, _id: change.doc.id };
            setAlerts((prev) => [...prev, alertObj]);
            // Start looping sound and store stop function
            const stopFn = startLoopingAlert(data.isCritical);
            stopFnsRef.current[change.doc.id] = stopFn;
          }
        }
      });
    });
    return () => {
      unsub();
      // Stop all sounds on unmount
      Object.values(stopFnsRef.current).forEach((fn) => fn());
    };
  }, []);

  const dismiss = (id) => {
    // Stop the looping sound for this alert
    if (stopFnsRef.current[id]) {
      stopFnsRef.current[id]();
      delete stopFnsRef.current[id];
    }
    setAlerts((prev) => prev.filter((a) => a._id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 items-end pointer-events-none">
      {alerts.map((alert) => (
        <div
          key={alert._id}
          className={`pointer-events-auto w-80 rounded-2xl shadow-2xl border-2 overflow-hidden
            ${alert.isCritical ? 'bg-red-50 border-red-400' : 'bg-white border-blue-300'}`}
          style={{ animation: 'slideInRight 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}
        >
          {/* Header strip */}
          <div className={`flex items-center justify-between px-4 py-2.5 ${alert.isCritical ? 'bg-red-600' : 'bg-blue-600'}`}>
            <div className="flex items-center gap-2">
              {alert.isCritical
                ? <AlertCircle className="w-4 h-4 text-white animate-pulse" />
                : <Bell className="w-4 h-4 text-white" />
              }
              <span className="text-white font-black text-sm">
                {alert.isCritical ? 'คะแนนวิกฤต!' : 'มีแบบประเมินใหม่'}
              </span>
            </div>
            <button
              onClick={() => dismiss(alert._id)}
              className="text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-3 flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5
              ${alert.isCritical ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              {alert.isCritical
                ? <AlertCircle className="w-5 h-5" />
                : <ClipboardList className="w-5 h-5" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-800 truncate">{alert.patientName}</p>
              <p className="text-xs text-slate-500 font-semibold">HN: {alert.patientId}</p>
              <p className={`text-xs font-bold mt-1 ${alert.isCritical ? 'text-red-700' : 'text-blue-700'}`}>
                {alert.isCritical
                  ? 'มีคะแนนอาการ ≥ 7 — กรุณาตรวจสอบด่วน'
                  : 'ส่งแบบประเมินอาการเข้ามาใหม่แล้ว'}
              </p>
            </div>
          </div>

          {/* Dismiss button */}
          <div className="px-4 pb-3">
            <button
              onClick={() => dismiss(alert._id)}
              className={`w-full py-2 rounded-xl text-xs font-black transition-colors cursor-pointer
                ${alert.isCritical
                  ? 'bg-red-100 hover:bg-red-200 text-red-700'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                }`}
            >
              รับทราบ — หยุดเสียง
            </button>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
