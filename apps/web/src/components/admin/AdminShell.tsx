import { useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { TaskgenPage } from '../../pages/admin/TaskgenPage';
import { TaskgenUserPage } from '../../pages/admin/TaskgenUserPage';
import { FeedbackManagerPage } from '../../pages/admin/FeedbackManagerPage';

const NAV_LINKS = [
  { to: '/admin', label: 'Control Center' },
  { to: '/admin/taskgen', label: 'TaskGen Monitor' },
  { to: '/admin/feedback-manager', label: 'Feedback & Notifs' },
];

function navLinkClass({ isActive, collapsed }: { isActive: boolean; collapsed: boolean }) {
  return [
    'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
    collapsed ? 'justify-center px-2 py-3 text-xs' : '',
    isActive
      ? 'bg-sky-500/10 text-sky-200 shadow-inner shadow-sky-500/20'
      : 'text-slate-300 hover:bg-slate-800/60 hover:text-sky-100',
  ].join(' ');
}

export function AdminShell() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside
        className={`hidden flex-col border-r border-slate-800/60 bg-slate-900/60 px-3 py-4 transition-all duration-200 md:flex ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-2 px-1">
          <span className={`font-semibold tracking-tight text-slate-100 ${collapsed ? 'text-sm' : 'text-lg'}`}>Admin</span>
          <button
            type="button"
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            onClick={() => setCollapsed((value) => !value)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700/70 bg-slate-800/70 text-xs font-semibold text-slate-200 transition hover:border-sky-500/60 hover:text-sky-100"
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>
        <nav className={`flex flex-1 flex-col gap-1 ${collapsed ? 'items-center' : ''}`}>
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }: { isActive: boolean }) => navLinkClass({ isActive, collapsed })}
              title={item.label}
            >
              {collapsed ? <span className="text-xs font-semibold uppercase">{item.label.slice(0, 2)}</span> : item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <nav className="flex gap-2 border-b border-slate-800/60 bg-slate-900/80 px-4 py-3 md:hidden">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }: { isActive: boolean }) =>
                [
                  'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                  isActive
                    ? 'bg-sky-500/20 text-sky-100'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-sky-100',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route index element={<AdminLayout />} />
            <Route path="taskgen" element={<TaskgenPage />} />
            <Route path="feedback-manager" element={<FeedbackManagerPage />} />
            <Route path="users/:userId/taskgen" element={<TaskgenUserPage />} />
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
