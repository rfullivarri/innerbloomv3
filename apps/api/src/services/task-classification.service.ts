import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Ajv, type AnySchema, type ErrorObject } from 'ajv';
import type {
  Response as OpenAIResponse,
  ResponseCreateParamsNonStreaming,
  ResponseFormatTextConfig,
} from 'openai/resources/responses/responses';
import { pool } from '../db.js';
import { HttpError } from '../lib/http-error.js';
import { isReasoningModel, sanitizeReasoningParameters } from '../lib/taskgen/openaiPayload.js';
import { callOpenAiWithRetry, resolveOpenAiRequestConfigFromEnv } from '../lib/taskgen/openaiClient.js';

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

type PillarRow = {
  pillar_id: number;
  code: string;
  name: string | null;
};

type TraitRow = {
  trait_id: number;
  pillar_id: number;
  code: string;
  name: string | null;
};

type ClassificationModelOutput = {
  pillar_code: string;
  trait_code: string;
  rationale?: string;
  confidence?: number;
};

export type TaskClassificationResult = {
  pillar_id: number;
  trait_id: number;
  pillar_code: string;
  pillar_name: string | null;
  trait_code: string;
  trait_name: string | null;
  rationale: string | null;
  confidence: number | null;
};

const LOG_PREFIX = '[task-classification]';
const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';

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

function logInfo(message: string, metadata?: Record<string, unknown>) {
  if (metadata) {
    console.info(LOG_PREFIX, message, metadata);
    return;
  }
  console.info(LOG_PREFIX, message);
}

function logWarn(message: string, metadata?: Record<string, unknown>) {
  if (metadata) {
    console.warn(LOG_PREFIX, message, metadata);
    return;
  }
  console.warn(LOG_PREFIX, message);
}

function logError(message: string, metadata?: Record<string, unknown>) {
  if (metadata) {
    console.error(LOG_PREFIX, message, metadata);
    return;
  }
  console.error(LOG_PREFIX, message);
}

function normalizePrompt(raw: string): PromptFile {
  const parsed = JSON.parse(raw) as { messages?: PromptMessage[]; response_format?: PromptResponseFormat };

  if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) {
    throw new Error('Invalid task classification prompt: missing messages');
  }

  return {
    response_format: parsed.response_format,
    messages: parsed.messages,
  };
}

async function loadPrompt(): Promise<PromptFile> {
  const candidates = PROMPTS_DIR_CANDIDATES.map((dir) => path.resolve(dir, 'task-classify.json'));
  for (const candidate of candidates) {
    try {
      const raw = await fs.readFile(candidate, 'utf8');
      return normalizePrompt(raw);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Task classification prompt not found. Checked: ${candidates.join(', ')}`);
}

function applyPlaceholders(template: string, placeholders: Record<string, string>): string {
  return template.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (fullMatch, key: string) => {
    return placeholders[key] ?? fullMatch;
  });
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

    return {
      type: 'json_schema',
      name: typeof jsonSchema.name === 'string' ? jsonSchema.name : 'TaskClassification',
      schema: jsonSchema.schema as Record<string, unknown>,
      strict: typeof jsonSchema.strict === 'boolean' ? jsonSchema.strict : undefined,
      description: typeof jsonSchema.description === 'string' ? jsonSchema.description : undefined,
    };
  }

  if (format.type === 'text') {
    return { type: 'text' };
  }

  if (format.type === 'json_object') {
    return { type: 'json_object' };
  }

  return undefined;
}

function extractJsonSchema(format: PromptResponseFormat | undefined): AnySchema | undefined {
  if (format?.type !== 'json_schema') {
    return undefined;
  }
  return format.json_schema?.schema;
}

function modelSupportsTemperature(model: string): boolean {
  return !isReasoningModel(model);
}

function validateOutputSchema(
  output: ClassificationModelOutput,
  schema: AnySchema | undefined,
): { valid: boolean; errors: string[] } {
  if (!schema) {
    return { valid: true, errors: [] };
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const valid = validate(output);

  if (valid) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: (validate.errors ?? []).map((err: ErrorObject) => `${err.instancePath} ${err.message ?? ''}`.trim()),
  };
}

function buildCatalogStrings(pillars: PillarRow[], traits: TraitRow[]): { pillars: string; traits: string } {
  const pillarsText = pillars
    .map((pillar) => `${pillar.code}: ${pillar.name ?? pillar.code}`)
    .join('\n');

  const pillarById = new Map(pillars.map((pillar) => [pillar.pillar_id, pillar] as const));
  const traitsText = traits
    .map((trait) => {
      const pillar = pillarById.get(trait.pillar_id);
      const pillarCode = pillar?.code ?? `pillar_${trait.pillar_id}`;
      return `${trait.code} (pillar=${pillarCode}): ${trait.name ?? trait.code}`;
    })
    .join('\n');

  return {
    pillars: pillarsText,
    traits: traitsText,
  };
}

export async function classifyTaskForUser(input: { userId: string; title: string }): Promise<TaskClassificationResult> {
  const [pillarsResult, traitsResult, prompt] = await Promise.all([
    pool.query<PillarRow>('SELECT pillar_id, code, name FROM cat_pillar ORDER BY pillar_id ASC'),
    pool.query<TraitRow>('SELECT trait_id, pillar_id, code, name FROM cat_trait ORDER BY trait_id ASC'),
    loadPrompt(),
  ]);

  const pillars = pillarsResult.rows;
  const traits = traitsResult.rows;

  if (pillars.length === 0 || traits.length === 0) {
    throw new HttpError(500, 'internal_error', 'Task classification catalogs are unavailable');
  }

  const catalogStrings = buildCatalogStrings(pillars, traits);
  const placeholders = {
    TASK_TITLE: input.title,
    CATALOG_PILLARS: catalogStrings.pillars,
    CATALOG_TRAITS: catalogStrings.traits,
  };

  const messages = prompt.messages.map((msg) => ({
    role: msg.role,
    content: applyPlaceholders(msg.content, placeholders),
  }));

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new HttpError(500, 'internal_error', 'OPENAI_API_KEY is not configured');
  }

  const requestBody: ResponseCreateParamsNonStreaming = {
    model: DEFAULT_MODEL,
    input: messages,
  };

  if (modelSupportsTemperature(DEFAULT_MODEL)) {
    requestBody.temperature = 0.2;
  }

  const responseFormat = buildResponseFormatConfig(prompt.response_format);
  if (responseFormat) {
    requestBody.text = { format: responseFormat };
  }

  const { body: sanitizedRequestBody, removedKeys } = sanitizeReasoningParameters(requestBody, requestBody.model);
  const { timeoutMs, maxAttempts, baseDelayMs, jitterMs } = resolveOpenAiRequestConfigFromEnv();

  logInfo('OPENAI_REQUEST', {
    model: requestBody.model,
    messageCount: messages.length,
    response_format: responseFormat?.type ?? null,
    filteredParams: removedKeys,
  });

  const openAiOutcome = await callOpenAiWithRetry({
    apiKey,
    requestBody: sanitizedRequestBody,
    timeoutMs,
    maxAttempts,
    baseDelayMs,
    jitterMs,
    logger: { info: logInfo, warn: logWarn, error: logError },
    logContext: {
      user_id: input.userId,
      feature: 'task_classification',
    },
  });

  if (!openAiOutcome.ok) {
    throw new HttpError(
      502,
      'upstream_error',
      `OpenAI task classification failed after ${openAiOutcome.attempts} attempts: ${openAiOutcome.reason}`,
    );
  }

  const raw = (openAiOutcome.response as OpenAIResponse).output_text ?? '';

  let parsed: ClassificationModelOutput;
  try {
    parsed = JSON.parse(raw) as ClassificationModelOutput;
  } catch {
    throw new HttpError(502, 'upstream_error', 'OpenAI returned invalid JSON for task classification');
  }

  const schemaValidation = validateOutputSchema(parsed, extractJsonSchema(prompt.response_format));
  if (!schemaValidation.valid) {
    throw new HttpError(502, 'upstream_error', 'OpenAI task classification failed schema validation', {
      errors: schemaValidation.errors,
    });
  }

  const pillarByCode = new Map(pillars.map((pillar) => [pillar.code, pillar] as const));
  const traitByCode = new Map(traits.map((trait) => [trait.code, trait] as const));

  const pillar = pillarByCode.get(parsed.pillar_code);
  const trait = traitByCode.get(parsed.trait_code);

  if (!pillar) {
    throw new HttpError(502, 'upstream_error', `OpenAI returned unknown pillar_code: ${parsed.pillar_code}`);
  }

  if (!trait) {
    throw new HttpError(502, 'upstream_error', `OpenAI returned unknown trait_code: ${parsed.trait_code}`);
  }

  if (trait.pillar_id !== pillar.pillar_id) {
    throw new HttpError(
      502,
      'upstream_error',
      `OpenAI returned trait_code ${parsed.trait_code} that does not belong to pillar_code ${parsed.pillar_code}`,
    );
  }

  return {
    pillar_id: pillar.pillar_id,
    trait_id: trait.trait_id,
    pillar_code: pillar.code,
    pillar_name: pillar.name,
    trait_code: trait.code,
    trait_name: trait.name,
    rationale: typeof parsed.rationale === 'string' ? parsed.rationale : null,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
  };
}
