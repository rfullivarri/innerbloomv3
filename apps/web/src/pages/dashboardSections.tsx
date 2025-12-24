import { matchPath } from 'react-router-dom';
import { Route, Flame, CircleDot, Sparkles, Sprout } from 'lucide-react';
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
      icon: (props) => <CircleDot {...props} />,
    },
    missions: {
      key: 'missions',
      label: 'Misiones',
      to: joinDashboardPath(basePath, 'misiones'),
      pageTitle: 'Misiones',
      eyebrow: 'Misiones',
      contentTitle: 'Tus misiones activas',
      description: 'Accedé rápidamente a misiones diarias, semanales y eventos especiales.',
      icon: (props) => <Route {...props} />,
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
      icon: (props) => <Flame {...props} />,
    },
    rewards: {
      key: 'rewards',
      label: 'Rewards',
      to: joinDashboardPath(basePath, 'rewards'),
      pageTitle: 'Rewards',
      eyebrow: 'Rewards',
      contentTitle: 'Logros y badges desbloqueados',
      description: 'Revisá los hitos alcanzados y lo que falta para tu próxima recompensa.',
      icon: (props) => <Sparkles {...props} />,
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
      icon: (props) => <Sprout {...props} />,
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
