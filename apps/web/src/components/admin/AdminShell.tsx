import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { TaskgenPage } from '../../pages/admin/TaskgenPage';
import { TaskgenUserPage } from '../../pages/admin/TaskgenUserPage';

const NAV_LINKS = [
  { to: '/admin', label: 'Control Center' },
  { to: '/admin/taskgen', label: 'TaskGen Monitor' },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return [
    'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-sky-500/10 text-sky-200 shadow-inner shadow-sky-500/20'
      : 'text-slate-300 hover:bg-slate-800/60 hover:text-sky-100',
  ].join(' ');
}

export function AdminShell() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="hidden w-60 flex-col border-r border-slate-800/60 bg-slate-900/60 px-3 py-6 md:flex">
        <div className="px-3 pb-6 text-lg font-semibold tracking-tight text-slate-100">Admin</div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_LINKS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/admin'} className={navLinkClass}>
              {item.label}
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
              className={({ isActive }) =>
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
            <Route path="users/:userId/taskgen" element={<TaskgenUserPage />} />
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
