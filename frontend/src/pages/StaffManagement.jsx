import React, { useState, useEffect } from 'react';
import {
  UserCog, UserPlus, Trash2, X, Check, AlertCircle, Shield,
  ShieldCheck, KeyRound, Pencil, Search, Eye, EyeOff, RefreshCw, Users
} from 'lucide-react';
import { db, collection, onSnapshot } from '../services/firebase';
import { apiPost, apiPut, apiDelete } from '../config';

const ROLE_CONFIG = {
  admin: { label: 'ผู้ดูแลระบบ (Admin)', color: 'bg-violet-100 text-violet-800 border-violet-200', dot: 'bg-violet-500' },
  nurse: { label: 'พยาบาล / เจ้าหน้าที่', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
};

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || { label: role, color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function StaffManagement({ token, user }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // staff object to edit
  const [resetTarget, setResetTarget] = useState(null); // staff object to reset password

  // Add form
  const [addForm, setAddForm] = useState({ username: '', name: '', role: 'nurse', password: '', confirmPassword: '' });
  const [showAddPw, setShowAddPw] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({ name: '', role: 'nurse' });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Reset PW form
  const [newPassword, setNewPassword] = useState('');
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const isAdmin = user?.role === 'admin';

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const staffData = [];
        snapshot.forEach((doc) => {
            staffData.push({ id: doc.id, ...doc.data() });
        });
        setStaff(staffData);
        setLoading(false);
    }, (err) => {
        setError(err.message || 'ไม่สามารถโหลดข้อมูลเจ้าหน้าที่ได้');
        setLoading(false);
    });

    return () => unsubscribe();
  }, [token]);

  // ---- ADD STAFF ----
  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (addForm.password !== addForm.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      return;
    }
    if (addForm.password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    setAddSubmitting(true);
    setError('');
    try {
      const created = await apiPost('/api/staff', {
        username: addForm.username.trim(),
        name: addForm.name.trim(),
        role: addForm.role,
        password: addForm.password,
      });
      showSuccess(`เพิ่มเจ้าหน้าที่ "${addForm.name}" เรียบร้อยแล้ว`);
      setAddForm({ username: '', name: '', role: 'nurse', password: '', confirmPassword: '' });
      setShowAddModal(false);
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเพิ่มเจ้าหน้าที่');
    } finally {
      setAddSubmitting(false);
    }
  };

  // ---- EDIT STAFF ----
  const openEdit = (s) => {
    setEditTarget(s);
    setEditForm({ name: s.name, role: s.role });
  };

  const handleEditStaff = async (e) => {
    e.preventDefault();
    setEditSubmitting(true);
    setError('');
    try {
      await apiPut('/api/staff/' + editTarget.id, {
        staffId: editTarget.id,
        name: editForm.name.trim(),
        role: editForm.role,
      });
      showSuccess(`แก้ไขข้อมูล "${editForm.name}" เรียบร้อยแล้ว`);
      setEditTarget(null);
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการแก้ไข');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ---- RESET PASSWORD ----
  const openReset = (s) => {
    setResetTarget(s);
    setNewPassword('');
    setShowResetPw(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    setResetSubmitting(true);
    setError('');
    try {
      await apiPut('/api/staff/' + resetTarget.id, { staffId: resetTarget.id, password: newPassword });
      showSuccess(`รีเซ็ตรหัสผ่านของ "${resetTarget.name}" เรียบร้อยแล้ว`);
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน');
    } finally {
      setResetSubmitting(false);
    }
  };

  // ---- DELETE STAFF ----
  const handleDelete = async (s) => {
    if (!window.confirm(`ยืนยันการลบบัญชีเจ้าหน้าที่ "${s.name}" (${s.username}) ออกจากระบบ?`)) return;
    setError('');
    try {
      await apiDelete('/api/staff/' + s.id);
      showSuccess(`ลบบัญชี "${s.name}" เรียบร้อยแล้ว`);
    } catch (err) {
      setError(err.message || 'ไม่สามารถลบบัญชีได้');
    }
  };

  const filteredStaff = staff.filter(s => {
    const q = search.toLowerCase();
    return (
      String(s.name || '').toLowerCase().includes(q) ||
      String(s.username || '').toLowerCase().includes(q) ||
      String(s.role || '').toLowerCase().includes(q)
    );
  });

  // ========================================================
  // Access Guard — nurse gets a permission denied screen
  // ========================================================
  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50 items-center justify-center p-8">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-12 text-center max-w-sm space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-black text-slate-800">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            หน้านี้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น<br />กรุณาติดต่อ Admin เพื่อขอสิทธิ์
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-10 flex flex-wrap justify-between items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">จัดการเจ้าหน้าที่</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-xs font-black border border-violet-200">
              Admin Only
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium mt-1">
            จัดการบัญชีพยาบาล แพทย์ และเจ้าหน้าที่ในระบบ ({staff.length} คน)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {}}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all cursor-pointer border border-slate-200"
          >
            <RefreshCw className="w-4 h-4" /> Realtime Active
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
          >
            <UserPlus className="w-5 h-5" />
            <span>เพิ่มเจ้าหน้าที่ใหม่</span>
          </button>
        </div>
      </header>

      <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-5">

        {/* Alert messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-sm text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            <span className="font-bold">{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-sm text-emerald-800 animate-pulse">
            <Check className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
            <span className="font-bold">{successMsg}</span>
          </div>
        )}

        {/* Staff Table Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3 bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 border border-violet-200 text-violet-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">รายชื่อเจ้าหน้าที่ทั้งหมด</h3>
                <p className="text-xs text-slate-500 font-medium">บัญชีที่สามารถเข้าสู่ระบบ Staff Portal ได้</p>
              </div>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ, username..."
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-56 bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-bold flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <span>กำลังโหลดข้อมูลเจ้าหน้าที่...</span>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold space-y-2">
                <p className="text-3xl">👥</p>
                <p className="text-base text-slate-600">ไม่พบข้อมูลเจ้าหน้าที่</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="px-6 py-4">ชื่อ-นามสกุล</th>
                    <th className="px-6 py-4">Username</th>
                    <th className="px-6 py-4">บทบาท</th>
                    <th className="px-6 py-4">รหัส ID</th>
                    <th className="px-6 py-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.map(s => (
                    <tr key={s.id} className={`hover:bg-slate-50/70 transition-colors ${s.username === user?.username ? 'bg-violet-50/40' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                            {(s.name || '?')[0]}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                              {s.name}
                              {s.username === user?.username && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 font-bold">คุณ</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm font-bold text-slate-600">{s.username}</td>
                      <td className="px-6 py-4"><RoleBadge role={s.role} /></td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">{s.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit */}
                          <button
                            onClick={() => openEdit(s)}
                            title="แก้ไขข้อมูล"
                            className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {/* Reset PW */}
                          <button
                            onClick={() => openReset(s)}
                            title="รีเซ็ตรหัสผ่าน"
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          {/* Delete — disabled for self */}
                          <button
                            onClick={() => handleDelete(s)}
                            disabled={s.username === user?.username}
                            title={s.username === user?.username ? 'ไม่สามารถลบบัญชีตัวเองได้' : 'ลบบัญชี'}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Info card */}
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 text-sm text-violet-800 flex gap-3">
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-violet-600" />
          <div className="space-y-0.5">
            <p className="font-black">หมายเหตุด้านความปลอดภัย</p>
            <p className="font-medium text-violet-700 text-xs leading-relaxed">
              รหัสผ่านถูกเก็บโดยตรงใน Google Sheets — แนะนำให้ตั้งรหัสผ่านที่ยากคาดเดา และไม่แชร์บัญชีร่วมกัน
              เจ้าหน้าที่ไม่สามารถลบบัญชีตัวเองได้
            </p>
          </div>
        </div>
      </div>

      {/* ===================== MODAL: Add Staff ===================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-violet-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">เพิ่มเจ้าหน้าที่ใหม่</h3>
                  <p className="text-xs text-slate-500 font-medium">สร้างบัญชีสำหรับเข้าสู่ระบบ Staff Portal</p>
                </div>
              </div>
              <button onClick={() => { setShowAddModal(false); setError(''); }} className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddStaff} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                  <input type="text" required value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="เช่น พย.สมหญิง ใจดี"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 hover:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Username <span className="text-red-500">*</span></label>
                  <input type="text" required value={addForm.username} onChange={e => setAddForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="เช่น nurse2"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 hover:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">บทบาท (Role) <span className="text-red-500">*</span></label>
                  <select value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="nurse">พยาบาล / เจ้าหน้าที่ (Nurse)</option>
                    <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">รหัสผ่าน <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type={showAddPw ? 'text' : 'password'} required value={addForm.password}
                      onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="อย่างน้อย 6 ตัว"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 hover:bg-white pr-10" />
                    <button type="button" onClick={() => setShowAddPw(v => !v)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                      {showAddPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ยืนยันรหัสผ่าน <span className="text-red-500">*</span></label>
                  <input type={showAddPw ? 'text' : 'password'} required value={addForm.confirmPassword}
                    onChange={e => setAddForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="พิมพ์ซ้ำ"
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 hover:bg-white ${addForm.confirmPassword && addForm.password !== addForm.confirmPassword ? 'border-red-400' : 'border-slate-300'}`} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => { setShowAddModal(false); setError(''); }}
                  className="px-5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">ยกเลิก</button>
                <button type="submit" disabled={addSubmitting}
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                  {addSubmitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>กำลังบันทึก...</span></> : <><Check className="w-4 h-4" /><span>เพิ่มเจ้าหน้าที่</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: Edit Staff ===================== */}
      {editTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-amber-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">แก้ไขข้อมูลเจ้าหน้าที่</h3>
                  <p className="text-xs text-slate-500 font-medium">@{editTarget.username}</p>
                </div>
              </div>
              <button onClick={() => { setEditTarget(null); setError(''); }} className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditStaff} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                <input type="text" required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 hover:bg-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">บทบาท (Role)</label>
                <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="nurse">พยาบาล / เจ้าหน้าที่ (Nurse)</option>
                  <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => { setEditTarget(null); setError(''); }}
                  className="px-5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">ยกเลิก</button>
                <button type="submit" disabled={editSubmitting}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                  {editSubmitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>กำลังบันทึก...</span></> : <><Check className="w-4 h-4" /><span>บันทึกการแก้ไข</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: Reset Password ===================== */}
      {resetTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-blue-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">รีเซ็ตรหัสผ่าน</h3>
                  <p className="text-xs text-slate-500 font-medium">{resetTarget.name} (@{resetTarget.username})</p>
                </div>
              </div>
              <button onClick={() => { setResetTarget(null); setError(''); }} className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">รหัสผ่านใหม่ <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type={showResetPw ? 'text' : 'password'} required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 hover:bg-white pr-10" />
                  <button type="button" onClick={() => setShowResetPw(v => !v)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                    {showResetPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => { setResetTarget(null); setError(''); }}
                  className="px-5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">ยกเลิก</button>
                <button type="submit" disabled={resetSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                  {resetSubmitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>กำลังบันทึก...</span></> : <><KeyRound className="w-4 h-4" /><span>ยืนยันรีเซ็ต</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
