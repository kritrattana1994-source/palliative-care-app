import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ClipboardList, Users, LogOut, Activity, UserCog, ChevronRight } from 'lucide-react';

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3.5 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
      isActive
        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 translate-x-1'
        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
    }`;

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-20 shrink-0 border-r border-slate-800/80">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
              <span>รพ.พล</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                Palliative
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 font-medium tracking-wide">
              Home Ward System
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1.5 mt-6 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          เมนูหลัก
        </div>

        <NavLink to="/dashboard" className={navLinkClass}>
          <ClipboardList className="w-5 h-5 shrink-0" />
          <span>คิวประเมินรายวัน</span>
        </NavLink>

        <NavLink to="/registry" className={navLinkClass}>
          <Users className="w-5 h-5 shrink-0" />
          <span>ทะเบียนผู้ป่วย</span>
        </NavLink>

        <NavLink to="/equipments" className={navLinkClass}>
          <ClipboardList className="w-5 h-5 shrink-0" />
          <span>ระบบยืม-คืนเครื่องมือ</span>
        </NavLink>

        {/* Admin-only section */}
        {isAdmin && (
          <>
            <div className="px-3 pb-1 pt-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              จัดการระบบ
            </div>
            <NavLink to="/staff" className={navLinkClass}>
              <UserCog className="w-5 h-5 shrink-0" />
              <span>จัดการเจ้าหน้าที่</span>
            </NavLink>
            <NavLink to="/assessment-config" className={navLinkClass}>
              <ClipboardList className="w-5 h-5 shrink-0" />
              <span>จัดการข้อความประเมิน</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* User profile & Logout */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <div className="px-4 py-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-base shrink-0">
            {isAdmin ? '👨‍💼' : '👩‍⚕️'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] text-slate-400 font-semibold">
                {isAdmin ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'}
              </p>
              {isAdmin && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/30 text-violet-300 border border-violet-500/30 font-bold">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-slate-100 truncate">{user?.name || 'เจ้าหน้าที่'}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 px-4 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  );
}
