import { promises as fs } from 'fs';
import path from 'path';
import process from 'process';
import Ajv from 'ajv';
import OpenAI from 'openai';

const EXPORTS_DIR = path.resolve('exports');
const SNAPSHOT_PATH = path.resolve('apps/api/db-snapshot.json');

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

const DEFAULT_MODEL = 'gpt-4.1-mini';

type Mode = keyof typeof MODE_FILES;

type SnapshotTable<T> = T[] | undefined;

type UserRow = {
  user_id: string;
  full_name?: string | null;
  game_mode_id?: number | null;
  tasks_group_id?: string | null;
  preferred_language?: string | null;
  preferred_timezone?: string | null;
  timezone?: string | null;
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
  session_id?: string;
  user_id?: string;
  game_mode_id?: number | null;
  meta?: unknown;
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

  return options;
}

function isMode(value: string): value is Mode {
  return value in MODE_FILES;
}

async function loadSnapshot(): Promise<SnapshotData> {
  const raw = await fs.readFile(SNAPSHOT_PATH, 'utf8');
  const data = JSON.parse(raw);
  if (!data.samples) {
    throw new Error('Snapshot file missing `samples` key.');
  }
  return data.samples as SnapshotData;
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
  const promptPath = path.resolve('prompts', MODE_FILES[mode]);
  const raw = await fs.readFile(promptPath, 'utf8');
  return normalisePrompt(raw);
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

function buildUserMiniProfile(user: UserRow, onboarding: OnboardingSessionRow | undefined, gameMode: GameModeRow | undefined) {
  const parts: string[] = [];
  if (user.full_name) {
    parts.push(`Name: ${user.full_name}`);
  }
  parts.push(`User ID: ${user.user_id}`);
  if (user.tasks_group_id) {
    parts.push(`Tasks Group: ${user.tasks_group_id}`);
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
  if (onboarding?.meta && typeof onboarding.meta === 'object') {
    parts.push(`Onboarding meta: ${JSON.stringify(onboarding.meta)}`);
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
  await fs.mkdir(EXPORTS_DIR, { recursive: true });
}

async function writeExports(basePath: string, payload: TaskPayload) {
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
  const rawPath = `${basePath}.raw_response.txt`;
  await fs.writeFile(rawPath, `${raw}\n`, 'utf8');
}

async function appendErrorLog(message: string) {
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

  const response = await client.responses.create({
    model: DEFAULT_MODEL,
    temperature: MODE_TEMPERATURE[mode],
    input: messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    text: {
      format: prompt.response_format,
    },
  });

  const basePath = path.join(EXPORTS_DIR, `${user.user_id}.${mode}`);

  const outputText = response.output_text ?? '';

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
  console.log(`Exported tasks for user ${user.user_id} (${mode}) to ${basePath}.{json,jsonl,csv}`);
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set. Aborting.');
    }

    const snapshot = await loadSnapshot();

    const users = snapshot.users ?? [];
    if (!users.length) {
      throw new Error('No users found in snapshot.');
    }

    const gameModes = snapshot.cat_game_mode ?? [];
    const modeByCode = new Map(gameModes.map((gm) => [gm.code.toLowerCase(), gm]));

    const client = new OpenAI({ apiKey });

    await ensureExportsDir();

    const targetUsers = options.all ? users : users.filter((u) => u.user_id === options.user);

    if (!targetUsers.length) {
      throw new Error(options.all ? 'No users available to process.' : `User not found: ${options.user}`);
    }

    const limit = options.all && options.limit ? options.limit : targetUsers.length;

    let exitWithError = false;

    for (const user of targetUsers.slice(0, limit)) {
      const mode = options.mode ?? (() => {
        const gm = user.game_mode_id ? gameModes.find((g) => g.game_mode_id === user.game_mode_id) : undefined;
        return gm?.code?.toLowerCase() as Mode | undefined;
      })();

      if (!mode || !isMode(mode)) {
        console.error(`Skipping user ${user.user_id}: unable to resolve game mode.`);
        exitWithError = true;
        continue;
      }

      const overrideGameMode = options.mode ? modeByCode.get(options.mode) : undefined;

      try {
        await runForUser(client, snapshot, user, mode, overrideGameMode);
      } catch (error) {
        exitWithError = true;
        console.error(error instanceof Error ? error.message : error);
      }
    }

    if (exitWithError) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

void main();
