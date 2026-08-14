import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, orderBy } from '../services/firebase';
import { ACTION_LABELS, MODULE_LABELS } from '../services/auditLog';
import { ClipboardList, Download, Search, Filter, X } from 'lucide-react';

const ACTION_COLORS = {
  ADD_PATIENT:      'bg-emerald-100 text-emerald-800 border-emerald-200',
  EDIT_PATIENT:     'bg-blue-100 text-blue-800 border-blue-200',
  DELETE_PATIENT:   'bg-red-100 text-red-800 border-red-200',
  CHANGE_STATUS:    'bg-purple-100 text-purple-800 border-purple-200',
  GENERATE_LINK:    'bg-cyan-100 text-cyan-800 border-cyan-200',
  COPY_LINK:        'bg-cyan-100 text-cyan-800 border-cyan-200',
  ADD_EVENT:        'bg-amber-100 text-amber-800 border-amber-200',
  ADD_NOTE:         'bg-amber-100 text-amber-800 border-amber-200',
  BORROW_EQUIPMENT: 'bg-orange-100 text-orange-800 border-orange-200',
  RETURN_EQUIPMENT: 'bg-teal-100 text-teal-800 border-teal-200',
};

export default function AuditLog({ token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterUser, setFilterUser] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  // Unique users
  const uniqueUsers = [...new Set(logs.map(l => l.userName).filter(Boolean))];

  const filtered = logs.filter(log => {
    const q = search.toLowerCase();
    const matchSearch = !q || 
      (log.userName || '').toLowerCase().includes(q) ||
      (log.targetName || '').toLowerCase().includes(q) ||
      (log.detail || '').toLowerCase().includes(q) ||
      (ACTION_LABELS[log.action] || log.action || '').toLowerCase().includes(q);
    const matchModule = filterModule === 'all' || log.module === filterModule;
    const matchUser = filterUser === 'all' || log.userName === filterUser;
    return matchSearch && matchModule && matchUser;
  });

  const formatTime = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const handleExportCSV = () => {
    const headers = ['วันเวลา', 'ชื่อเจ้าหน้าที่', 'Email', 'การกระทำ', 'หมวด', 'รายการ', 'รายละเอียด'];
    const rows = filtered.map(log => [
      formatTime(log.timestamp),
      log.userName || '',
      log.userEmail || '',
      ACTION_LABELS[log.action] || log.action || '',
      MODULE_LABELS[log.module] || log.module || '',
      log.targetName || '',
      log.detail || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`));
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">ประวัติการใช้งานระบบ</h2>
              <p className="text-xs text-slate-500 font-semibold">{filtered.length} รายการ</p>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหา ชื่อ, การกระทำ, รายการ..."
              className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Module filter */}
          <select
            value={filterModule}
            onChange={e => setFilterModule(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-300 cursor-pointer bg-white"
          >
            <option value="all">ทุกหมวด</option>
            {Object.entries(MODULE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {/* User filter */}
          <select
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-300 cursor-pointer bg-white"
          >
            <option value="all">ทุกเจ้าหน้าที่</option>
            {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 px-8 py-6">
        {loading ? (
          <div className="text-center py-20 text-slate-400 font-bold">กำลังโหลดข้อมูล...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-bold">ไม่พบรายการ Audit Log</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="px-5 py-3.5">วันเวลา</th>
                  <th className="px-5 py-3.5">เจ้าหน้าที่</th>
                  <th className="px-5 py-3.5">การกระทำ</th>
                  <th className="px-5 py-3.5">รายการ / Object</th>
                  <th className="px-5 py-3.5">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 text-xs font-mono whitespace-nowrap">
                      {formatTime(log.timestamp)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-800 text-sm">{log.userName || '-'}</div>
                      <div className="text-xs text-slate-400">{log.userEmail || ''}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">{log.targetName || '-'}</div>
                      {log.targetId && log.targetId !== log.targetName && (
                        <div className="text-xs text-slate-400 font-mono">{log.targetId}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs max-w-xs truncate">{log.detail || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
