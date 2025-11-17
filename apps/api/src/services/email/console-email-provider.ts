import type { EmailMessage, EmailProvider } from './email-provider.js';

export class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage): Promise<void> {
    const payload = {
      scope: 'email.console',
      to: message.to,
      subject: message.subject,
      from: message.from ?? null,
    };

    console.info(payload, 'Email delivery skipped (console provider)');
  }
}
