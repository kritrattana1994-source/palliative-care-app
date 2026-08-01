import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, User, AlertCircle } from 'lucide-react';
import { apiPost } from '../config';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const data = await apiPost('/api/auth/login', { username, password });
      onLoginSuccess(data.token, data.user); navigate('/dashboard');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200"><Activity className="w-8 h-8 text-blue-600" /></div>
            <h2 className="text-2xl font-black text-slate-800">เข้าสู่ระบบ รพ.พล</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Palliative Care (Home Ward) Portal</p>
          </div>
          {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-sm text-red-700"><AlertCircle className="w-5 h-5 shrink-0 text-red-600" /><span>{error}</span></div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div><label className="block text-sm font-bold text-slate-700 mb-2">ชื่อผู้ใช้งาน</label><div className="relative"><span className="absolute left-4 top-3.5 text-slate-400"><User className="w-5 h-5" /></span><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="กรอกชื่อผู้ใช้ (e.g. admin)" required className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" /></div></div>
            <div><label className="block text-sm font-bold text-slate-700 mb-2">รหัสผ่าน</label><div className="relative"><span className="absolute left-4 top-3.5 text-slate-400"><Lock className="w-5 h-5" /></span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="กรอกรหัสผ่าน" required className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" /></div></div>
            <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center">{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</button>
          </form>
        </div>
        <div className="bg-slate-50 border-t border-slate-100 p-5 text-center text-xs text-slate-400">รพ.พล Palliative Care System (v1.0.0)</div>
      </div>
    </div>
  );
}