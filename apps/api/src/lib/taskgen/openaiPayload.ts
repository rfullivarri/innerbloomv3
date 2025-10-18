import type { ResponseCreateParamsNonStreaming } from 'openai/resources/responses/responses';

const REASONING_PREFIXES = ['o1', 'o3', 'o4', 'gpt-5'];
const REASONING_KEYWORDS = ['reasoning'];

export const REASONING_SAMPLING_KEYS = [
  'temperature',
  'top_p',
  'presence_penalty',
  'frequency_penalty',
  'logprobs',
  'logit_bias',
] as const;

export type ReasoningSamplingKey = (typeof REASONING_SAMPLING_KEYS)[number];

function normalizeModelName(model: string | undefined): string {
  return (model ?? '').trim().toLowerCase();
}

export function isReasoningModel(model: string | undefined): boolean {
  const normalized = normalizeModelName(model);
  if (!normalized) {
    return false;
  }

  if (REASONING_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }

  return REASONING_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

type MutableRequest<T extends ResponseCreateParamsNonStreaming> = T & Record<string, unknown>;

export function sanitizeReasoningParameters<T extends ResponseCreateParamsNonStreaming>(
  requestBody: T,
  model: string | undefined,
): { body: T; removedKeys: ReasoningSamplingKey[] } {
  if (!isReasoningModel(model)) {
    return { body: requestBody, removedKeys: [] };
  }

  const mutable = { ...requestBody } as MutableRequest<T>;
  const removedKeys: ReasoningSamplingKey[] = [];

  for (const key of REASONING_SAMPLING_KEYS) {
    if (Object.prototype.hasOwnProperty.call(mutable, key)) {
      delete mutable[key];
      removedKeys.push(key);
    }
  }

  return { body: mutable as T, removedKeys };
}
