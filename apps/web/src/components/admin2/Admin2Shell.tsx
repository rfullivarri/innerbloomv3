import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { OverviewPage } from '../../pages/admin2/OverviewPage';
import { CoreEnginePage } from '../../pages/admin2/CoreEnginePage';
import { UserOpsPage } from '../../pages/admin2/UserOpsPage';
import { NotificationsPage } from '../../pages/admin2/NotificationsPage';
import { AiTaskgenPage } from '../../pages/admin2/AiTaskgenPage';
import { AdvancedPage } from '../../pages/admin2/AdvancedPage';
import { TaskgenUserPage } from '../../pages/admin/TaskgenUserPage';
import { useAdmin2Theme } from './Admin2ThemeProvider';

const NAV_ITEMS = [
  { to: '/admin/overview', label: 'Overview' },
  { to: '/admin/core-engine', label: 'Core Engine' },
  { to: '/admin/user-ops', label: 'User Ops' },
  { to: '/admin/notifications', label: 'Notifications' },
  { to: '/admin/ai-taskgen', label: 'AI TaskGen' },
  { to: '/admin/advanced', label: 'Advanced' },
];

export function Admin2Shell() {
  const { theme, toggleTheme } = useAdmin2Theme();

  return (
    <div className="flex min-h-screen bg-[color:var(--admin-bg)] text-[color:var(--admin-text)]">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] px-4 py-5 lg:flex">
        <div className="mb-6">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">
            <span>Innerbloom</span>
            <img
              src="/IB-COLOR-LOGO.png"
              alt="Innerbloom flower"
              className="h-4 w-4 object-contain"
              loading="lazy"
            />
          </p>
          <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-[color:var(--admin-muted)]">Panel operativo interno.</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => [
                'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[color:var(--admin-active-bg)] text-[color:var(--admin-active-text)]'
                  : 'text-[color:var(--admin-muted)] hover:bg-[color:var(--admin-hover)] hover:text-[color:var(--admin-text)]',
              ].join(' ')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={toggleTheme}
          className="admin2-btn admin2-btn--ghost mt-4 text-sm"
        >
          Tema: {theme === 'dark' ? 'Dark' : 'Light'}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="border-b border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] px-3 py-3 lg:hidden">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">
                <span>Innerbloom</span>
                <img
                  src="/IB-COLOR-LOGO.png"
                  alt="Innerbloom flower"
                  className="h-4 w-4 object-contain"
                  loading="lazy"
                />
              </p>
              <p className="text-sm font-semibold tracking-tight">Admin</p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="admin2-btn admin2-btn--ghost"
            >
              {theme === 'dark' ? 'Dark' : 'Light'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => [
                  'whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold',
                  isActive ? 'bg-[color:var(--admin-active-bg)] text-[color:var(--admin-active-text)]' : 'bg-[color:var(--admin-hover)] text-[color:var(--admin-text)]',
                ].join(' ')}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          <Routes>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="core-engine" element={<CoreEnginePage />} />
            <Route path="user-ops" element={<UserOpsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="ai-taskgen" element={<AiTaskgenPage />} />
            <Route path="advanced" element={<AdvancedPage />} />
            <Route
              path="users/:userId/taskgen"
              element={<TaskgenUserPage baseTaskgenPath="/admin/ai-taskgen" baseUserPath="/admin/users" />}
            />
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
