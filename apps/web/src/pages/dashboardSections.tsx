import { matchPath } from 'react-router-dom';
import type { SVGProps } from 'react';
import type { NavbarSection } from '../components/layout/Navbar';
import { DASHBOARD_PATH, DEFAULT_DASHBOARD_PATH } from '../config/auth';

export type DashboardSectionKey = 'dashboard' | 'missions' | 'rewards' | 'editor';

export interface DashboardSectionConfig extends NavbarSection {
  key: DashboardSectionKey;
  pageTitle: string;
  eyebrow?: string;
  contentTitle: string;
  description?: string;
  icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
}

function DashboardIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M4 13a8 8 0 0 1 16 0v4a1 1 0 0 1-1 1h-4.5" />
      <path d="M12 7v5.5l3 2.5" />
      <circle cx={12} cy={13} r={0.6} fill="currentColor" stroke="none" />
    </svg>
  );
}

function MissionsIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx={12} cy={12} r={5.5} />
      <path d="M12 3v2.5" />
      <path d="M12 18.5V21" />
      <path d="M3 12h2.5" />
      <path d="M18.5 12H21" />
      <path d="M12 12l2.5-1.5" />
    </svg>
  );
}

function RewardsIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M5 7h14" />
      <path d="M6.5 7 8 4h8l1.5 3" />
      <path d="M7 7v9a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3V7" />
      <path d="M10 12h4" />
    </svg>
  );
}

function TaskEditorIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M4 5a2 2 0 0 1 2-2h6l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M13 3v5h5" />
      <path d="M9.5 14.5 8 19l4.5-1.5L16 12l-2-2z" />
      <path d="M15 10l2 2" />
    </svg>
  );
}

const rawDashboardPath = DASHBOARD_PATH || DEFAULT_DASHBOARD_PATH;
const normalizedDashboardPath = rawDashboardPath.startsWith('/') ? rawDashboardPath : `/${rawDashboardPath}`;
const trimmedDashboardPath = normalizedDashboardPath.replace(/\/+$/, '') || DEFAULT_DASHBOARD_PATH;
const dashboardSegments = trimmedDashboardPath.split('/').filter(Boolean);
const primaryDashboardPath = dashboardSegments.length > 0 ? `/${dashboardSegments[0]}` : DEFAULT_DASHBOARD_PATH;
const isDashboardV3Enabled = primaryDashboardPath === '/dashboard-v3';
const fallbackDashboardPath = trimmedDashboardPath || DEFAULT_DASHBOARD_PATH;
const DASHBOARD_V3_BASE_PATH = '/dashboard-v3';

function isDashboardV3Path(pathname: string): boolean {
  if (!pathname) {
    return false;
  }

  if (pathname === DASHBOARD_V3_BASE_PATH) {
    return true;
  }

  return pathname.startsWith(`${DASHBOARD_V3_BASE_PATH}/`);
}

function resolveDashboardBasePath(currentPath?: string): string {
  if (isDashboardV3Enabled) {
    return primaryDashboardPath;
  }

  if (currentPath && isDashboardV3Path(currentPath)) {
    return DASHBOARD_V3_BASE_PATH;
  }

  if (typeof window !== 'undefined' && isDashboardV3Path(window.location.pathname)) {
    return DASHBOARD_V3_BASE_PATH;
  }

  return fallbackDashboardPath;
}

function joinDashboardPath(basePath: string, segment?: string): string {
  if (!segment) {
    return basePath;
  }

  const normalizedSegment = segment.startsWith('/') ? segment : `/${segment}`;
  return `${basePath}${normalizedSegment}`;
}

function buildDashboardSections(basePath: string): Record<DashboardSectionKey, DashboardSectionConfig> {
  return {
    dashboard: {
      key: 'dashboard',
      label: 'Dashboard',
      to: joinDashboardPath(basePath),
      end: true,
      pageTitle: 'Dashboard',
      contentTitle: 'Dashboard',
      icon: DashboardIcon,
    },
    missions: {
      key: 'missions',
      label: 'Misiones',
      to: joinDashboardPath(basePath, 'missions-v2'),
      pageTitle: 'Misiones',
      eyebrow: 'Misiones',
      contentTitle: 'Tus misiones activas',
      description: 'Accedé rápidamente a misiones diarias, semanales y eventos especiales.',
      icon: MissionsIcon,
    },
    rewards: {
      key: 'rewards',
      label: 'Rewards',
      to: joinDashboardPath(basePath, 'rewards'),
      pageTitle: 'Rewards',
      eyebrow: 'Rewards',
      contentTitle: 'Logros y badges desbloqueados',
      description: 'Revisá los hitos alcanzados y lo que falta para tu próxima recompensa.',
      icon: RewardsIcon,
    },
    editor: {
      key: 'editor',
      label: 'Task Editor',
      to: '/editor',
      end: true,
      pageTitle: 'Task Editor',
      eyebrow: 'Task Editor',
      contentTitle: '',
      description: '',
      icon: TaskEditorIcon,
    },
  };
}

function createDashboardSections(currentPath?: string) {
  const basePath = resolveDashboardBasePath(currentPath);
  const sectionsByKey = buildDashboardSections(basePath);
  const shouldIncludeMissions = basePath === DASHBOARD_V3_BASE_PATH;

  const sections: DashboardSectionConfig[] = [sectionsByKey.dashboard];

  if (shouldIncludeMissions) {
    sections.push(sectionsByKey.missions, sectionsByKey.rewards);
  }

  sections.push(sectionsByKey.editor);

  return { sections, sectionsByKey };
}

export function getDashboardSections(currentPath?: string): DashboardSectionConfig[] {
  return createDashboardSections(currentPath).sections;
}

export function getDashboardSectionConfig(
  key: DashboardSectionKey,
  currentPath?: string,
): DashboardSectionConfig {
  const { sectionsByKey } = createDashboardSections(currentPath);
  return sectionsByKey[key];
}

export function isSectionActive(section: DashboardSectionConfig, pathname: string) {
  return matchPath({ path: section.to, end: section.end ?? false }, pathname) != null;
}

export function getActiveSection(
  pathname: string,
  sections: DashboardSectionConfig[] = getDashboardSections(pathname),
): DashboardSectionConfig {
  const activeSection = sections.find((section) => isSectionActive(section, pathname));

  if (activeSection) {
    return activeSection;
  }

  const missionsBasePath = joinDashboardPath(DASHBOARD_V3_BASE_PATH, 'missions');

  if (pathname.startsWith(missionsBasePath)) {
    const missionsSection = getDashboardSectionConfig('missions', pathname);

    return {
      ...missionsSection,
      pageTitle: 'Misiones',
    };
  }

  return getDashboardSectionConfig('dashboard', pathname);
}
