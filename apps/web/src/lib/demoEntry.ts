export type DemoEntrySource = 'landing' | 'onboarding' | 'internal';
export type DemoMode = 'public' | 'onboarding';

const VALID_SOURCES = new Set<DemoEntrySource>(['landing', 'onboarding', 'internal']);
const VALID_MODES = new Set<DemoMode>(['public', 'onboarding']);

interface BuildDemoUrlOptions {
  language: 'es' | 'en';
  source?: DemoEntrySource;
  mode?: DemoMode;
}

export interface DemoEntryContext {
  language: 'es' | 'en';
  source: DemoEntrySource;
  mode: DemoMode;
  fromOnboarding: boolean;
}

export function buildDemoUrl({ language, source = 'landing', mode = 'public' }: BuildDemoUrlOptions): string {
  const params = new URLSearchParams({ lang: language, source, mode });
  return `/demo?${params.toString()}`;
}

export function resolveDemoEntryContext(search: string): DemoEntryContext {
  const params = new URLSearchParams(search);
  const language = params.get('lang') === 'en' ? 'en' : 'es';

  const sourceParam = params.get('source');
  const source = sourceParam && VALID_SOURCES.has(sourceParam as DemoEntrySource) ? (sourceParam as DemoEntrySource) : 'landing';

  const modeParam = params.get('mode');
  const mode = modeParam && VALID_MODES.has(modeParam as DemoMode) ? (modeParam as DemoMode) : 'public';

  return {
    language,
    source,
    mode,
    fromOnboarding: source === 'onboarding' || mode === 'onboarding',
  };
}
