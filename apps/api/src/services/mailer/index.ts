import { GmailClient, type GmailClientOptions } from './gmailClient';
import {
  DAILY_QUEST_REMINDER_SUBJECT,
  type DailyQuestReminderTemplateParams,
  renderDailyQuestReminderHtml,
  renderDailyQuestReminderText,
} from './templates/dailyQuestReminder';

type MailerServiceOptions = {
  gmailClient?: GmailClient;
  gmailOptions?: GmailClientOptions;
  defaultReplyTo?: string;
};

type DailyQuestReminderPayload = DailyQuestReminderTemplateParams & {
  to: string;
  replyTo?: string;
};

export type MailerService = {
  sendDailyQuestReminder: (payload: DailyQuestReminderPayload) => Promise<void>;
};

export const createMailerService = (options: MailerServiceOptions): MailerService => {
  const client = options.gmailClient ?? (options.gmailOptions ? new GmailClient(options.gmailOptions) : undefined);

  if (!client) {
    throw new Error('MailerService requires gmailOptions or a pre-configured gmailClient');
  }

  return {
    async sendDailyQuestReminder(payload) {
      await client.sendMessage({
        to: payload.to,
        subject: DAILY_QUEST_REMINDER_SUBJECT,
        html: renderDailyQuestReminderHtml(payload),
        text: renderDailyQuestReminderText(payload),
        replyTo: payload.replyTo ?? options.defaultReplyTo,
      });
    },
  };
};

export type { GmailClientOptions, DailyQuestReminderTemplateParams };
export {
  GmailClient,
  DAILY_QUEST_REMINDER_SUBJECT,
  renderDailyQuestReminderHtml,
  renderDailyQuestReminderText,
};
