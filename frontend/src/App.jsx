import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientRegistry from './pages/PatientRegistry';
import ClinicalTimeline from './pages/ClinicalTimeline';
import ESASForm from './pages/ESASForm';
import StaffManagement from './pages/StaffManagement';
import AssessmentConfig from './pages/AssessmentConfig';
import EquipmentDashboard from './pages/EquipmentDashboard';
import EquipmentBorrow from './pages/EquipmentBorrow';
import EquipmentReturn from './pages/EquipmentReturn';
import EquipmentPrintSlip from './pages/EquipmentPrintSlip';
import EquipmentManagement from './pages/EquipmentManagement';
import PrintQR from './pages/PrintQR';
import { auth, onAuthStateChanged, signOut, db, doc, getDoc } from './services/firebase';

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setToken(currentUser.accessToken);
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          let userData = { uid: currentUser.uid, email: currentUser.email };
          if (userDoc.exists()) {
              userData = { ...userData, ...userDoc.data() };
          }
          setUser(userData);
        } catch (e) {
          console.error("Error fetching user data", e);
        }
      } else {
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (newToken, loggedInUser) => {
    // onAuthStateChanged handles the state, but we can set it here for immediate UI update
    setToken(newToken);
    setUser(loggedInUser);
  };
  
  const handleLogout = async () => { 
      try {
          await signOut(auth);
      } catch (e) {
          console.error("Error signing out", e);
      }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="text-slate-400 font-bold">กำลังตรวจสอบเซสชันผู้ใช้...</div></div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/assess/:token" element={<ESASForm />} />
        <Route path="/print-qr/:token" element={token ? <PrintQR /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/equipments/print/:refId" element={token ? <EquipmentPrintSlip /> : <Navigate to="/login" replace />} />
        <Route path="/*" element={token ? (<div className="flex h-screen overflow-hidden"><Sidebar user={user} onLogout={handleLogout} /><Routes><Route path="/dashboard" element={<Dashboard token={token} />} /><Route path="/registry" element={<PatientRegistry token={token} />} /><Route path="/timeline/:id" element={<ClinicalTimeline token={token} />} /><Route path="/staff" element={<StaffManagement token={token} user={user} />} /><Route path="/assessment-config" element={<AssessmentConfig token={token} user={user} />} /><Route path="/equipment-config" element={<EquipmentManagement token={token} />} /><Route path="/equipments" element={<EquipmentDashboard token={token} />} /><Route path="/equipments/borrow" element={<EquipmentBorrow token={token} />} /><Route path="/equipments/return" element={<EquipmentReturn token={token} />} /><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></div>) : <Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}