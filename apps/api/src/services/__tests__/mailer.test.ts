import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { GmailClient } from '../mailer';

const sendSpy = vi.fn();
const gmailFactorySpy = vi.fn(() => ({
  users: {
    messages: {
      send: sendSpy,
    },
  },
}));
const setCredentialsSpy = vi.fn();

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: class {
        setCredentials = setCredentialsSpy;
        constructor() {}
      },
    },
    gmail: gmailFactorySpy,
  },
}));

describe('GmailClient', () => {
  beforeEach(() => {
    sendSpy.mockReset();
    gmailFactorySpy.mockClear();
    setCredentialsSpy.mockReset();
  });

  it('sends multi-part messages through gmail.users.messages.send', async () => {
    const { GmailClient } = await import('../mailer/gmailClient');
    const client = new GmailClient({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      refreshToken: 'refresh-token',
      sender: 'Innerbloom <selfimgames@gmail.com>',
    });

    await client.sendMessage({
      to: 'agent@example.com',
      subject: 'Recordatorio',
      html: '<p>HTML</p>',
      text: 'Texto plano',
      replyTo: 'ops@example.com',
    });

    expect(gmailFactorySpy).toHaveBeenCalledWith({ version: 'v1', auth: expect.anything() });
    expect(setCredentialsSpy).toHaveBeenCalledWith({ refresh_token: 'refresh-token' });
    expect(sendSpy).toHaveBeenCalledTimes(1);

    const [[sendParams]] = sendSpy.mock.calls as [[{ requestBody?: { raw?: string } }]];
    const { requestBody } = sendParams;
    const raw = requestBody?.raw ?? '';
    const decoded = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');

    expect(decoded).toContain('Reply-To: ops@example.com');
    expect(decoded).toContain('Content-Type: multipart/alternative');
    expect(decoded).toContain('<p>HTML</p>');
    expect(decoded).toContain('Texto plano');
  });
});

describe('MailerService', () => {
  it('renders the reminder template and delegates to the Gmail client', async () => {
    const { createMailerService, DAILY_QUEST_REMINDER_SUBJECT } = await import('../mailer');
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const mailer = createMailerService({
      gmailClient: { sendMessage } as unknown as GmailClient,
      defaultReplyTo: 'focus@innerbloom.ai',
    });

    await mailer.sendDailyQuestReminder({
      to: 'agent@example.com',
      ctaUrl: 'https://app.innerbloom.ai/daily-quest',
      displayName: 'Rama GPT',
      highlightValue: '12 días',
    });

    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [[payload]] = sendMessage.mock.calls as [[{
      subject: string;
      replyTo?: string;
      html?: string;
      text?: string;
    }]];
    expect(payload.subject).toBe(DAILY_QUEST_REMINDER_SUBJECT);
    expect(payload.replyTo).toBe('focus@innerbloom.ai');
    expect(payload.html).toContain('Rama');
    expect(payload.html).toContain('https://app.innerbloom.ai/daily-quest');
    expect(payload.text).toContain('https://app.innerbloom.ai/daily-quest');
  });
});
