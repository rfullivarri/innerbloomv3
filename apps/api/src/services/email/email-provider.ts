export type EmailRecipient = string | string[];

export type EmailMessage = {
  to: EmailRecipient;
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

export interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<void>;
}
