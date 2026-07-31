import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientRegistry from './pages/PatientRegistry';
import ClinicalTimeline from './pages/ClinicalTimeline';
import ESASForm from './pages/ESASForm';
import { apiGet } from './config';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!token) { setLoading(false); return; }
      try {
        const data = await apiGet('/api/auth/me');
        setUser(data.user);
      } catch (err) { handleLogout(); } finally { setLoading(false); }
    })();
  }, [token]);

  const handleLoginSuccess = (newToken, loggedInUser) => {
    localStorage.setItem('token', newToken); setToken(newToken); setUser(loggedInUser);
  };
  const handleLogout = () => { localStorage.removeItem('token'); setToken(null); setUser(null); };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="text-slate-400 font-bold">กำลังตรวจสอบเซสชันผู้ใช้...</div></div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/assess/:token" element={<ESASForm />} />
        <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/*" element={token ? (<div className="flex h-screen overflow-hidden"><Sidebar user={user} onLogout={handleLogout} /><Routes><Route path="/dashboard" element={<Dashboard token={token} />} /><Route path="/registry" element={<PatientRegistry token={token} />} /><Route path="/timeline/:id" element={<ClinicalTimeline token={token} />} /><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></div>) : <Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}