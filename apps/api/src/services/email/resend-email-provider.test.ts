import { describe, expect, it, vi } from 'vitest';
import type { ErrorResponse, Resend } from 'resend';
import { ResendEmailProvider } from './resend-email-provider.js';
import type { EmailMessage } from './email-provider.js';

type SendResult = Awaited<ReturnType<Resend['emails']['send']>>;

type SendMock = ReturnType<typeof vi.fn<[], Promise<SendResult>>>;

const baseMessage: EmailMessage = {
  to: 'user@example.com',
  subject: 'Hola',
  html: '<p>Hola</p>',
  text: 'Hola',
};

function createClient(sendMock: SendMock): Resend {
  return {
    emails: {
      send: sendMock,
    },
  } as unknown as Resend;
}

function createError(statusCode: number, message = 'boom'): ErrorResponse {
  return {
    message,
    statusCode,
    name: 'application_error',
  };
}

function buildErrorResult(error: ErrorResponse): SendResult {
  return {
    data: null,
    error,
    headers: null,
  } as SendResult;
}

function buildSuccessResult(): SendResult {
  return {
    data: { id: 'email_123' } as never,
    error: null,
    headers: null,
  } as SendResult;
}

describe('ResendEmailProvider', () => {
  it('retries transient errors before succeeding', async () => {
    const sendMock = vi
      .fn<[], Promise<SendResult>>()
      .mockResolvedValueOnce(buildErrorResult(createError(500, 'Internal error')))
      .mockResolvedValueOnce(buildSuccessResult());

    const provider = new ResendEmailProvider({
      apiKey: 'test',
      defaultFrom: 'Innerbloom <daily@example.com>',
      client: createClient(sendMock),
      sleep: async () => {},
    });

    await provider.sendEmail(baseMessage);

    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('stops retrying for non-retryable errors', async () => {
    const sendMock = vi.fn<[], Promise<SendResult>>().mockResolvedValueOnce(
      buildErrorResult(createError(400, 'Bad Request')),
    );

    const provider = new ResendEmailProvider({
      apiKey: 'test',
      defaultFrom: 'Innerbloom <daily@example.com>',
      client: createClient(sendMock),
      sleep: async () => {},
    });

    await expect(provider.sendEmail(baseMessage)).rejects.toThrow(/Bad Request/);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting retry attempts', async () => {
    const sendMock = vi
      .fn<[], Promise<SendResult>>()
      .mockResolvedValue(buildErrorResult(createError(500, 'Internal error')));

    const provider = new ResendEmailProvider({
      apiKey: 'test',
      defaultFrom: 'Innerbloom <daily@example.com>',
      client: createClient(sendMock),
      sleep: async () => {},
    });

    await expect(provider.sendEmail(baseMessage)).rejects.toThrow(/Internal error/);
    expect(sendMock).toHaveBeenCalledTimes(3);
  });
});
