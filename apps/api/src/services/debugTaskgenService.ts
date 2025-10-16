// #REMOVE_ME_DEBUG_BYPASS
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Ajv, type AnySchema, type ErrorObject } from 'ajv';
import type { PoolClient } from 'pg';
import OpenAI from 'openai';
import type { ResponseCreateParamsNonStreaming, ResponseFormatTextConfig } from 'openai/resources/responses/responses';
import { withClient } from '../db.js';

type Mode = 'low' | 'chill' | 'flow' | 'evolve';

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
  | ({ type: 'json_schema'; json_schema?: PromptJsonSchemaConfig } & Record<string, unknown>)
  | ({ type: 'text' } & Record<string, unknown>)
  | ({ type: 'json_object' } & Record<string, unknown>);

type PromptFile = {
  response_format?: PromptResponseFormat;
  messages: PromptMessage[];
};

type UserRow = {
  user_id: string;
  email_primary?: string | null;
  full_name?: string | null;
  image_url?: string | null;
  game_mode_id?: number | null;
  timezone?: string | null;
  tasks_group_id?: string | null;
  first_date_log?: string | null;
  scheduler_enabled?: boolean | null;
  user_profile?: string | null;
  channel_scheduler?: string | null;
  status_scheduler?: string | null;
  preferred_language?: string | null;
  preferred_timezone?: string | null;
};

type DbUserRow = Omit<UserRow, 'preferred_language' | 'preferred_timezone'>;

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
};

type OnboardingAnswersRow = {
  payload?: unknown;
};

type Catalogs = {
  catalogPillars: string;
  catalogTraits: string;
  catalogStats: string;
  catalogDifficulty: string;
  pillarCodes: Set<string>;
  traitsByCode: Map<string, TraitRow>;
  pillarById: Map<number, PillarRow>;
  statCodes: Set<string>;
  difficultyCodes: Set<string>;
  difficultiesByCode: Map<string, DifficultyRow>;
  pillarsByCode: Map<string, PillarRow>;
};

type UserContext = {
  user: UserRow;
  onboarding?: OnboardingSessionRow;
  gameMode?: GameModeRow;
  catalogs: Catalogs;
  gameModesByCode: Map<string, GameModeRow>;
};

type DebugTask = {
  task: string;
  pillar_code: string;
  trait_code: string;
  stat_code: string;
  difficulty_code: string;
  friction_score: number;
  friction_tier: string;
};

type TaskPayload = {
  user_id: string;
  tasks_group_id: string;
  tasks: DebugTask[];
};

type DebugTaskgenInput = {
  userId: string;
  mode?: Mode;
  seed?: number;
  dryRun: boolean;
  promptOverride?: string | null;
  store?: boolean;
};

type DebugTaskgenResult = {
  status: 'ok' | 'error';
  user_id: string;
  mode: Mode;
  placeholders: Record<string, string>;
  prompt_used: string;
  openai: {
    model: string;
    timings_ms: { request: number };
    raw_preview?: string;
  };
  tasks?: DebugTask[];
  validation: { valid: boolean; errors: string[] };
  persisted: boolean;
  meta: { schema_version: 'v1'; seed?: number };
  prompt_source?: string;
  error?: string;
};

type DebugTaskgenDeps = {
  getContext: (userId: string) => Promise<UserContext>;
  resolveMode: (requested: Mode | undefined, context: UserContext) => Mode;
  loadPrompt: (mode: Mode) => Promise<{ prompt: PromptFile; path: string }>;
  parseOverride: (override: string) => Promise<{ prompt: PromptFile; source: string }>;
  buildPlaceholders: (context: UserContext) => Record<string, string>;
  buildMessages: (prompt: PromptFile, placeholders: Record<string, string>) => PromptMessage[];
  buildPromptPreview: (messages: PromptMessage[]) => string;
  callOpenAI: (args: {
    mode: Mode;
    messages: PromptMessage[];
    responseFormat?: PromptResponseFormat;
  }) => Promise<{ raw: string; model: string; durationMs: number }>;
  validateTasks: (payload: TaskPayload, catalogs: Catalogs, placeholders: Record<string, string>, schema?: AnySchema) => {
    valid: boolean;
    errors: string[];
  };
  storeTasks: (args: {
    user: UserRow;
    catalogs: Catalogs;
    tasks: DebugTask[];
  }) => Promise<void>;
};

const LOG_PREFIX = '[aitaskgen]';

function normalizeRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    try {
      return normalizeRecord(JSON.parse(value));
    } catch (error) {
      void error;
      return null;
    }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function pickFirstString(
  sources: Array<Record<string, unknown> | null | undefined>,
  key: string,
): string | null {
  for (const source of sources) {
    if (!source) {
      continue;
    }

    const rawValue = source[key];
    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return null;
}

function log(message: string, meta?: Record<string, unknown>) {
  if (meta) {
    console.info(LOG_PREFIX, message, meta);
    return;
  }
  console.info(LOG_PREFIX, message);
}

function logError(message: string, meta?: Record<string, unknown>) {
  if (meta) {
    console.error(LOG_PREFIX, message, meta);
    return;
  }
  console.error(LOG_PREFIX, message);
}

const MODE_FILES: Record<Mode, string> = {
  low: 'low.json',
  chill: 'chill.json',
  flow: 'flow.json',
  evolve: 'evolve.json',
};

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

const runtimeDir = path.dirname(fileURLToPath(import.meta.url));
const appRootCandidates = [
  process.cwd(),
  path.resolve(process.cwd(), 'apps/api'),
  path.resolve(runtimeDir, '../../..'),
  path.resolve(runtimeDir, '../../../..'),
];

const PROMPTS_DIR_CANDIDATES = [
  process.env.TASKGEN_PROMPTS_PATH,
  ...appRootCandidates.map((base) => path.resolve(base, 'prompts')),
  ...appRootCandidates.map((base) => path.resolve(base, 'dist/taskgen/prompts')),
].filter((value): value is string => Boolean(value));

function normalizePrompt(raw: string): PromptFile {
  const normalised = raw.replace(/\$1([\s\S]*?)\$2,/m, (_, systemBlock: string) => {
    const trimmed = systemBlock.trim();
    const jsonValue = JSON.stringify(trimmed);
    return `"system": ${jsonValue},`;
  });

  const parsed = JSON.parse(normalised) as { messages?: Record<string, unknown>[]; response_format?: PromptResponseFormat };

  const messages: PromptMessage[] = [];
  for (const entry of parsed.messages ?? []) {
    if (typeof entry.system === 'string') {
      messages.push({ role: 'system', content: entry.system });
    }
    if (typeof entry.content === 'string') {
      messages.push({ role: 'user', content: entry.content });
    }
  }

  return {
    response_format: parsed.response_format,
    messages,
  };
}

async function loadPromptFile(mode: Mode): Promise<{ prompt: PromptFile; path: string }> {
  const candidates = PROMPTS_DIR_CANDIDATES.map((dir) => path.resolve(dir, MODE_FILES[mode]));

  for (const candidate of candidates) {
    try {
      const raw = await fs.readFile(candidate, 'utf8');
      return { prompt: normalizePrompt(raw), path: candidate };
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Prompt for mode ${mode} not found. Checked: ${candidates.join(', ')}`);
}

async function parsePromptOverride(raw: string): Promise<{ prompt: PromptFile; source: string }> {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Prompt override cannot be empty');
  }

  try {
    const parsed = normalizePrompt(trimmed);
    return { prompt: parsed, source: 'override:json' };
  } catch {
    // Treat as plain text template (single user message)
    return {
      prompt: {
        messages: [
          {
            role: 'user',
            content: trimmed,
          },
        ],
      },
      source: 'override:text',
    };
  }
}

function buildCatalogStrings(args: {
  pillars: PillarRow[];
  traits: TraitRow[];
  difficulties: DifficultyRow[];
}): Catalogs {
  const { pillars, traits, difficulties } = args;

  const pillarById = new Map<number, PillarRow>();
  const pillarCodes = new Set<string>();
  const pillarsByCode = new Map<string, PillarRow>();
  for (const pillar of pillars) {
    pillarById.set(pillar.pillar_id, pillar);
    pillarCodes.add(pillar.code);
    pillarsByCode.set(pillar.code, pillar);
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
    pillar_id: trait.pillar_id,
  }));

  const statCodes = new Set(stats.map((s) => s.code));
  const difficultyCodes = new Set(difficulties.map((d) => d.code));
  const difficultiesByCode = new Map(difficulties.map((d) => [d.code, d] as const));

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
    difficultiesByCode,
    pillarsByCode,
  };
}

function buildUserMiniProfile(user: UserRow, onboarding: OnboardingSessionRow | undefined, gameMode: GameModeRow | undefined) {
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

function buildPlaceholdersFromContext(context: UserContext): Record<string, string> {
  const { user, onboarding, gameMode, catalogs } = context;

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

function buildMessagesFromPrompt(prompt: PromptFile, placeholders: Record<string, string>): PromptMessage[] {
  return prompt.messages.map((msg) => ({
    role: msg.role,
    content: applyPlaceholders(msg.content, placeholders),
  }));
}

function buildPromptPreview(messages: PromptMessage[]): string {
  const joined = messages.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n');
  if (joined.length <= 1200) {
    return joined;
  }
  return `${joined.slice(0, 1197)}...`;
}

function extractJsonSchema(format: PromptResponseFormat | undefined): AnySchema | undefined {
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

    const config: ResponseFormatTextConfig = {
      type: 'json_schema',
      name: typeof jsonSchema.name === 'string' ? jsonSchema.name : 'TaskPayload',
      schema: jsonSchema.schema as Record<string, unknown>,
    };

    if (typeof jsonSchema.description === 'string') {
      config.description = jsonSchema.description;
    }

    if (typeof jsonSchema.strict === 'boolean' || jsonSchema.strict === null) {
      config.strict = jsonSchema.strict ?? undefined;
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

function validatePayload(
  payload: TaskPayload,
  schema: AnySchema | undefined,
  catalogs: Catalogs,
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

async function getContextFromDb(userId: string): Promise<UserContext> {
  return withClient(async (client) => {
    const userResult = await client.query<DbUserRow>(
      `SELECT user_id, email_primary, full_name, image_url, game_mode_id, timezone, tasks_group_id,
              first_date_log, scheduler_enabled, user_profile, channel_scheduler, status_scheduler
         FROM users
        WHERE user_id = $1
        LIMIT 1`,
      [userId],
    );

    const dbUser = userResult.rows[0];
    if (!dbUser) {
      throw new Error('User not found');
    }

    const onboardingResult = await client.query<OnboardingSessionRow>(
      `SELECT onboarding_session_id, user_id, client_id, game_mode_id, xp_total, xp_body, xp_mind, xp_soul, email, meta, created_at
         FROM onboarding_session
        WHERE user_id = $1
        ORDER BY created_at DESC NULLS LAST
        LIMIT 1`,
      [userId],
    );

    const onboarding = onboardingResult.rows[0];

    let answersPayload: Record<string, unknown> | null = null;
    let answersMeta: Record<string, unknown> | null = null;
    if (onboarding?.onboarding_session_id) {
      const answersResult = await client.query<OnboardingAnswersRow>(
        `SELECT payload FROM onboarding_answers WHERE onboarding_session_id = $1 ORDER BY created_at DESC NULLS LAST LIMIT 1`,
        [onboarding.onboarding_session_id],
      );

      answersPayload = normalizeRecord(answersResult.rows[0]?.payload);
      answersMeta = answersPayload ? normalizeRecord(answersPayload['meta']) : null;
    }

    const onboardingMeta = normalizeRecord(onboarding?.meta);
    const preferenceSources = [onboardingMeta, answersMeta, answersPayload];
    const preferred_language = pickFirstString(preferenceSources, 'lang');
    const preferred_timezone = pickFirstString(preferenceSources, 'tz');

    const user: UserRow = {
      ...dbUser,
      preferred_language,
      preferred_timezone,
    };

    const catalogs = await loadCatalogs(client);

    const gameMode = (() => {
      if (user.game_mode_id) {
        return catalogs.gameModesById.get(user.game_mode_id);
      }
      if (onboarding?.game_mode_id) {
        return catalogs.gameModesById.get(onboarding.game_mode_id);
      }
      return undefined;
    })();

    return {
      user,
      onboarding,
      gameMode,
      catalogs: catalogs.catalogs,
      gameModesByCode: catalogs.gameModesByCode,
    };
  });
}

async function loadCatalogs(client: PoolClient) {
  const [pillarsResult, traitsResult, difficultyResult, gameModesResult] = await Promise.all([
    client.query<PillarRow>('SELECT pillar_id, code, name FROM cat_pillar ORDER BY pillar_id ASC'),
    client.query<TraitRow>('SELECT trait_id, pillar_id, code, name FROM cat_trait ORDER BY trait_id ASC'),
    client.query<DifficultyRow>('SELECT difficulty_id, code, name, xp_base FROM cat_difficulty ORDER BY difficulty_id ASC'),
    client.query<GameModeRow>('SELECT game_mode_id, code, name, weekly_target FROM cat_game_mode ORDER BY game_mode_id ASC'),
  ]);

  const catalogs = buildCatalogStrings({
    pillars: pillarsResult.rows,
    traits: traitsResult.rows,
    difficulties: difficultyResult.rows,
  });

  const gameModesById = new Map(gameModesResult.rows.map((gm) => [gm.game_mode_id, gm] as const));
  const gameModesByCode = new Map(gameModesResult.rows.map((gm) => [gm.code.toLowerCase(), gm] as const));

  return { catalogs, gameModesById, gameModesByCode };
}

function resolveModeFromContext(requested: Mode | undefined, context: UserContext): Mode {
  if (requested) {
    return requested;
  }

  const gameMode = context.gameMode;
  if (!gameMode) {
    throw new Error('Unable to infer user game mode from database');
  }

  const code = gameMode.code.toLowerCase();
  if (!['low', 'chill', 'flow', 'evolve'].includes(code)) {
    throw new Error(`Unsupported game mode code: ${gameMode.code}`);
  }
  return code as Mode;
}

async function callOpenAiDefault(args: {
  mode: Mode;
  messages: PromptMessage[];
  responseFormat?: PromptResponseFormat;
}): Promise<{ raw: string; model: string; durationMs: number }> {
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

  try {
    const requestBody: ResponseCreateParamsNonStreaming = {
      model: DEFAULT_MODEL,
      temperature: args.mode === 'flow' || args.mode === 'evolve' ? 0.65 : 0.5,
      input: args.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    };

    const responseFormat = buildResponseFormatConfig(args.responseFormat);
    if (responseFormat) {
      requestBody.text = { format: responseFormat };
    }

    const start = Date.now();
    const response = await client.responses.create(requestBody, { signal: controller.signal });
    const durationMs = Date.now() - start;
    const resolvedModel = requestBody.model ?? DEFAULT_MODEL;
    return { raw: response.output_text ?? '', model: String(resolvedModel), durationMs };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function storeTasksDefault(args: { user: UserRow; catalogs: Catalogs; tasks: DebugTask[] }): Promise<void> {
  const { user, catalogs, tasks } = args;
  if (!user.tasks_group_id) {
    throw new Error('User is missing tasks_group_id; cannot persist tasks');
  }

  await withClient(async (client) => {
    await client.query('BEGIN');
    try {
      for (const task of tasks) {
        const pillar = catalogs.pillarsByCode.get(task.pillar_code);
        const trait = catalogs.traitsByCode.get(task.trait_code);
        const difficulty = catalogs.difficultiesByCode.get(task.difficulty_code);

        if (!pillar || !trait || !difficulty) {
          throw new Error(`Unable to resolve catalog IDs for task ${task.task}`);
        }

        await client.query(
          `INSERT INTO tasks (task_id, user_id, tasks_group_id, task, pillar_id, trait_id, difficulty_id, xp_base, active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
          [
            randomUUID(),
            user.user_id,
            user.tasks_group_id,
            task.task,
            pillar.pillar_id,
            trait.trait_id,
            difficulty.difficulty_id,
            difficulty.xp_base ?? 0,
          ],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

export function createDebugTaskgenRunner(overrides?: Partial<DebugTaskgenDeps>) {
  const deps: DebugTaskgenDeps = {
    getContext: overrides?.getContext ?? getContextFromDb,
    resolveMode: overrides?.resolveMode ?? resolveModeFromContext,
    loadPrompt: overrides?.loadPrompt ?? loadPromptFile,
    parseOverride: overrides?.parseOverride ?? parsePromptOverride,
    buildPlaceholders: overrides?.buildPlaceholders ?? buildPlaceholdersFromContext,
    buildMessages: overrides?.buildMessages ?? buildMessagesFromPrompt,
    buildPromptPreview: overrides?.buildPromptPreview ?? buildPromptPreview,
    callOpenAI: overrides?.callOpenAI ?? callOpenAiDefault,
    validateTasks: overrides?.validateTasks ?? ((payload, catalogs, placeholders, schema) =>
      validatePayload(payload, schema, catalogs, placeholders)),
    storeTasks: overrides?.storeTasks ?? storeTasksDefault,
  };

  return async function runDebugTaskgen(input: DebugTaskgenInput): Promise<DebugTaskgenResult> {
    try {
      const context = await deps.getContext(input.userId);
      const mode = deps.resolveMode(input.mode, context);
      const placeholders = deps.buildPlaceholders(context);

      let prompt: PromptFile;
      let promptSource: string | undefined;
      if (input.promptOverride) {
        const override = await deps.parseOverride(input.promptOverride);
        prompt = override.prompt;
        promptSource = override.source;
      } else {
        const loaded = await deps.loadPrompt(mode);
        prompt = loaded.prompt;
        promptSource = loaded.path;
      }

      const messages = deps.buildMessages(prompt, placeholders);
      const promptPreview = deps.buildPromptPreview(messages);
      const schema = extractJsonSchema(prompt.response_format);

      if (input.dryRun) {
        log('Dry run triggered', { userId: input.userId, mode });
        return {
          status: 'ok',
          user_id: placeholders.USER_ID,
          mode,
          placeholders,
          prompt_used: promptPreview,
          openai: { model: DEFAULT_MODEL, timings_ms: { request: 0 } },
          validation: { valid: true, errors: [] },
          persisted: false,
          meta: { schema_version: 'v1', seed: input.seed },
          prompt_source: promptSource,
        };
      }

      const openAiResult = await deps.callOpenAI({
        mode,
        messages,
        responseFormat: prompt.response_format,
      });

      let parsed: TaskPayload;
      try {
        parsed = JSON.parse(openAiResult.raw) as TaskPayload;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown parse error';
        logError('Failed to parse OpenAI response', { message });
        return {
          status: 'error',
          user_id: placeholders.USER_ID,
          mode,
          placeholders,
          prompt_used: promptPreview,
          openai: {
            model: openAiResult.model,
            timings_ms: { request: openAiResult.durationMs },
            raw_preview: openAiResult.raw.slice(0, 1000),
          },
          validation: { valid: false, errors: [`Failed to parse OpenAI response: ${message}`] },
          persisted: false,
          meta: { schema_version: 'v1', seed: input.seed },
          prompt_source: promptSource,
          error: `Failed to parse OpenAI response: ${message}`,
        };
      }

      const validation = deps.validateTasks(parsed, context.catalogs, placeholders, schema);

      if (!validation.valid) {
        log('Validation failed', { userId: input.userId, errors: validation.errors });
        return {
          status: 'error',
          user_id: placeholders.USER_ID,
          mode,
          placeholders,
          prompt_used: promptPreview,
          openai: {
            model: openAiResult.model,
            timings_ms: { request: openAiResult.durationMs },
            raw_preview: openAiResult.raw.slice(0, 1000),
          },
          tasks: parsed.tasks,
          validation,
          persisted: false,
          meta: { schema_version: 'v1', seed: input.seed },
          prompt_source: promptSource,
        };
      }

      let persisted = false;
      if (input.store) {
        await deps.storeTasks({ user: context.user, catalogs: context.catalogs, tasks: parsed.tasks });
        persisted = true;
      }

      return {
        status: 'ok',
        user_id: placeholders.USER_ID,
        mode,
        placeholders,
        prompt_used: promptPreview,
        openai: {
          model: openAiResult.model,
          timings_ms: { request: openAiResult.durationMs },
          raw_preview: openAiResult.raw.slice(0, 1000),
        },
        tasks: parsed.tasks,
        validation,
        persisted,
        meta: { schema_version: 'v1', seed: input.seed },
        prompt_source: promptSource,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logError('Debug taskgen failure', { message, userId: input.userId });
      return {
        status: 'error',
        user_id: input.userId,
        mode: input.mode ?? 'chill',
        placeholders: {},
        prompt_used: '',
        openai: { model: DEFAULT_MODEL, timings_ms: { request: 0 } },
        validation: { valid: false, errors: [message] },
        persisted: false,
        meta: { schema_version: 'v1', seed: input.seed },
        error: message,
      } as DebugTaskgenResult;
    }
  };
}

export type {
  DebugTaskgenInput,
  DebugTaskgenResult,
  PromptFile,
  PromptMessage,
  PromptResponseFormat,
  UserContext,
  Catalogs,
  DebugTask,
  TaskPayload,
  Mode,
};
