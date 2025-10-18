import { promises as fs } from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import OpenAI from 'openai';
import type { ResponseCreateParamsNonStreaming } from 'openai/resources/responses/responses';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.resolve(SCRIPT_DIR, '../prompts');
const EXPORTS_DIR = path.resolve('exports');
const PRIMARY_SNAPSHOT_PATH = process.env.DB_SNAPSHOT_PATH
  ? path.resolve(process.env.DB_SNAPSHOT_PATH)
  : path.resolve('apps/api/db-snapshot.json');
const SNAPSHOT_FALLBACK_PATH = path.resolve('apps/api/db-snapshot.sample.json');
const LOG_PREFIX = '[taskgen]';

type LogMetadata = Record<string, unknown> | string | undefined;

function log(message: string, metadata?: LogMetadata) {
  const timestamp = new Date().toISOString();
  if (metadata === undefined) {
    console.log(`${LOG_PREFIX} ${timestamp} ${message}`);
    return;
  }

  if (typeof metadata === 'string') {
    console.log(`${LOG_PREFIX} ${timestamp} ${message}: ${metadata}`);
    return;
  }

  console.log(`${LOG_PREFIX} ${timestamp} ${message}`, metadata);
}

function logError(message: string, metadata?: LogMetadata) {
  const timestamp = new Date().toISOString();
  if (metadata === undefined) {
    console.error(`${LOG_PREFIX} ${timestamp} ${message}`);
    return;
  }

  if (typeof metadata === 'string') {
    console.error(`${LOG_PREFIX} ${timestamp} ${message}: ${metadata}`);
    return;
  }

  console.error(`${LOG_PREFIX} ${timestamp} ${message}`, metadata);
}

function logWarn(message: string, metadata?: LogMetadata) {
  const timestamp = new Date().toISOString();
  if (metadata === undefined) {
    console.warn(`${LOG_PREFIX} ${timestamp} ${message}`);
    return;
  }

  if (typeof metadata === 'string') {
    console.warn(`${LOG_PREFIX} ${timestamp} ${message}: ${metadata}`);
    return;
  }

  console.warn(`${LOG_PREFIX} ${timestamp} ${message}`, metadata);
}

function isErrnoWithCode(value: unknown): value is NodeJS.ErrnoException {
  return typeof value === 'object' && value !== null && 'code' in value;
}

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
  const normalized = model.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return !(
    normalized.startsWith('o1') ||
    normalized.startsWith('o3') ||
    normalized.startsWith('o4')
  );
}

type Mode = keyof typeof MODE_FILES;

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

type PromptFile = {
  response_format: any;
  messages: PromptMessage[];
};

type TaskPayload = {
  user_id: string;
  tasks_group_id: string;
  tasks: Array<{
    task: string;
    pillar_code: string;
    trait_code: string;
    stat_code: string;
    difficulty_code: string;
    friction_score: number;
    friction_tier: string;
  }>;
};

type CLIOptions = {
  user?: string;
  all?: boolean;
  limit?: number;
  mode?: Mode;
};

function parseArgs(argv: string[]): CLIOptions {
  log('Parsing CLI arguments', { argv });
  const options: CLIOptions = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    switch (arg) {
      case '--user': {
        const value = argv[i + 1];
        if (!value) {
          throw new Error('Missing value for --user');
        }
        options.user = value;
        i += 1;
        break;
      }
      case '--all': {
        options.all = true;
        break;
      }
      case '--limit': {
        const value = argv[i + 1];
        if (!value) {
          throw new Error('Missing value for --limit');
        }
        const parsed = Number.parseInt(value, 10);
        if (Number.isNaN(parsed) || parsed <= 0) {
          throw new Error('Invalid value for --limit. Must be a positive integer.');
        }
        options.limit = parsed;
        i += 1;
        break;
      }
      case '--mode': {
        const value = argv[i + 1]?.toLowerCase();
        if (!value) {
          throw new Error('Missing value for --mode');
        }
        if (!isMode(value)) {
          throw new Error(`Invalid mode: ${value}. Expected one of: ${Object.keys(MODE_FILES).join(', ')}`);
        }
        options.mode = value;
        i += 1;
        break;
      }
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.all && !options.user) {
    throw new Error('You must provide --user <id> or --all');
  }

  if (options.user && options.all) {
    console.warn('Both --user and --all provided. Processing all users.');
  }

  if (options.limit && !options.all) {
    console.warn('--limit is ignored without --all');
  }

  log('Finished parsing CLI arguments', options);
  return options;
}

function isMode(value: string): value is Mode {
  return value in MODE_FILES;
}

async function tryLoadSnapshot(pathCandidate: string): Promise<SnapshotData | undefined> {
  const resolvedPath = path.resolve(pathCandidate);
  try {
    log('Loading snapshot file', { path: resolvedPath });
    const raw = await fs.readFile(resolvedPath, 'utf8');
    const data = JSON.parse(raw);
    if (!data.samples) {
      throw new Error('Snapshot file missing `samples` key.');
    }
    const snapshot = data.samples as SnapshotData;
    log('Snapshot loaded', {
      path: resolvedPath,
      users: snapshot.users?.length ?? 0,
      gameModes: snapshot.cat_game_mode?.length ?? 0,
      pillars: snapshot.cat_pillar?.length ?? 0,
      traits: snapshot.cat_trait?.length ?? 0,
      difficulties: snapshot.cat_difficulty?.length ?? 0,
      onboardingSessions: snapshot.onboarding_session?.length ?? 0,
    });
    return snapshot;
  } catch (error) {
    if (isErrnoWithCode(error) && error.code === 'ENOENT') {
      logWarn('Snapshot file not found', { path: resolvedPath });
      return undefined;
    }
    throw error;
  }
}

async function loadSnapshot(): Promise<SnapshotData> {
  const candidates = [PRIMARY_SNAPSHOT_PATH];
  if (PRIMARY_SNAPSHOT_PATH !== SNAPSHOT_FALLBACK_PATH) {
    candidates.push(SNAPSHOT_FALLBACK_PATH);
  }

  const triedPaths = new Set<string>();

  for (const candidate of candidates) {
    const resolvedCandidate = path.resolve(candidate);
    if (triedPaths.has(resolvedCandidate)) {
      continue;
    }
    triedPaths.add(resolvedCandidate);

    const snapshot = await tryLoadSnapshot(resolvedCandidate);
    if (snapshot) {
      if (resolvedCandidate !== path.resolve(PRIMARY_SNAPSHOT_PATH)) {
        logWarn('Using fallback snapshot file', { path: resolvedCandidate });
      }
      return snapshot;
    }
  }

  const triedList = Array.from(triedPaths).join(', ');
  throw new Error(
    `Snapshot file not found. Tried paths: ${triedList}. Generate one with "pnpm --filter api run db:snapshot" or set DB_SNAPSHOT_PATH.`,
  );
}

function normalisePrompt(raw: string): PromptFile {
  const normalised = raw.replace(/\$1([\s\S]*?)\$2,/m, (_, systemBlock: string) => {
    const trimmed = systemBlock.trim();
    const jsonValue = JSON.stringify(trimmed);
    return `"system": ${jsonValue},`;
  });

  const parsed = JSON.parse(normalised);

  const messages: PromptMessage[] = [];
  for (const entry of parsed.messages as Array<Record<string, unknown>>) {
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

async function loadPrompt(mode: Mode): Promise<PromptFile> {
  const promptPath = path.resolve(PROMPTS_DIR, MODE_FILES[mode]);
  log('Loading prompt file', { mode, promptPath });
  const raw = await fs.readFile(promptPath, 'utf8');
  const prompt = normalisePrompt(raw);
  log('Prompt file loaded', { mode, messageCount: prompt.messages.length });
  return prompt;
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

  const catalogPillars = pillars
    .map((p) => `${p.code}${p.name ? ` (${p.name})` : ''}`)
    .join(', ');

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

  const result = {
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

  log('Catalog data prepared', {
    pillars: pillars.length,
    traits: traits.length,
    stats: stats.length,
    difficulties: difficulties.length,
  });

  return result;
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

async function ensureExportsDir() {
  log('Ensuring exports directory exists', { path: EXPORTS_DIR });
  await fs.mkdir(EXPORTS_DIR, { recursive: true });
}

async function writeExports(basePath: string, payload: TaskPayload) {
  log('Writing export files', { basePath, taskCount: payload.tasks.length });
  const jsonPath = `${basePath}.json`;
  const jsonlPath = `${basePath}.jsonl`;
  const csvPath = `${basePath}.csv`;

  await fs.writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  const lines = payload.tasks.map((task) => JSON.stringify({
    user_id: payload.user_id,
    tasks_group_id: payload.tasks_group_id,
    ...task,
  }));
  await fs.writeFile(jsonlPath, `${lines.join('\n')}\n`, 'utf8');

  const csvHeader = 'user_id,tasks_group_id,task,pillar_code,trait_code,stat_code,difficulty_code,friction_score,friction_tier';
  const csvRows = payload.tasks.map((task) => [
    payload.user_id,
    payload.tasks_group_id,
    task.task,
    task.pillar_code,
    task.trait_code,
    task.stat_code,
    task.difficulty_code,
    task.friction_score.toString(),
    task.friction_tier,
  ].map((value) => `"${value.replace(/"/g, '""')}"`).join(','));
  await fs.writeFile(csvPath, [csvHeader, ...csvRows].join('\n') + '\n', 'utf8');
}

async function writeRawResponse(basePath: string, raw: string) {
  log('Writing raw response', { basePath, length: raw.length });
  const rawPath = `${basePath}.raw_response.txt`;
  await fs.writeFile(rawPath, `${raw}\n`, 'utf8');
}

async function appendErrorLog(message: string) {
  log('Appending to error log', message);
  const logPath = path.join(EXPORTS_DIR, 'errors.log');
  const timestamp = new Date().toISOString();
  await fs.appendFile(logPath, `[${timestamp}] ${message}\n`, 'utf8');
}

function validatePayload(
  payload: TaskPayload,
  schema: any,
  catalogs: ReturnType<typeof buildCatalogStrings>,
  placeholders: Record<string, string>,
): { ok: true } | { ok: false; message: string } {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const valid = validate(payload);
  if (!valid) {
    const errors = (validate.errors ?? []).map((err) => `${err.instancePath} ${err.message}`).join('; ');
    return { ok: false, message: `Schema validation failed: ${errors}` };
  }

  const expectedUserId = placeholders.USER_ID;
  if (payload.user_id !== expectedUserId) {
    return { ok: false, message: `user_id mismatch. Expected ${expectedUserId}, got ${payload.user_id}` };
  }
  const expectedGroupId = placeholders.TASKS_GROUP_ID;
  if (expectedGroupId !== 'N/A' && payload.tasks_group_id !== expectedGroupId) {
    return { ok: false, message: `tasks_group_id mismatch. Expected ${expectedGroupId}, got ${payload.tasks_group_id}` };
  }

  if (!Array.isArray(payload.tasks) || payload.tasks.length < 15 || payload.tasks.length > 32) {
    return { ok: false, message: `Expected 15-32 tasks, received ${payload.tasks.length}` };
  }

  const seenTasks = new Set<string>();
  for (const task of payload.tasks) {
    const normalizedTask = task.task.trim().toLowerCase();
    if (seenTasks.has(normalizedTask)) {
      return { ok: false, message: `Duplicate task detected: ${task.task}` };
    }
    seenTasks.add(normalizedTask);

    if (!catalogs.pillarCodes.has(task.pillar_code)) {
      return { ok: false, message: `Invalid pillar_code: ${task.pillar_code}` };
    }
    const trait = catalogs.traitsByCode.get(task.trait_code);
    if (!trait) {
      return { ok: false, message: `Invalid trait_code: ${task.trait_code}` };
    }
    const pillarForTrait = catalogs.pillarById.get(trait.pillar_id)?.code;
    if (pillarForTrait && pillarForTrait !== task.pillar_code) {
      return { ok: false, message: `Trait ${task.trait_code} does not belong to pillar ${task.pillar_code}` };
    }
    if (!catalogs.statCodes.has(task.stat_code)) {
      return { ok: false, message: `Invalid stat_code: ${task.stat_code}` };
    }
    if (!catalogs.difficultyCodes.has(task.difficulty_code)) {
      return { ok: false, message: `Invalid difficulty_code: ${task.difficulty_code}` };
    }
  }

  return { ok: true };
}

async function runForUser(
  client: OpenAI,
  snapshot: SnapshotData,
  user: UserRow,
  mode: Mode,
  overrideGameMode?: GameModeRow,
) {
  log('Preparing task generation for user', {
    userId: user.user_id,
    mode,
    overrideMode: overrideGameMode?.code ?? null,
  });
  const gameModes = snapshot.cat_game_mode ?? [];
  const gameModeById = new Map(gameModes.map((gm) => [gm.game_mode_id, gm]));
  const onboardingSessions = snapshot.onboarding_session ?? [];
  const onboarding = onboardingSessions.find((s) => s.user_id === user.user_id);

  const resolvedGameMode = overrideGameMode
    ?? (user.game_mode_id ? gameModeById.get(user.game_mode_id) : undefined)
    ?? (onboarding?.game_mode_id ? gameModeById.get(onboarding.game_mode_id) : undefined);

  const catalogs = buildCatalogStrings(snapshot);
  const prompt = await loadPrompt(mode);
  const placeholders = buildPlaceholders({ user, onboarding, gameMode: resolvedGameMode, catalogs });

  const messages = buildMessages(prompt, placeholders);

  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  const temperature = MODE_TEMPERATURE[mode];

  log('Sending request to OpenAI', {
    userId: user.user_id,
    mode,
    messageCount: messages.length,
    temperature: modelSupportsTemperature(model) ? temperature : null,
    model,
  });
  const requestBody: ResponseCreateParamsNonStreaming = {
    model,
    input: messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  };

  if (modelSupportsTemperature(model)) {
    requestBody.temperature = temperature;
  } else {
    log('Skipping temperature parameter for model', { model, mode });
  }

  requestBody.text = {
    format: prompt.response_format,
  };

  const response = await client.responses.create(requestBody);

  const basePath = path.join(EXPORTS_DIR, `${user.user_id}.${mode}`);

  const outputText = response.output_text ?? '';

  log('Received response from OpenAI', {
    userId: user.user_id,
    mode,
    outputLength: outputText.length,
    model,
  });

  let payload: TaskPayload | undefined;

  try {
    payload = JSON.parse(outputText) as TaskPayload;
  } catch (error) {
    await writeRawResponse(basePath, outputText);
    const reason = error instanceof Error ? error.message : 'Unknown JSON parse error';
    await appendErrorLog(`user=${user.user_id} mode=${mode} parse_error=${reason}`);
    throw new Error(`Failed to parse JSON response for user ${user.user_id}: ${reason}`);
  }

  const validation = validatePayload(payload, prompt.response_format?.json_schema?.schema, catalogs, placeholders);
  if (!validation.ok) {
    await writeRawResponse(basePath, outputText);
    await appendErrorLog(`user=${user.user_id} mode=${mode} validation_error=${validation.message}`);
    throw new Error(`Validation failed for user ${user.user_id}: ${validation.message}`);
  }

  await writeExports(basePath, payload);
  log('Task payload validated successfully', {
    userId: user.user_id,
    mode,
    tasks: payload.tasks.length,
  });
  console.log(`Exported tasks for user ${user.user_id} (${mode}) to ${basePath}.{json,jsonl,csv}`);
}

async function main() {
  try {
    log('Task generation CLI started');
    const options = parseArgs(process.argv.slice(2));

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set. Aborting.');
    }
    log('OPENAI_API_KEY detected');

    const snapshot = await loadSnapshot();

    const users = snapshot.users ?? [];
    if (!users.length) {
      throw new Error('No users found in snapshot.');
    }
    log('Users loaded from snapshot', { count: users.length });

    const gameModes = snapshot.cat_game_mode ?? [];
    const modeByCode = new Map(gameModes.map((gm) => [gm.code.toLowerCase(), gm]));
    log('Game modes index created', { available: gameModes.length });

    const client = new OpenAI({ apiKey });
    log('OpenAI client initialised', { model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL });

    await ensureExportsDir();

    const targetUsers = options.all ? users : users.filter((u) => u.user_id === options.user);

    if (!targetUsers.length) {
      throw new Error(options.all ? 'No users available to process.' : `User not found: ${options.user}`);
    }
    log('Target users resolved', {
      requestedAll: Boolean(options.all),
      requestedUser: options.user ?? null,
      targetCount: targetUsers.length,
    });

    const limit = options.all && options.limit ? options.limit : targetUsers.length;
    log('Processing limit determined', { limit });

    let exitWithError = false;

    for (const user of targetUsers.slice(0, limit)) {
      const mode = options.mode ?? (() => {
        const gm = user.game_mode_id ? gameModes.find((g) => g.game_mode_id === user.game_mode_id) : undefined;
        return gm?.code?.toLowerCase() as Mode | undefined;
      })();

      if (!mode || !isMode(mode)) {
        logError('Skipping user due to unresolved game mode', { userId: user.user_id, rawMode: user.game_mode_id });
        exitWithError = true;
        continue;
      }

      const overrideGameMode = options.mode ? modeByCode.get(options.mode) : undefined;

      try {
        await runForUser(client, snapshot, user, mode, overrideGameMode);
      } catch (error) {
        exitWithError = true;
        logError('Error while generating tasks for user', {
          userId: user.user_id,
          mode,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (exitWithError) {
      process.exitCode = 1;
      logError('Finished with errors. Exit code set to 1.');
    } else {
      log('Task generation completed successfully');
    }
  } catch (error) {
    logError('Fatal error in task generation CLI', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

void main();
