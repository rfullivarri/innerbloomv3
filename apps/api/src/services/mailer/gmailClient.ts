import { gmail_v1, google } from 'googleapis';

type GmailClientOptions = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  sender: string;
};

type SendMessagePayload = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
};

const base64UrlEncode = (input: string) =>
  Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const buildMimeMessage = ({
  from,
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}) => {
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
  ];

  if (replyTo) {
    headers.push(`Reply-To: ${replyTo}`);
  }

  const boundary = 'innerbloom-boundary';
  const parts: string[] = [];

  if (html && text) {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    parts.push(
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      text,
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      '',
      html,
      `--${boundary}--`
    );
  } else if (html) {
    headers.push('Content-Type: text/html; charset="UTF-8"');
    parts.push(html);
  } else if (text) {
    headers.push('Content-Type: text/plain; charset="UTF-8"');
    parts.push(text);
  } else {
    throw new Error('GmailClient.sendMessage requires at least html or text content.');
  }

  return `${headers.join('\r\n')}\r\n\r\n${parts.join('\r\n')}`;
};

export class GmailClient {
  private gmail: gmail_v1.Gmail;
  private sender: string;

  constructor(options: GmailClientOptions) {
    const oauth2Client = new google.auth.OAuth2(options.clientId, options.clientSecret);
    oauth2Client.setCredentials({ refresh_token: options.refreshToken });

    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    this.sender = options.sender;
  }

  async sendMessage(payload: SendMessagePayload) {
    const rawMime = buildMimeMessage({
      from: this.sender,
      ...payload,
    });

    const response = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: base64UrlEncode(rawMime),
      },
    });

    return response?.data;
  }
}

export type { GmailClientOptions, SendMessagePayload };
