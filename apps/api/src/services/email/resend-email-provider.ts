import { Resend } from 'resend';
import type { EmailMessage, EmailProvider } from './email-provider.js';

export type ResendEmailProviderOptions = {
  apiKey: string;
  defaultFrom: string;
  client?: Resend;
};

export class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend;

  private readonly defaultFrom: string;

  constructor(options: ResendEmailProviderOptions) {
    this.client = options.client ?? new Resend(options.apiKey);
    this.defaultFrom = options.defaultFrom;
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    const { error } = await this.client.emails.send({
      from: message.from ?? this.defaultFrom,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (error) {
      throw new Error(`Failed to send email via Resend: ${error.message}`);
    }
  }
}
