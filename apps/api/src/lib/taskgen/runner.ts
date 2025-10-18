// #REMOVE_ME_DEBUG_BYPASS
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Ajv, type AnySchema, type ErrorObject } from 'ajv';
import OpenAI from 'openai';
import type {
  ResponseCreateParamsNonStreaming,
  ResponseFormatTextConfig,
  ResponseFormatTextJSONSchemaConfig,
} from 'openai/resources/responses/responses';
import { isReasoningModel, sanitizeReasoningParameters } from './openaiPayload.js';

const LOG_PREFIX = '[taskgen]';
const MODE_FILES = {
  low: 'low.json',
  chill: 'chill.json',
  flow: 'flow.json',
  evolve: 'evolve.json',
} as const;

const MODE_TEMPERATURE: Record<Mode, number> = {
  low: 0.5,
  chill: 0.5,
  flow: 0.65,
  evolve: 0.65,
};

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';

function modelSupportsTemperature(model: string): boolean {
  return !isReasoningModel(model);
}

const runtimeDir = path.dirname(fileURLToPath(import.meta.url));
const appRootCandidates = [
  process.cwd(),
  path.resolve(process.cwd(), 'apps/api'),
  path.resolve(runtimeDir, '../../..'),
  path.resolve(runtimeDir, '../../../..'),
];

const exportsCandidates = [
  path.resolve(process.cwd(), 'exports'),
  path.resolve(runtimeDir, '../../../exports'),
  path.resolve(runtimeDir, '../../exports'),
];

const PROMPTS_DIR_CANDIDATES = [
  process.env.TASKGEN_PROMPTS_PATH,
  ...appRootCandidates.map((base) => path.resolve(base, 'prompts')),
  ...appRootCandidates.map((base) => path.resolve(base, 'dist/taskgen/prompts')),
].filter((value): value is string => Boolean(value));

const SNAPSHOT_SAMPLE_CANDIDATES = [
  ...appRootCandidates.map((base) => path.resolve(base, 'db-snapshot.sample.json')),
  ...appRootCandidates.map((base) => path.resolve(base, 'dist/taskgen/db-snapshot.sample.json')),
];

const STATIC_FIXTURE_CANDIDATES = [
  ...appRootCandidates.map((base) => path.resolve(base, 'fixtures/taskgen.static.json')),
  ...appRootCandidates.map((base) => path.resolve(base, 'dist/taskgen/taskgen.static.json')),
];

function log(message: string, metadata?: Record<string, unknown> | string) {
  const timestamp = new Date().toISOString();
  if (typeof metadata === 'undefined') {
    console.log(`${LOG_PREFIX} ${timestamp} ${message}`);
    return;
  }

  if (typeof metadata === 'string') {
    console.log(`${LOG_PREFIX} ${timestamp} ${message}: ${metadata}`);
    return;
  }

  console.log(`${LOG_PREFIX} ${timestamp} ${message}`, metadata);
}

function logWarn(message: string, metadata?: Record<string, unknown> | string) {
  const timestamp = new Date().toISOString();
  if (typeof metadata === 'undefined') {
    console.warn(`${LOG_PREFIX} ${timestamp} ${message}`);
    return;
  }

  if (typeof metadata === 'string') {
    console.warn(`${LOG_PREFIX} ${timestamp} ${message}: ${metadata}`);
    return;
  }

  console.warn(`${LOG_PREFIX} ${timestamp} ${message}`, metadata);
}

function logError(message: string, metadata?: Record<string, unknown> | string) {
  const timestamp = new Date().toISOString();
  if (typeof metadata === 'undefined') {
    console.error(`${LOG_PREFIX} ${timestamp} ${message}`);
    return;
  }

  if (typeof metadata === 'string') {
    console.error(`${LOG_PREFIX} ${timestamp} ${message}: ${metadata}`);
    return;
  }

  console.error(`${LOG_PREFIX} ${timestamp} ${message}`, metadata);
}


type Mode = keyof typeof MODE_FILES;
export type TaskgenSource = 'snapshot' | 'mock' | 'static';

type SnapshotTable<T> = T[] | undefined;

type UserRow = {
  user_id: string;
  clerk_user_id?: string | null;
  email_primary?: string | null;
  full_name?: string | null;
  image_url?: string | null;
  game_mode_id?: number | null;
  timezone?: string | null;
  tasks_group_id?: string | null;
  first_date_log?: string | null;
  scheduler_enabled?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  user_profile?: string | null;
  channel_scheduler?: string | null;
  hour_scheduler?: string | null;
  status_scheduler?: string | null;
  last_sent_local_date_scheduler?: string | null;
  first_programmed?: boolean | null;
  first_tasks_confirmed?: boolean | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  deleted_at?: string | null;
  preferred_language?: string | null;
  preferred_timezone?: string | null;
};

type GameModeRow = {
  game_mode_id: number;
  code: string;
  name?: string | null;
  weekly_target?: number | null;
};

type PillarRow = {
  pillar_id: number;
  code: string;
  name?: string | null;
};

type TraitRow = {
  trait_id: number;
  pillar_id: number;
  code: string;
  name?: string | null;
};

type DifficultyRow = {
  difficulty_id: number;
  code: string;
  name?: string | null;
  xp_base?: number | null;
};

type OnboardingSessionRow = {
  onboarding_session_id?: string;
  user_id?: string;
  client_id?: string | null;
  game_mode_id?: number | null;
  xp_total?: number | null;
  xp_body?: number | null;
  xp_mind?: number | null;
  xp_soul?: number | null;
  email?: string | null;
  meta?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
};

type SnapshotData = {
  users: SnapshotTable<UserRow>;
  cat_game_mode: SnapshotTable<GameModeRow>;
  cat_pillar: SnapshotTable<PillarRow>;
  cat_trait: SnapshotTable<TraitRow>;
  cat_difficulty: SnapshotTable<DifficultyRow>;
  onboarding_session: SnapshotTable<OnboardingSessionRow>;
};

type PromptMessage = {
  role: 'system' | 'user';
  content: string;
};

type PromptJsonSchemaConfig = {
  name?: string;
  schema?: AnySchema;
  description?: string;
  strict?: boolean | null;
  [key: string]: unknown;
};

type PromptResponseFormat =
  | ({
      type: 'json_schema';
      json_schema?: PromptJsonSchemaConfig;
    } & Record<string, unknown>)
  | ({ type: 'text' } & Record<string, unknown>)
  | ({ type: 'json_object' } & Record<string, unknown>);

type PromptFile = {
  response_format?: PromptResponseFormat;
  messages: PromptMessage[];
};

type TaskPayload = {
  user_id: string;
  tasks_group_id: string;
  tasks: {
    task: string;
    pillar_code: string;
    trait_code: string;
    stat_code: string;
    difficulty_code: string;
    friction_score: number;
    friction_tier: string;
  }[];
};

export type TaskgenResult = {
  status: 'ok' | 'error';
  user_id: string;
  mode: Mode;
  source: TaskgenSource;
  seed?: number;
  placeholders?: Record<string, string>;
  prompt_preview?: string;
  tasks?: TaskPayload['tasks'];
  meta: {
    schema_version: string;
    validation: { valid: boolean; errors: string[] };
    timings_ms: { total: number; openai: number };
  };
  errors?: string[];
  error_log?: string;
};

type SnapshotResolution = {
  snapshot: SnapshotData;
  source: TaskgenSource;
  path?: string;
  payloadFromFixture?: TaskPayload;
};

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

async function loadJsonFile<T>(paths: string[]): Promise<{ value: T; path: string } | undefined> {
  for (const candidate of paths) {
    if (!candidate) continue;
    try {
      const raw = await fs.readFile(candidate, 'utf8');
      return { value: JSON.parse(raw) as T, path: candidate };
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }
  return undefined;
}

function normalisePrompt(raw: string): PromptFile {
  const normalised = raw.replace(/\$1([\s\S]*?)\$2,/m, (_, systemBlock: string) => {
    const trimmed = systemBlock.trim();
    const jsonValue = JSON.stringify(trimmed);
    return `"system": ${jsonValue},`;
  });

  const parsed = JSON.parse(normalised);

  const messages: PromptMessage[] = [];
  for (const entry of parsed.messages as Record<string, unknown>[]) {
    if (typeof entry.system === 'string') {
      messages.push({ role: 'system', content: entry.system });
    }
    if (typeof entry.content === 'string') {
      messages.push({ role: 'user', content: entry.content });
    }
  }

  return {
    response_format: parsed.response_format as PromptResponseFormat | undefined,
    messages,
  };
}

async function loadPrompt(mode: Mode): Promise<{ prompt: PromptFile; path: string }> {
  const promptFiles = PROMPTS_DIR_CANDIDATES.map((dir) => path.resolve(dir, MODE_FILES[mode]));
  const resolved = await loadJsonFile<string>(promptFiles);
  if (!resolved) {
    throw new Error(`Prompt for mode ${mode} not found. Checked: ${promptFiles.join(', ')}`);
  }
  const prompt = normalisePrompt(resolved.value);
  return { prompt, path: resolved.path };
}

function buildCatalogStrings(snapshot: SnapshotData) {
  const pillars = snapshot.cat_pillar ?? [];
  const traits = snapshot.cat_trait ?? [];
  const difficulties = snapshot.cat_difficulty ?? [];

  const pillarById = new Map<number, PillarRow>();
  const pillarCodes = new Set<string>();
  for (const pillar of pillars) {
    pillarById.set(pillar.pillar_id, pillar);
    pillarCodes.add(pillar.code);
  }

  const traitsByCode = new Map<string, TraitRow>();
  const traitsByPillarCode = new Map<string, TraitRow[]>();
  for (const trait of traits) {
    traitsByCode.set(trait.code, trait);
    const pillar = pillarById.get(trait.pillar_id);
    const pillarCode = pillar?.code ?? `pillar_${trait.pillar_id}`;
    if (!traitsByPillarCode.has(pillarCode)) {
      traitsByPillarCode.set(pillarCode, []);
    }
    traitsByPillarCode.get(pillarCode)!.push(trait);
  }

  const stats = traits.map((trait) => ({
    code: trait.code,
    name: trait.name ?? trait.code,
    pillar_id: trait.pillar_id,
  }));

  const statCodes = new Set(stats.map((s) => s.code));
  const difficultyCodes = new Set(difficulties.map((d) => d.code));

  const catalogPillars = pillars.map((p) => `${p.code}${p.name ? ` (${p.name})` : ''}`).join(', ');
  const catalogTraits = traits
    .map((t) => {
      const pillar = pillarById.get(t.pillar_id);
      const pillarLabel = pillar ? pillar.code : `pillar_${t.pillar_id}`;
      return `${t.code}${t.name ? ` (${t.name})` : ''} [${pillarLabel}]`;
    })
    .join(', ');
  const catalogStats = stats
    .map((s) => {
      const pillar = pillarById.get(s.pillar_id);
      const pillarLabel = pillar ? pillar.code : `pillar_${s.pillar_id}`;
      return `${s.code} [${pillarLabel}]`;
    })
    .join(', ');
  const catalogDifficulty = difficulties
    .map((d) => `${d.code}${d.name ? ` (${d.name})` : ''}${d.xp_base ? ` — xp_base ${d.xp_base}` : ''}`)
    .join(', ');

  return {
    catalogPillars,
    catalogTraits,
    catalogStats,
    catalogDifficulty,
    pillarCodes,
    traitsByCode,
    pillarById,
    statCodes,
    difficultyCodes,
  };
}

function buildUserMiniProfile(
  user: UserRow,
  onboarding: OnboardingSessionRow | undefined,
  gameMode: GameModeRow | undefined,
) {
  const parts: string[] = [];
  if (user.full_name) {
    parts.push(`Name: ${user.full_name}`);
  }
  parts.push(`User ID: ${user.user_id}`);
  if (user.tasks_group_id) {
    parts.push(`Tasks Group: ${user.tasks_group_id}`);
  }
  if (user.email_primary) {
    parts.push(`Primary email: ${user.email_primary}`);
  }
  if (user.preferred_language) {
    parts.push(`Preferred language: ${user.preferred_language}`);
  }
  if (user.preferred_timezone) {
    parts.push(`Preferred timezone: ${user.preferred_timezone}`);
  }
  if (user.timezone) {
    parts.push(`Timezone: ${user.timezone}`);
  }
  if (typeof user.scheduler_enabled === 'boolean') {
    parts.push(`Scheduler enabled: ${user.scheduler_enabled ? 'yes' : 'no'}`);
  }
  if (user.channel_scheduler) {
    parts.push(`Scheduler channel: ${user.channel_scheduler}`);
  }
  if (user.status_scheduler) {
    parts.push(`Scheduler status: ${user.status_scheduler}`);
  }
  if (user.user_profile) {
    parts.push(`Profile tag: ${user.user_profile}`);
  }
  if (onboarding?.meta && typeof onboarding.meta === 'object') {
    parts.push(`Onboarding meta: ${JSON.stringify(onboarding.meta)}`);
  }
  if (onboarding?.client_id) {
    parts.push(`Onboarding client: ${onboarding.client_id}`);
  }
  if (gameMode?.code) {
    parts.push(`Current mode: ${gameMode.code}`);
  }
  return parts.join(' | ');
}

function buildPlaceholders(args: {
  user: UserRow;
  onboarding?: OnboardingSessionRow;
  gameMode?: GameModeRow;
  catalogs: ReturnType<typeof buildCatalogStrings>;
}) {
  const { user, onboarding, gameMode, catalogs } = args;

  return {
    USER_MINI_PROFILE: buildUserMiniProfile(user, onboarding, gameMode),
    GAME_MODE: gameMode ? `${gameMode.code}${gameMode.name ? ` — ${gameMode.name}` : ''}` : 'UNKNOWN',
    WEEKLY_TARGET: gameMode?.weekly_target?.toString() ?? 'N/A',
    CATALOG_PILLARS: catalogs.catalogPillars,
    CATALOG_TRAITS: catalogs.catalogTraits,
    CATALOG_STATS: catalogs.catalogStats,
    CATALOG_DIFFICULTY: catalogs.catalogDifficulty,
    USER_ID: user.user_id,
    TASKS_GROUP_ID: user.tasks_group_id ?? 'N/A',
  };
}

function applyPlaceholders(template: string, placeholders: Record<string, string>): string {
  return template.replace(/\{\{(.*?)\}\}/g, (_, key: string) => {
    const trimmed = key.trim();
    if (!(trimmed in placeholders)) {
      throw new Error(`Missing placeholder value for ${trimmed}`);
    }
    return placeholders[trimmed];
  });
}

function buildMessages(prompt: PromptFile, placeholders: Record<string, string>): PromptMessage[] {
  return prompt.messages.map((msg) => ({
    role: msg.role,
    content: applyPlaceholders(msg.content, placeholders),
  }));
}

function extractPromptJsonSchema(format: PromptResponseFormat | undefined): AnySchema | undefined {
  if (format?.type !== 'json_schema') {
    return undefined;
  }

  return format.json_schema?.schema;
}

function buildResponseFormatConfig(format: PromptResponseFormat | undefined): ResponseFormatTextConfig | undefined {
  if (!format) {
    return undefined;
  }

  if (format.type === 'json_schema') {
    const jsonSchema = format.json_schema;
    if (!jsonSchema?.schema) {
      return undefined;
    }

    const schemaValue = jsonSchema.schema;
    if (typeof schemaValue !== 'object' || schemaValue === null) {
      return undefined;
    }

    const config: ResponseFormatTextJSONSchemaConfig = {
      type: 'json_schema',
      name: typeof jsonSchema.name === 'string' ? jsonSchema.name : 'TaskPayload',
      schema: schemaValue as Record<string, unknown>,
    };

    if (typeof jsonSchema.description === 'string') {
      config.description = jsonSchema.description;
    }

    if (typeof jsonSchema.strict === 'boolean' || jsonSchema.strict === null) {
      config.strict = jsonSchema.strict;
    }

    return config;
  }

  if (format.type === 'text') {
    return { type: 'text' };
  }

  if (format.type === 'json_object') {
    return { type: 'json_object' };
  }

  return undefined;
}

async function ensureExportsDir(): Promise<string> {
  for (const candidate of exportsCandidates) {
    try {
      await fs.mkdir(candidate, { recursive: true });
      return candidate;
    } catch (error) {
      logWarn('Unable to create exports directory candidate', {
        path: candidate,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const fallback = path.resolve(process.cwd(), 'exports');
  await fs.mkdir(fallback, { recursive: true });
  return fallback;
}

async function appendErrorLog(message: string): Promise<string | undefined> {
  try {
    const exportsDir = await ensureExportsDir();
    const logPath = path.join(exportsDir, 'errors.log');
    const timestamp = new Date().toISOString();
    await fs.appendFile(logPath, `[${timestamp}] ${message}\n`, 'utf8');
    return logPath;
  } catch (error) {
    logError('Failed to append error log', error instanceof Error ? error.message : String(error));
    return undefined;
  }
}

function validatePayload(
  payload: TaskPayload,
  schema: AnySchema | undefined,
  catalogs: ReturnType<typeof buildCatalogStrings>,
  placeholders: Record<string, string>,
): { valid: boolean; errors: string[] } {
  const ajv = new Ajv({ allErrors: true, strict: false });
  if (schema) {
    const validate = ajv.compile(schema);
    const valid = validate(payload);
    if (!valid) {
      const errors = (validate.errors ?? []).map((err: ErrorObject) => `${err.instancePath} ${err.message ?? ''}`.trim());
      return { valid: false, errors };
    }
  }

  const expectedUserId = placeholders.USER_ID;
  if (payload.user_id !== expectedUserId) {
    return { valid: false, errors: [`user_id mismatch. Expected ${expectedUserId}, got ${payload.user_id}`] };
  }
  const expectedGroupId = placeholders.TASKS_GROUP_ID;
  if (expectedGroupId !== 'N/A' && payload.tasks_group_id !== expectedGroupId) {
    return {
      valid: false,
      errors: [`tasks_group_id mismatch. Expected ${expectedGroupId}, got ${payload.tasks_group_id}`],
    };
  }

  if (!Array.isArray(payload.tasks) || payload.tasks.length < 1) {
    return { valid: false, errors: ['Expected at least one task in payload'] };
  }

  const seenTasks = new Set<string>();
  for (const task of payload.tasks) {
    const normalizedTask = task.task.trim().toLowerCase();
    if (seenTasks.has(normalizedTask)) {
      return { valid: false, errors: [`Duplicate task detected: ${task.task}`] };
    }
    seenTasks.add(normalizedTask);

    if (!catalogs.pillarCodes.has(task.pillar_code)) {
      return { valid: false, errors: [`Invalid pillar_code: ${task.pillar_code}`] };
    }
    const trait = catalogs.traitsByCode.get(task.trait_code);
    if (!trait) {
      return { valid: false, errors: [`Invalid trait_code: ${task.trait_code}`] };
    }
    const pillarForTrait = catalogs.pillarById.get(trait.pillar_id)?.code;
    if (pillarForTrait && pillarForTrait !== task.pillar_code) {
      return {
        valid: false,
        errors: [`Trait ${task.trait_code} does not belong to pillar ${task.pillar_code}`],
      };
    }
    if (!catalogs.statCodes.has(task.stat_code)) {
      return { valid: false, errors: [`Invalid stat_code: ${task.stat_code}`] };
    }
    if (!catalogs.difficultyCodes.has(task.difficulty_code)) {
      return { valid: false, errors: [`Invalid difficulty_code: ${task.difficulty_code}`] };
    }
  }

  return { valid: true, errors: [] };
}

async function tryLoadSnapshot(pathCandidate: string): Promise<SnapshotData | undefined> {
  try {
    const raw = await fs.readFile(pathCandidate, 'utf8');
    const data = JSON.parse(raw);
    if (!data.samples) {
      throw new Error('Snapshot file missing `samples` key.');
    }
    return data.samples as SnapshotData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

function createMockSnapshot(userId: string): SnapshotData {
  const pillars: PillarRow[] = [
    { pillar_id: 1, code: 'BODY', name: 'Body' },
    { pillar_id: 2, code: 'MIND', name: 'Mind' },
    { pillar_id: 3, code: 'SOUL', name: 'Soul' },
  ];
  const traits: TraitRow[] = [
    { trait_id: 1, pillar_id: 1, code: 'BODY_MOBILITY', name: 'Mobility' },
    { trait_id: 2, pillar_id: 2, code: 'MIND_FOCUS', name: 'Focus' },
    { trait_id: 3, pillar_id: 3, code: 'SOUL_CONNECTION', name: 'Connection' },
  ];
  const difficulties: DifficultyRow[] = [
    { difficulty_id: 1, code: 'Easy', name: 'Easy', xp_base: 10 },
    { difficulty_id: 2, code: 'Medium', name: 'Medium', xp_base: 20 },
    { difficulty_id: 3, code: 'Hard', name: 'Hard', xp_base: 30 },
  ];
  const gameModes: GameModeRow[] = [
    { game_mode_id: 101, code: 'FLOW', name: 'Flow', weekly_target: 3 },
    { game_mode_id: 102, code: 'CHILL', name: 'Chill', weekly_target: 2 },
    { game_mode_id: 103, code: 'EVOLVE', name: 'Evolve', weekly_target: 4 },
    { game_mode_id: 104, code: 'LOW', name: 'Low', weekly_target: 1 },
  ];
  const onboarding: OnboardingSessionRow[] = [
    {
      onboarding_session_id: `debug-${userId}`,
      user_id: userId,
      client_id: 'debug-client',
      game_mode_id: 101,
      meta: { mocked: true },
    },
  ];
  const users: UserRow[] = [
    {
      user_id: userId,
      full_name: 'Debug Taskgen User',
      email_primary: 'debug@example.com',
      tasks_group_id: 'debug-group',
      preferred_language: 'en',
      preferred_timezone: 'UTC',
      scheduler_enabled: true,
      channel_scheduler: 'email',
      status_scheduler: 'active',
      game_mode_id: 101,
    },
  ];

  return {
    users,
    cat_game_mode: gameModes,
    cat_pillar: pillars,
    cat_trait: traits,
    cat_difficulty: difficulties,
    onboarding_session: onboarding,
  };
}

async function loadStaticFixture(): Promise<{ snapshot: SnapshotData; payload: TaskPayload; path: string } | undefined> {
  const resolved = await loadJsonFile<{ snapshot: SnapshotData; payload: TaskPayload }>(STATIC_FIXTURE_CANDIDATES);
  if (!resolved) {
    return undefined;
  }
  return { snapshot: resolved.value.snapshot, payload: resolved.value.payload, path: resolved.path };
}

export async function getSnapshotOrMock(args: {
  requestedSource: TaskgenSource;
  userId: string;
}): Promise<SnapshotResolution> {
  if (args.requestedSource === 'mock') {
    return { snapshot: createMockSnapshot(args.userId), source: 'mock' };
  }

  if (args.requestedSource === 'static') {
    const fixture = await loadStaticFixture();
    if (fixture) {
      log('Loaded static fixture snapshot', { path: fixture.path });
      return { snapshot: fixture.snapshot, source: 'static', path: fixture.path, payloadFromFixture: fixture.payload };
    }
    logWarn('Static fixture not found, falling back to mock');
    return { snapshot: createMockSnapshot(args.userId), source: 'mock' };
  }

  const envSnapshotPath = process.env.DB_SNAPSHOT_PATH ? path.resolve(process.env.DB_SNAPSHOT_PATH) : undefined;
  const defaultCandidates = [
    envSnapshotPath,
    ...appRootCandidates.map((base) => path.resolve(base, 'db-snapshot.json')),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of uniqueStrings(defaultCandidates)) {
    const snapshot = await tryLoadSnapshot(candidate);
    if (snapshot) {
      log('Loaded snapshot', { path: candidate });
      return { snapshot, source: 'snapshot', path: candidate };
    }
  }

  const sample = await loadJsonFile<{ samples: SnapshotData }>(SNAPSHOT_SAMPLE_CANDIDATES);
  if (sample?.value?.samples) {
    logWarn('Using snapshot sample as fallback', { path: sample.path });
    return { snapshot: sample.value.samples, source: 'snapshot', path: sample.path };
  }

  logWarn('Snapshot not found, using mock snapshot');
  return { snapshot: createMockSnapshot(args.userId), source: 'mock' };
}

function findUser(snapshot: SnapshotData, userId: string): UserRow | undefined {
  return snapshot.users?.find((user) => user.user_id === userId);
}

function resolveMode(mode: Mode, snapshot: SnapshotData, user: UserRow | undefined): {
  mode: Mode;
  gameMode?: GameModeRow;
} {
  const gameModes = snapshot.cat_game_mode ?? [];
  const gameModeByCode = new Map(gameModes.map((gm) => [gm.code.toLowerCase(), gm]));
  const gameModeById = new Map(gameModes.map((gm) => [gm.game_mode_id, gm]));
  const override = gameModeByCode.get(mode.toLowerCase());
  const resolved = user?.game_mode_id ? gameModeById.get(user.game_mode_id) : undefined;
  return { mode, gameMode: override ?? resolved };
}

function buildPromptPreview(messages: PromptMessage[]): string {
  const joined = messages
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n\n');
  if (joined.length <= 1200) {
    return joined;
  }
  return `${joined.slice(0, 1197)}...`;
}

function buildDryRunPayload(args: {
  placeholders: Record<string, string>;
  snapshot: SnapshotData;
}): TaskPayload {
  const { placeholders, snapshot } = args;
  const traits = snapshot.cat_trait ?? [];
  const pillars = snapshot.cat_pillar ?? [];
  const difficulties = snapshot.cat_difficulty ?? [];

  const traitList = traits.length
    ? traits
    : [
        { trait_id: 101, pillar_id: 1, code: 'BODY_MOBILITY', name: 'Mobility' },
        { trait_id: 102, pillar_id: 2, code: 'MIND_FOCUS', name: 'Focus' },
        { trait_id: 103, pillar_id: 3, code: 'SOUL_CONNECTION', name: 'Connection' },
      ];
  const pillarById = new Map(
    (pillars.length
      ? pillars
      : [
          { pillar_id: 1, code: 'BODY', name: 'Body' },
          { pillar_id: 2, code: 'MIND', name: 'Mind' },
          { pillar_id: 3, code: 'SOUL', name: 'Soul' },
        ]).map((pillar) => [pillar.pillar_id, pillar]),
  );
  const difficultyList = difficulties.length
    ? difficulties
    : [
        { difficulty_id: 1, code: 'Easy', name: 'Easy', xp_base: 10 },
        { difficulty_id: 2, code: 'Medium', name: 'Medium', xp_base: 20 },
        { difficulty_id: 3, code: 'Hard', name: 'Hard', xp_base: 30 },
      ];

  const frictionByDifficulty: Record<string, { score: number; tier: string }> = {
    Easy: { score: 22, tier: 'E-F' },
    Medium: { score: 47, tier: 'M-F' },
    Hard: { score: 75, tier: 'D-F' },
  };

  const tasks: TaskPayload['tasks'] = [];
  const total = Math.max(15, traitList.length * difficultyList.length);
  for (let index = 0; index < total; index += 1) {
    const trait = traitList[index % traitList.length];
    const pillar = pillarById.get(trait.pillar_id);
    const difficulty = difficultyList[index % difficultyList.length];
    const friction = frictionByDifficulty[difficulty.code] ?? { score: 40, tier: 'M-F' };
    const taskLabel = `[dry_run] ${trait.code.replace(/_/g, ' ')} #${index + 1}`;
    tasks.push({
      task: taskLabel,
      pillar_code: pillar?.code ?? 'BODY',
      trait_code: trait.code,
      stat_code: trait.code,
      difficulty_code: difficulty.code,
      friction_score: friction.score,
      friction_tier: friction.tier,
    });
  }

  return {
    user_id: placeholders.USER_ID,
    tasks_group_id: placeholders.TASKS_GROUP_ID === 'N/A' ? 'debug-group' : placeholders.TASKS_GROUP_ID,
    tasks,
  };
}

function mergeFixturePayload(base: TaskPayload, overrides: { userId: string; tasksGroupId: string }): TaskPayload {
  return {
    user_id: overrides.userId,
    tasks_group_id: overrides.tasksGroupId,
    tasks: base.tasks.map((task) => ({
      ...task,
      task: task.task.includes('{{USER_ID}}') ? task.task.replace('{{USER_ID}}', overrides.userId) : task.task,
      friction_score: task.friction_score,
      friction_tier: task.friction_tier,
    })),
  };
}

export async function runTaskGeneration(args: {
  userId: string;
  mode: Mode;
  source: TaskgenSource;
  dryRun: boolean;
  seed?: number;
}): Promise<TaskgenResult> {
  const start = Date.now();
  try {
    const snapshotResolution = await getSnapshotOrMock({ requestedSource: args.source, userId: args.userId });
    let snapshot = snapshotResolution.snapshot;
    let resolvedSource = snapshotResolution.source;

    let user = findUser(snapshot, args.userId);
    if (!user && resolvedSource !== 'mock') {
      logWarn('User not found in snapshot, switching to mock snapshot', { userId: args.userId });
      const mockSnapshot = createMockSnapshot(args.userId);
      user = findUser(mockSnapshot, args.userId);
      resolvedSource = 'mock';
      snapshot = mockSnapshot;
    } else if (!user) {
      user = createMockSnapshot(args.userId).users?.[0];
    }

    if (!user) {
      throw new Error('Unable to resolve user for task generation');
    }

    const { prompt } = await loadPrompt(args.mode);
    const catalogs = buildCatalogStrings(snapshot);
    const onboarding = snapshot.onboarding_session?.find((entry) => entry.user_id === user?.user_id);
    const { gameMode } = resolveMode(args.mode, snapshot, user);
    const placeholders = buildPlaceholders({ user, onboarding, gameMode, catalogs });
    const messages = buildMessages(prompt, placeholders);
    const promptPreview = buildPromptPreview(messages);

    const basePayloadFromFixture = snapshotResolution.payloadFromFixture
      ? mergeFixturePayload(snapshotResolution.payloadFromFixture, {
          userId: placeholders.USER_ID,
          tasksGroupId: placeholders.TASKS_GROUP_ID === 'N/A' ? 'debug-group' : placeholders.TASKS_GROUP_ID,
        })
      : undefined;

    if (args.dryRun) {
      const payload = basePayloadFromFixture ?? buildDryRunPayload({ placeholders, snapshot });
      const validation = validatePayload(
        payload,
        extractPromptJsonSchema(prompt.response_format),
        catalogs,
        placeholders,
      );
      const total = Date.now() - start;
      return {
        status: validation.valid ? 'ok' : 'error',
        user_id: placeholders.USER_ID,
        mode: args.mode,
        source: resolvedSource,
        seed: args.seed,
        placeholders,
        prompt_preview: promptPreview,
        tasks: payload.tasks,
        meta: {
          schema_version: 'v1',
          validation,
          timings_ms: { total, openai: 0 },
        },
        errors: validation.valid ? undefined : validation.errors,
        error_log: validation.valid ? undefined : await appendErrorLog(validation.errors.join('; ')),
      };
    }

    if (resolvedSource === 'static' && basePayloadFromFixture) {
      const validation = validatePayload(
        basePayloadFromFixture,
        extractPromptJsonSchema(prompt.response_format),
        catalogs,
        placeholders,
      );
      const total = Date.now() - start;
      return {
        status: validation.valid ? 'ok' : 'error',
        user_id: placeholders.USER_ID,
        mode: args.mode,
        source: resolvedSource,
        seed: args.seed,
        placeholders,
        prompt_preview: promptPreview,
        tasks: basePayloadFromFixture.tasks,
        meta: {
          schema_version: 'v1',
          validation,
          timings_ms: { total, openai: 0 },
        },
        errors: validation.valid ? undefined : validation.errors,
        error_log: validation.valid ? undefined : await appendErrorLog(validation.errors.join('; ')),
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const client = new OpenAI({ apiKey });
    const controller = new AbortController();
    const timeout = Number.parseInt(process.env.TASKGEN_OPENAI_TIMEOUT ?? '45000', 10);
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    let openaiStart = 0;
    let openaiDuration = 0;
    const responseFormat = buildResponseFormatConfig(prompt.response_format);
    try {
      openaiStart = Date.now();
      const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
      const requestBody: ResponseCreateParamsNonStreaming = {
        model,
        input: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      };
      const temperature = MODE_TEMPERATURE[args.mode];
      if (modelSupportsTemperature(model)) {
        requestBody.temperature = temperature;
      } else {
        log('Skipping temperature parameter for model', { model, mode: args.mode });
      }
      if (responseFormat) {
        requestBody.text = { format: responseFormat };
      }
      const { body: sanitizedRequestBody, removedKeys } = sanitizeReasoningParameters(requestBody, model);
      const paramFilterApplied = removedKeys.length > 0 || isReasoningModel(model);
      log('OPENAI_REQUEST', {
        model,
        messageCount: messages.length,
        response_format: responseFormat?.type ?? null,
        paramFilter: paramFilterApplied ? 'on' : 'off',
        filteredParams: removedKeys,
      });
      const response = await client.responses.create(sanitizedRequestBody, { signal: controller.signal });
      openaiDuration = Date.now() - openaiStart;
      log('OpenAI invocation succeeded', {
        model,
        userId: placeholders.USER_ID,
        mode: args.mode,
        openai_duration_ms: openaiDuration,
        paramFilter: paramFilterApplied ? 'on' : 'off',
      });
      const outputText = response.output_text ?? '';
      const payload = JSON.parse(outputText) as TaskPayload;
      const validation = validatePayload(
        payload,
        extractPromptJsonSchema(prompt.response_format),
        catalogs,
        placeholders,
      );
      const total = Date.now() - start;
      if (!validation.valid) {
        const errorLog = await appendErrorLog(validation.errors.join('; '));
        return {
          status: 'error',
          user_id: placeholders.USER_ID,
          mode: args.mode,
          source: resolvedSource,
          seed: args.seed,
          placeholders,
          prompt_preview: promptPreview,
          tasks: payload.tasks,
          meta: {
            schema_version: 'v1',
            validation,
            timings_ms: { total, openai: openaiDuration },
          },
          errors: validation.errors,
          error_log: errorLog,
        };
      }

      return {
        status: 'ok',
        user_id: placeholders.USER_ID,
        mode: args.mode,
        source: resolvedSource,
        seed: args.seed,
        placeholders,
        prompt_preview: promptPreview,
        tasks: payload.tasks,
        meta: {
          schema_version: 'v1',
          validation,
          timings_ms: { total: Date.now() - start, openai: openaiDuration },
        },
      };
    } catch (error) {
      openaiDuration = openaiDuration || (openaiStart ? Date.now() - openaiStart : 0);
      const message = error instanceof Error ? error.message : String(error);
      const errorLog = await appendErrorLog(message);
      const total = Date.now() - start;
      const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
      logError('OpenAI invocation failed', {
        message,
        model,
        userId: placeholders.USER_ID,
        mode: args.mode,
        openai_duration_ms: openaiDuration,
        paramFilter: isReasoningModel(model) ? 'on' : 'off',
      });
      return {
        status: 'error',
        user_id: placeholders.USER_ID,
        mode: args.mode,
        source: resolvedSource,
        seed: args.seed,
        placeholders,
        prompt_preview: promptPreview,
        meta: {
          schema_version: 'v1',
          validation: { valid: false, errors: [message] },
          timings_ms: { total, openai: openaiDuration },
        },
        errors: [message],
        error_log: errorLog,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const total = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    const errorLog = await appendErrorLog(message);
    logError('Task generation failure', { message });
    return {
      status: 'error',
      user_id: args.userId,
      mode: args.mode,
      source: args.source,
      seed: args.seed,
      meta: {
        schema_version: 'v1',
        validation: { valid: false, errors: [message] },
        timings_ms: { total, openai: 0 },
      },
      errors: [message],
      error_log: errorLog,
    };
  }
}

export type { SnapshotData, TaskPayload, UserRow, Mode };
