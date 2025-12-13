import { useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { TaskgenPage } from '../../pages/admin/TaskgenPage';
import { TaskgenUserPage } from '../../pages/admin/TaskgenUserPage';
import { FeedbackManagerPage } from '../../pages/admin/FeedbackManagerPage';
import { useAdminTheme } from './AdminThemeProvider';

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
      ? 'bg-[color:var(--admin-active-bg)] text-[color:var(--admin-active-text)] shadow-inner'
      : 'text-[color:var(--admin-muted)] hover:bg-[color:var(--admin-hover)] hover:text-[color:var(--admin-text)]',
  ].join(' ');
}

export function AdminShell() {
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = useAdminTheme();

  const toggleLabel = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';

  return (
    <div className="flex min-h-screen bg-[color:var(--admin-bg)] text-[color:var(--admin-text)] transition-colors">
      <aside
        className={`hidden flex-col border-r border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] px-3 py-4 transition-all duration-200 md:flex ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-2 px-1">
          <span className={`font-semibold tracking-tight ${collapsed ? 'text-sm' : 'text-lg'}`}>Admin</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={toggleLabel}
              title={toggleLabel}
              onClick={toggleTheme}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-2 text-xs font-semibold text-[color:var(--admin-text)] transition-colors hover:border-[color:var(--admin-accent)] hover:text-[color:var(--admin-accent)]"
            >
              <span aria-hidden className="text-base">
                {theme === 'dark' ? '☀︎' : '☾'}
              </span>
              {!collapsed ? <span className="tracking-tight">Tema</span> : null}
            </button>
            <button
              type="button"
              aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
              onClick={() => setCollapsed((value) => !value)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] text-xs font-semibold text-[color:var(--admin-text)] transition-colors hover:border-[color:var(--admin-accent)] hover:text-[color:var(--admin-accent)]"
            >
              {collapsed ? '›' : '‹'}
            </button>
          </div>
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
        <nav className="flex items-center gap-2 border-b border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] px-4 py-3 md:hidden">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }: { isActive: boolean }) =>
                [
                  'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                  isActive
                    ? 'bg-[color:var(--admin-active-bg)] text-[color:var(--admin-active-text)]'
                    : 'bg-[color:var(--admin-hover)] text-[color:var(--admin-text)] hover:bg-[color:var(--admin-surface-muted)] hover:text-[color:var(--admin-text)]',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            aria-label={toggleLabel}
            title={toggleLabel}
            onClick={toggleTheme}
            className="ml-auto inline-flex h-8 items-center gap-2 rounded-full border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--admin-text)] transition-colors hover:border-[color:var(--admin-accent)] hover:text-[color:var(--admin-accent)]"
          >
            <span aria-hidden>{theme === 'dark' ? '☀︎' : '☾'}</span>
            <span>Tema</span>
          </button>
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
