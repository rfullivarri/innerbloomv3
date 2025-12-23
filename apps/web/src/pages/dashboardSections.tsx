import { matchPath } from 'react-router-dom';
import { type ReactElement, type SVGProps } from 'react';
import type { NavbarSection } from '../components/layout/Navbar';
import { DASHBOARD_PATH, DEFAULT_DASHBOARD_PATH } from '../config/auth';

export type DashboardSectionKey = 'dashboard' | 'missions' | 'dquest' | 'rewards' | 'editor';

export interface DashboardSectionConfig extends NavbarSection {
  key: DashboardSectionKey;
  pageTitle: string;
  eyebrow?: string;
  contentTitle: string;
  description?: string;
  icon: (props: SVGProps<SVGSVGElement>) => ReactElement;
}

function OrbIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      <circle cx={12} cy={12} r={6.5} />
      <circle cx={12} cy={12} r={1.8} />
      <path d="M7 7c1.4 1 3.1 1.5 5 1.5s3.6-.5 5-1.5" />
      <path d="M17 17c-1.4-1-3.1-1.5-5-1.5S8.4 16 7 17" />
    </svg>
  );
}

function RouteIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      <path d="M6 19c0-2.5 1.8-4.5 4-4.5s4-2 4-4.5S16.8 5 19 5s3 1.3 3 3-1.3 3-3 3" />
      <circle cx={6} cy={19} r={2} />
      <circle cx={19} cy={8} r={2} />
      <path d="M6 17.5S6 11 13 11" />
    </svg>
  );
}

function SparklesIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      <path d="M9 4.5 10 7l1.5 1-1.5 1L9 12.5 8 9 6.5 8 8 7 9 4.5Z" />
      <path d="M15.5 11 16.5 13l1.5 1-1.5 1-1 2.5-1-2.5-1.5-1 1.5-1 1-2.5Z" />
      <path d="M12.5 5c.6 1 1.5 1.6 2.5 1.8" />
    </svg>
  );
}

function FlameIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      <path d="M13.5 4.5c0 2.1 1.7 3.8 1.7 5.9 0 2.4-1.9 4.3-4.2 4.3s-4.2-1.9-4.2-4.3c0-.7.2-1.5.6-2.2" />
      <path d="M11.2 3.6c0 1.4-1.2 2.3-1.7 3.5-.3.7-.4 1.4-.4 2.3 0 1.6 1.2 2.8 2.7 2.8s2.7-1.3 2.7-2.8c0-.6-.2-1.3-.5-1.8" />
      <path d="M12 21c2.9 0 5.2-2.5 5.2-5.5 0-3.6-3.3-5.9-3.3-9.1 0-1.1.4-2.2 1.3-3.4" />
    </svg>
  );
}

function SproutIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      <path d="M12 21v-7.5" />
      <path d="M12 13.5C12 10 15 7 18.5 7h2C20.5 10.5 17 13.5 12 13.5Z" />
      <path d="M12 13.5C12 10 9 7 5.5 7h-2C3.5 10.5 7 13.5 12 13.5Z" />
      <path d="M12 13.5 10 10" />
    </svg>
  );
}

const rawDashboardPath = DASHBOARD_PATH || DEFAULT_DASHBOARD_PATH;
const normalizedDashboardPath = rawDashboardPath.startsWith('/') ? rawDashboardPath : `/${rawDashboardPath}`;
const trimmedDashboardPath = normalizedDashboardPath.replace(/\/+$/, '') || DEFAULT_DASHBOARD_PATH;
const DASHBOARD_BASE_PATH = trimmedDashboardPath;

function isDashboardPath(pathname: string): boolean {
  if (!pathname) {
    return false;
  }

  if (pathname === DASHBOARD_BASE_PATH) {
    return true;
  }

  return pathname.startsWith(`${DASHBOARD_BASE_PATH}/`);
}

function resolveDashboardBasePath(currentPath?: string): string {
  if (currentPath && isDashboardPath(currentPath)) {
    return DASHBOARD_BASE_PATH;
  }

  if (typeof window !== 'undefined' && isDashboardPath(window.location.pathname)) {
    return DASHBOARD_BASE_PATH;
  }

  return DASHBOARD_BASE_PATH;
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
      icon: (props) => <OrbIcon {...props} />,
    },
    missions: {
      key: 'missions',
      label: 'Misiones',
      to: joinDashboardPath(basePath, 'misiones'),
      pageTitle: 'Misiones',
      eyebrow: 'Misiones',
      contentTitle: 'Tus misiones activas',
      description: 'Accedé rápidamente a misiones diarias, semanales y eventos especiales.',
      icon: (props) => <RouteIcon {...props} />,
    },
    dquest: {
      key: 'dquest',
      label: 'DQuest',
      to: joinDashboardPath(basePath, 'dquest'),
      end: true,
      pageTitle: 'Daily Quest',
      eyebrow: 'DQuest',
      contentTitle: 'Daily Quest',
      description: 'Tu ritual diario: enfócate en la misión clave del día y mantené la racha.',
      icon: (props) => <FlameIcon {...props} />,
    },
    rewards: {
      key: 'rewards',
      label: 'Rewards',
      to: joinDashboardPath(basePath, 'rewards'),
      pageTitle: 'Rewards',
      eyebrow: 'Rewards',
      contentTitle: 'Logros y badges desbloqueados',
      description: 'Revisá los hitos alcanzados y lo que falta para tu próxima recompensa.',
      icon: (props) => <SparklesIcon {...props} />,
    },
    editor: {
      key: 'editor',
      label: 'Editor',
      to: '/editor',
      end: true,
      pageTitle: 'Editor',
      eyebrow: 'Editor',
      contentTitle: '',
      description: '',
      icon: (props) => <SproutIcon {...props} />,
    },
  };
}

function createDashboardSections(currentPath?: string) {
  const basePath = resolveDashboardBasePath(currentPath);
  const sectionsByKey = buildDashboardSections(basePath);
  const sections: DashboardSectionConfig[] = [
    sectionsByKey.missions,
    sectionsByKey.dquest,
    sectionsByKey.dashboard,
    sectionsByKey.rewards,
    sectionsByKey.editor,
  ];

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

  const missionsBasePath = joinDashboardPath(DASHBOARD_BASE_PATH, 'misiones');

  if (pathname.startsWith(missionsBasePath)) {
    const missionsSection = getDashboardSectionConfig('missions', pathname);

    return {
      ...missionsSection,
      pageTitle: 'Misiones',
    };
  }

  return getDashboardSectionConfig('dashboard', pathname);
}
