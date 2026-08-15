import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, User, AlertCircle, HeartHandshake, ShieldCheck } from 'lucide-react';
import { loginWithUsername, db, doc, getDoc } from '../services/firebase';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userCredential = await loginWithUsername(username, password);
      const user = userCredential.user;
      
      // Fetch user profile to get role
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let userData = { uid: user.uid, email: user.email };
      if (userDoc.exists()) {
          userData = { ...userData, ...userDoc.data() };
      }

      onLoginSuccess(user.accessToken, userData);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-emerald-900/5 border border-emerald-100/80 overflow-hidden">
        {/* Header decoration */}
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>
        
        <div className="p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200/70 shadow-inner">
              <Activity className="w-10 h-10 text-emerald-600" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/70 text-emerald-800 text-xs font-bold mb-2">
              <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
              <span>โรงพยาบาลพล • Home Ward</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">เข้าสู่ระบบ Palliative Care</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">ระบบติดตามและดูแลผู้ป่วยประคับประคองที่บ้าน</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-sm text-red-700 animate-fadeIn">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                ชื่อผู้ใช้งาน (Username)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-400">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="กรอกชื่อผู้ใช้ (เช่น admin)"
                  required
                  className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-2xl text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-slate-50/50 hover:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-400">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่าน"
                  required
                  className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-2xl text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-slate-50/50 hover:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl font-bold text-base shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>กำลังเข้าสู่ระบบ...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>เข้าสู่ระบบ</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-slate-50/80 border-t border-slate-100 p-4 text-center text-xs text-slate-400 font-medium">
          ระบบสารสนเทศการแพทย์ Palliative Care • รพ.พล (v2.0)
        </div>
      </div>
    </div>
  );
}
