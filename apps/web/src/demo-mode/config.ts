import { resolveAuthLanguage } from '../lib/authLanguage';
import type { DemoLanguage } from './types';

export const DEMO_MODE_FLAG = 'ib:demo-mode';

export type DemoGuideStep = {
  id: string;
  targetId: string;
  titleKey: string;
  bodyKey: string;
};

export const DEMO_GUIDE_STEPS: DemoGuideStep[] = [];

export function resolveDemoLanguage(search = ''): DemoLanguage {
  const detected = resolveAuthLanguage(search);
  return detected === 'es' ? 'es' : 'en';
}
