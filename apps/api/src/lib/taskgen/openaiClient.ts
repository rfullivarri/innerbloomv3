import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import OpenAI from 'openai';
import type { ResponseCreateParamsNonStreaming } from 'openai/resources/responses/responses';
import { Agent as UndiciAgent } from 'undici';

type LogFunction = (message: string, metadata?: Record<string, unknown>) => void;

type Logger = {
  info: LogFunction;
  warn: LogFunction;
  error: LogFunction;
};

export type OpenAiRequestOptions = {
  apiKey: string;
  requestBody: ResponseCreateParamsNonStreaming;
  timeoutMs: number;
  maxAttempts: number;
  baseDelayMs: number;
  jitterMs: number;
  logger: Logger;
  logContext?: Record<string, unknown>;
};

export type OpenAiRequestSuccess = {
  ok: true;
  response: Awaited<ReturnType<OpenAI['responses']['create']>>;
  durationMs: number;
  attempts: number;
  requestId: string;
};

export type OpenAiRequestFailure = {
  ok: false;
  error: unknown;
  durationMs: number;
  attempts: number;
  abortedByTimeout: boolean;
  requestId: string;
  reason: string;
};

const KEEP_ALIVE_AGENT = new UndiciAgent({ keepAliveTimeout: 10_000, keepAliveTimeoutThreshold: 5_000 });

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

const keepAliveFetch: typeof fetch = (input: FetchInput, init?: FetchInit) => {
  const options = { ...(init ?? {}), dispatcher: KEEP_ALIVE_AGENT } as FetchInit & { dispatcher?: unknown };
  return fetch(input, options);
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch (serializationError) {
    void serializationError;
    return 'Unknown error';
  }
}

function getStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  if ('status' in error && typeof (error as { status?: unknown }).status === 'number') {
    return (error as { status: number }).status;
  }
  if ('statusCode' in error && typeof (error as { statusCode?: unknown }).statusCode === 'number') {
    return (error as { statusCode: number }).statusCode;
  }
  return undefined;
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  if ('code' in error && typeof (error as { code?: unknown }).code === 'string') {
    return (error as { code: string }).code;
  }
  return undefined;
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }
  if (error instanceof Error) {
    return error.name === 'AbortError';
  }
  return false;
}

function isTimeoutLikeError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  if (message.includes('timeout')) {
    return true;
  }
  if (message.includes('timed out')) {
    return true;
  }
  if (message.includes('aborted')) {
    return true;
  }
  const code = getErrorCode(error);
  if (code && ['etimedout', 'econnreset', 'sockethangup'].includes(code.toLowerCase())) {
    return true;
  }
  const status = getStatusCode(error);
  if (status && (status === 408 || status === 499)) {
    return true;
  }
  return isAbortError(error);
}

function isTransientError(error: unknown): boolean {
  if (isTimeoutLikeError(error)) {
    return true;
  }
  const status = getStatusCode(error);
  if (typeof status === 'number') {
    if (status === 429) {
      return true;
    }
    if (status >= 500 && status < 600) {
      return true;
    }
  }
  const code = getErrorCode(error);
  if (code && ['econnreset', 'enotfound', 'etimedout', 'sockethangup'].includes(code.toLowerCase())) {
    return true;
  }
  return false;
}

function buildAttemptMetadata(
  requestId: string,
  attempt: number,
  tStart: number,
  tEnd: number,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    request_id: requestId,
    attempt,
    t_start: new Date(tStart).toISOString(),
    t_end: new Date(tEnd).toISOString(),
    latency_ms: tEnd - tStart,
    ...extra,
  };
}

function computeBackoffDelay(attempt: number, baseDelayMs: number, jitterMs: number): number {
  const exponential = baseDelayMs * Math.max(1, 2 ** (attempt - 1));
  const jitter = jitterMs > 0 ? Math.floor(Math.random() * (jitterMs + 1)) : 0;
  return exponential + jitter;
}

export async function callOpenAiWithRetry(
  options: OpenAiRequestOptions,
): Promise<OpenAiRequestSuccess | OpenAiRequestFailure> {
  const { apiKey, requestBody, timeoutMs, maxAttempts, baseDelayMs, jitterMs, logger, logContext } = options;

  const client = new OpenAI({ apiKey, fetch: keepAliveFetch });
  const requestId = randomUUID();
  const attempts = Math.max(1, maxAttempts);
  let attempt = 0;
  let lastError: unknown = undefined;
  let lastDuration = 0;
  let abortedByTimeout = false;

  while (attempt < attempts) {
    attempt += 1;
    const startedAt = Date.now();
    logger.info('OpenAI attempt started', {
      request_id: requestId,
      attempt,
      ...(logContext ?? {}),
      t_start: new Date(startedAt).toISOString(),
    });

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await client.responses.create(requestBody, { signal: controller.signal });
      const finishedAt = Date.now();
      lastDuration = finishedAt - startedAt;
      logger.info('OpenAI attempt succeeded', {
        ...buildAttemptMetadata(requestId, attempt, startedAt, finishedAt, logContext),
      });
      return {
        ok: true,
        response,
        durationMs: lastDuration,
        attempts: attempt,
        requestId,
      };
    } catch (error) {
      const finishedAt = Date.now();
      lastDuration = finishedAt - startedAt;
      const reason = getErrorMessage(error);
      const metadata = buildAttemptMetadata(requestId, attempt, startedAt, finishedAt, {
        ...(logContext ?? {}),
        reason,
      });
      lastError = error;
      abortedByTimeout = abortedByTimeout || isTimeoutLikeError(error);
      if (isTimeoutLikeError(error)) {
        logger.warn('OpenAI attempt aborted or timed out', metadata);
      } else {
        logger.error('OpenAI attempt failed', metadata);
      }

      if (attempt >= attempts || !isTransientError(error)) {
        return {
          ok: false,
          error,
          durationMs: lastDuration,
          attempts: attempt,
          abortedByTimeout,
          requestId,
          reason,
        };
      }

      const backoffDelay = computeBackoffDelay(attempt, baseDelayMs, jitterMs);
      logger.warn('Retrying OpenAI attempt', {
        request_id: requestId,
        attempt,
        next_delay_ms: backoffDelay,
        ...(logContext ?? {}),
      });
      await delay(backoffDelay);
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  return {
    ok: false,
    error: lastError,
    durationMs: lastDuration,
    attempts,
    abortedByTimeout,
    requestId,
    reason: getErrorMessage(lastError),
  };
}
function parseInteger(value: string | undefined, fallback: number, options?: { min?: number; max?: number }): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  if (options?.min !== undefined && parsed < options.min) {
    return options.min;
  }
  if (options?.max !== undefined && parsed > options.max) {
    return options.max;
  }
  return parsed;
}

export function resolveOpenAiRequestConfigFromEnv(): Pick<
  OpenAiRequestOptions,
  'timeoutMs' | 'maxAttempts' | 'baseDelayMs' | 'jitterMs'
> {
  const timeoutMs = parseInteger(process.env.TASKGEN_OPENAI_TIMEOUT, 150_000, { min: 1 });
  const maxAttempts = parseInteger(process.env.TASKGEN_OPENAI_MAX_ATTEMPTS, 3, { min: 1, max: 5 });
  const baseDelayMs = parseInteger(process.env.TASKGEN_OPENAI_RETRY_BASE_DELAY, 2_000, { min: 0 });
  const jitterMs = parseInteger(process.env.TASKGEN_OPENAI_RETRY_JITTER, 1_000, { min: 0 });
  return { timeoutMs, maxAttempts, baseDelayMs, jitterMs };
}
