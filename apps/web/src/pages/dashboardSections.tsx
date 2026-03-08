import { matchPath } from 'react-router-dom';
import { Route, RefreshCcwDot, FingerprintPattern, Sparkles, WandSparkles } from 'lucide-react';
import { type ReactElement, type SVGProps } from 'react';
import type { NavbarSection } from '../components/layout/Navbar';
import { DASHBOARD_PATH, DEFAULT_DASHBOARD_PATH } from '../config/auth';

export type DashboardSectionKey = 'dashboard' | 'missions' | 'dquest' | 'rewards' | 'editor';

import type { PostLoginLanguage } from '../i18n/postLoginLanguage';

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

function buildDashboardSections(basePath: string, language: PostLoginLanguage = 'en'): Record<DashboardSectionKey, DashboardSectionConfig> {
  const isSpanish = language === 'es';
  return {
    dashboard: {
      key: 'dashboard',
      label: isSpanish ? 'Inicio' : 'Dashboard',
      to: joinDashboardPath(basePath),
      end: true,
      pageTitle: isSpanish ? 'Inicio' : 'Dashboard',
      contentTitle: isSpanish ? 'Resumen' : 'Dashboard overview',
      icon: (props) => <FingerprintPattern {...props} />,
    },
    missions: {
      key: 'missions',
      label: isSpanish ? 'Misiones' : 'Missions',
      to: joinDashboardPath(basePath, 'misiones'),
      pageTitle: isSpanish ? 'Misiones' : 'Missions',
      eyebrow: isSpanish ? 'Misiones' : 'Missions',
      contentTitle: isSpanish ? 'Tus misiones activas' : 'Your active missions',
      description: isSpanish ? 'Accedé rápidamente a misiones diarias, semanales y eventos especiales.' : 'Quickly access daily missions, weekly goals, and special events.',
      icon: (props) => <Route {...props} />,
    },
    dquest: {
      key: 'dquest',
      label: 'DQuest',
      to: joinDashboardPath(basePath, 'dquest'),
      end: true,
      pageTitle: isSpanish ? 'Misión diaria' : 'Daily Quest',
      eyebrow: 'DQuest',
      contentTitle: isSpanish ? 'Misión diaria' : 'Daily Quest',
      description: isSpanish
        ? 'Tu ritual diario: enfócate en la misión clave del día y mantené la racha.'
        : "Your daily ritual: focus on today's key quest and keep your streak alive.",
      icon: (props) => <RefreshCcwDot {...props} />,
    },
    rewards: {
      key: 'rewards',
      label: isSpanish ? 'Recompensas' : 'Rewards',
      to: joinDashboardPath(basePath, 'rewards'),
      pageTitle: isSpanish ? 'Recompensas' : 'Rewards',
      eyebrow: isSpanish ? 'Recompensas' : 'Rewards',
      contentTitle: isSpanish ? 'Logros y badges desbloqueados' : 'Unlocked achievements and badges',
      description: isSpanish
        ? 'Revisá los hitos alcanzados y lo que falta para tu próxima recompensa.'
        : "Review your milestones and what's left for your next reward.",
      icon: (props) => <Sparkles {...props} />,
    },
    editor: {
      key: 'editor',
      label: isSpanish ? 'Editor' : 'Editor',
      to: '/editor',
      end: true,
      pageTitle: isSpanish ? 'Editor de tareas' : 'Task editor',
      eyebrow: isSpanish ? 'Editor' : 'Editor',
      contentTitle: '',
      description: '',
      icon: (props) => <WandSparkles {...props} />,
    },
  };
}

function createDashboardSections(currentPath?: string, language: PostLoginLanguage = 'en') {
  const basePath = resolveDashboardBasePath(currentPath);
  const sectionsByKey = buildDashboardSections(basePath, language);
  const sections: DashboardSectionConfig[] = [
    sectionsByKey.missions,
    sectionsByKey.dquest,
    sectionsByKey.dashboard,
    sectionsByKey.rewards,
    sectionsByKey.editor,
  ];

  return { sections, sectionsByKey };
}

export function getDashboardSections(currentPath?: string, language: PostLoginLanguage = 'en'): DashboardSectionConfig[] {
  return createDashboardSections(currentPath, language).sections;
}

export function getDashboardSectionConfig(
  key: DashboardSectionKey,
  currentPath?: string,
  language: PostLoginLanguage = 'en',
): DashboardSectionConfig {
  const { sectionsByKey } = createDashboardSections(currentPath, language);
  return sectionsByKey[key];
}

export function isSectionActive(section: DashboardSectionConfig, pathname: string) {
  return matchPath({ path: section.to, end: section.end ?? false }, pathname) != null;
}

export function getActiveSection(
  pathname: string,
  sections: DashboardSectionConfig[] = getDashboardSections(pathname),
  language: PostLoginLanguage = 'en',
): DashboardSectionConfig {
  const isSpanish = language === 'es';
  const activeSection = sections.find((section) => isSectionActive(section, pathname));

  if (activeSection) {
    return activeSection;
  }

  const missionsBasePath = joinDashboardPath(DASHBOARD_BASE_PATH, 'misiones');

  if (pathname.startsWith(missionsBasePath)) {
    const missionsSection = getDashboardSectionConfig('missions', pathname, language);

    return {
      ...missionsSection,
      pageTitle: isSpanish ? 'Misiones' : 'Missions',
    };
  }

  return getDashboardSectionConfig('dashboard', pathname, language);
}
