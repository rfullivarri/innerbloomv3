import { Resend } from 'resend';
import type { ErrorResponse } from 'resend';
import type { EmailMessage, EmailProvider } from './email-provider.js';

export type ResendEmailProviderOptions = {
  apiKey: string;
  defaultFrom: string;
  client?: Resend;
  sleep?: (ms: number) => Promise<void>;
};

export class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend;

  private readonly defaultFrom: string;

  private readonly sleep: (ms: number) => Promise<void>;

  private readonly maxAttempts: number;

  constructor(options: ResendEmailProviderOptions) {
    this.client = options.client ?? new Resend(options.apiKey);
    this.defaultFrom = options.defaultFrom;
    this.sleep = options.sleep ?? defaultSleep;
    this.maxAttempts = 3;
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    let attempt = 0;
    let lastError: ErrorResponse | null = null;

    while (attempt < this.maxAttempts) {
      attempt += 1;
      const result = await this.client.emails.send({
        from: message.from ?? this.defaultFrom,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });

      if (!result.error) {
        return;
      }

      lastError = result.error;

      if (!isRetryableError(result.error) || attempt === this.maxAttempts) {
        throw new Error(formatResendError(result.error));
      }

      const delay = getBackoffDelay(attempt);
      await this.sleep(delay);
    }

    if (lastError) {
      throw new Error(formatResendError(lastError));
    }
  }
}

function isRetryableError(error: ErrorResponse): boolean {
  if (!error) {
    return false;
  }

  if (error.statusCode === 429) {
    return true;
  }

  if (typeof error.statusCode === 'number' && error.statusCode >= 500) {
    return true;
  }

  return false;
}

function formatResendError(error: ErrorResponse): string {
  const details: string[] = [error.message];

  if (typeof error.statusCode === 'number') {
    details.push(`status=${error.statusCode}`);
  }

  if (error.name) {
    details.push(`code=${error.name}`);
  }

  if (isTestModeRestriction(error)) {
    details.push(
      'hint=Resend only allows sending to your account email in test mode. Verify a domain at https://resend.com/domains and set EMAIL_FROM to use that domain, or switch EMAIL_PROVIDER_NAME=console while testing.',
    );
  }

  return `Failed to send email via Resend: ${details.join(' | ')}`;
}

function isTestModeRestriction(error: ErrorResponse): boolean {
  return (
    error.statusCode === 403 &&
    typeof error.name === 'string' &&
    error.name.toLowerCase() === 'validation_error' &&
    typeof error.message === 'string' &&
    error.message.toLowerCase().includes('testing emails')
  );
}

function getBackoffDelay(attempt: number): number {
  const base = 250;
  return base * 2 ** Math.max(0, attempt - 1);
}

function defaultSleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
