import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ClipboardList, Users, History, Settings, LogOut, Activity } from 'lucide-react';

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20 shrink-0">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-extrabold text-sky-400 flex items-center gap-2">
          <Activity className="w-6 h-6 text-sky-400" />
          รพ.พล
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-semibold tracking-wider">
          Palliative Care (Home Ward)
        </p>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 mt-6">
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => 
            `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
              isActive 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30' 
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <ClipboardList className="w-5 h-5" />
          คิวประเมินรายวัน
        </NavLink>

        <NavLink 
          to="/registry" 
          className={({ isActive }) => 
            `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
              isActive 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30' 
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <Users className="w-5 h-5" />
          ทะเบียนผู้ป่วย (D/C)
        </NavLink>
      </nav>
      
      <div className="p-4 border-t border-slate-800 space-y-2">
        <div className="px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-400">เข้าใช้งานโดย</p>
          <p className="text-sm font-bold text-slate-200 truncate">{user?.name || 'แอดมิน'}</p>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 px-4 py-3 rounded-xl font-semibold transition-all"
        >
          <LogOut className="w-5 h-5" />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}
