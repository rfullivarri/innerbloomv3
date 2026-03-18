import { coerceGameMode, normalizeGameModeValue, type GameMode } from './gameMode';
import { resolveLabsGameModeId, type LabsGameModeId } from '../config/labsGameModes';

export type DemoEntrySource = 'landing' | 'onboarding' | 'internal' | 'labs' | 'selector';
export type DemoAccessMode = 'public' | 'onboarding';

const VALID_SOURCES = new Set<DemoEntrySource>(['landing', 'onboarding', 'internal', 'labs', 'selector']);
const VALID_ACCESS_MODES = new Set<DemoAccessMode>(['public', 'onboarding']);

interface BuildDemoUrlOptions {
  language: 'es' | 'en';
  source?: DemoEntrySource;
  entryMode?: DemoAccessMode;
  mode?: LabsGameModeId | DemoAccessMode;
}

interface BuildDemoModeSelectUrlOptions {
  language: 'es' | 'en';
  source?: DemoEntrySource;
  legacyLabsPath?: boolean;
}

export interface DemoEntryContext {
  language: 'es' | 'en';
  source: DemoEntrySource;
  entryMode: DemoAccessMode;
  mode: LabsGameModeId;
  gameMode: GameMode;
  fromOnboarding: boolean;
}


export function buildDemoModeSelectUrl({ language, source = 'landing', legacyLabsPath = false }: BuildDemoModeSelectUrlOptions): string {
  const params = new URLSearchParams({ lang: language });
  if (source !== 'landing') {
    params.set('source', source);
  }
  const pathname = legacyLabsPath ? '/labs/demo-mode-select' : '/demo-mode-select';
  return `${pathname}?${params.toString()}`;
}

export function buildDemoUrl({ language, source = 'landing', entryMode = 'public', mode }: BuildDemoUrlOptions): string {
  const resolvedEntryMode = mode && VALID_ACCESS_MODES.has(mode as DemoAccessMode) ? (mode as DemoAccessMode) : entryMode;
  const params = new URLSearchParams({ lang: language, source, entry: resolvedEntryMode });
  if (mode && !VALID_ACCESS_MODES.has(mode as DemoAccessMode)) {
    params.set('mode', mode);
  }
  return `/demo?${params.toString()}`;
}

export function resolveDemoEntryContext(search: string): DemoEntryContext {
  const params = new URLSearchParams(search);
  const language = params.get('lang') === 'en' ? 'en' : 'es';

  const sourceParam = params.get('source');
  const source = sourceParam && VALID_SOURCES.has(sourceParam as DemoEntrySource) ? (sourceParam as DemoEntrySource) : 'landing';

  const legacyModeParam = params.get('mode');
  const entryParam = params.get('entry') ?? legacyModeParam;
  const entryMode = entryParam && VALID_ACCESS_MODES.has(entryParam as DemoAccessMode) ? (entryParam as DemoAccessMode) : 'public';

  const gameMode = normalizeGameModeValue(legacyModeParam);
  const mode = resolveLabsGameModeId(gameMode?.toLowerCase());

  return {
    language,
    source,
    entryMode,
    mode,
    gameMode: coerceGameMode(gameMode ?? legacyModeParam, 'Flow'),
    fromOnboarding: source === 'onboarding' || entryMode === 'onboarding',
  };
}
