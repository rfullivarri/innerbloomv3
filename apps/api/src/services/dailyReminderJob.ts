import { getEmailProvider } from './email/index.js';
import type { EmailMessage } from './email/index.js';
import {
  findPendingEmailReminders,
  markRemindersAsSent,
  type PendingEmailReminderRow,
} from '../repositories/user-daily-reminders.repository.js';
import {
  DEFAULT_FEEDBACK_DEFINITION,
  findFeedbackDefinitionByNotificationKey,
} from '../repositories/feedback-definitions.repository.js';

const DEFAULT_CTA_URL =
  process.env.DAILY_REMINDER_CTA_URL?.trim() || 'https://web-dev-dfa2.up.railway.app/dashboard-v3?daily-quest=open';
const REMINDER_NOTIFICATION_KEY = DEFAULT_FEEDBACK_DEFINITION.notificationKey;
const REMINDER_LOGO_URL =
  process.env.EMAIL_LOGO_URL?.trim() || 'https://web-dev-dfa2.up.railway.app/IB-COLOR-LOGO.png';

type ReminderTemplate = {
  copy: string;
  ctaLabel: string;
  ctaHref: string | null;
};

const FALLBACK_TEMPLATE: ReminderTemplate = {
  copy: DEFAULT_FEEDBACK_DEFINITION.copy,
  ctaLabel: DEFAULT_FEEDBACK_DEFINITION.ctaLabel,
  ctaHref: DEFAULT_FEEDBACK_DEFINITION.ctaHref,
};

export type DailyReminderJobResult = {
  attempted: number;
  sent: number;
  skipped: number;
  errors: { reminderId: string; reason: string }[];
};

export function resolveRecipient(row: PendingEmailReminderRow): string | null {
  const primary = row.email_primary?.trim();
  if (primary) {
    return primary;
  }
  const fallback = row.email?.trim();
  return fallback || null;
}

function resolveDisplayName(row: PendingEmailReminderRow): string {
  const raw = row.first_name?.trim() || row.full_name?.trim() || 'Innerbloomer';
  const firstName = raw.split(/\s+/u).filter(Boolean)[0];
  return firstName || 'Innerbloomer';
}

function formatLocalDate(now: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: timezone,
    }).format(now);
  } catch (error) {
    console.warn({ error }, 'Failed to format local date for reminder email');
    return new Intl.DateTimeFormat('es-AR', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(now);
  }
}

function renderTemplateCopy(template: string, variables: Record<string, string>): string {
  return template.replace(/{{(.*?)}}/g, (_, rawKey) => {
    const key = String(rawKey).trim();
    return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : '';
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripDuplicateGreeting(copy: string, name: string): string {
  const pattern = new RegExp(`^hola\\s+${escapeRegExp(name)}\\s*[!,]?\\s*`, 'i');
  return copy.replace(pattern, '').trim();
}

function splitHeadlineAndBody(copy: string): { headline: string; body: string } {
  if (!copy) {
    return { headline: '', body: '' };
  }

  const match = copy.match(/(.+?[.!?])(.*)/s);
  if (!match) {
    return { headline: copy.trim(), body: '' };
  }

  const [, firstSentence, rest] = match;
  return { headline: firstSentence.trim(), body: rest.trim() };
}

function normalizeHeadline(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export async function loadReminderTemplate(): Promise<ReminderTemplate> {
  const definition = await findFeedbackDefinitionByNotificationKey(REMINDER_NOTIFICATION_KEY);
  if (!definition) {
    return FALLBACK_TEMPLATE;
  }

  return {
    copy: definition.copy || FALLBACK_TEMPLATE.copy,
    ctaLabel: definition.cta_label ?? FALLBACK_TEMPLATE.ctaLabel,
    ctaHref: definition.cta_href ?? FALLBACK_TEMPLATE.ctaHref,
  };
}

function buildHtmlParagraphs(body: string): string {
  if (!body) {
    return '';
  }
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#e2e8f0;">${paragraph
          .replace(/\n/g, '<br />')
          .trim()}</p>`,
    )
    .join('');
}

export function buildReminderEmail(
  row: PendingEmailReminderRow,
  now: Date,
  template: ReminderTemplate = FALLBACK_TEMPLATE,
): EmailMessage {
  const name = resolveDisplayName(row);
  const ctaUrl = template.ctaHref?.trim() || DEFAULT_CTA_URL;
  const ctaLabel = template.ctaLabel?.trim() || 'Abrir Daily Quest';
  const friendlyDate = formatLocalDate(now, row.effective_timezone);
  let sendTime: string;
  try {
    sendTime = new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: row.effective_timezone,
    }).format(now);
  } catch (error) {
    console.warn({ error }, 'Failed to format send time for reminder email');
    sendTime = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(now);
  }

  const variables = {
    user_name: name,
    friendly_date: friendlyDate,
    cta_url: ctaUrl,
    cta_label: ctaLabel,
    send_time: sendTime,
  } satisfies Record<string, string>;

  const rawCopy = renderTemplateCopy(template.copy?.trim() || FALLBACK_TEMPLATE.copy, variables).trim();
  const sanitizedCopy = stripDuplicateGreeting(rawCopy, name);
  const { headline, body } = splitHeadlineAndBody(sanitizedCopy);
  const finalHeadline = headline || `Tu Daily Quest de ${friendlyDate} ya está lista.`;
  const finalBody = body || 'Sumá XP registrando tu emoción del día y marcando los hábitos completados. Cada check cuenta. 💫';
  const normalizedHeadline = normalizeHeadline(finalHeadline);
  const bodyHtml =
    buildHtmlParagraphs(finalBody) ||
    '<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#e2e8f0;">Sumá XP registrando tu emoción del día y marcando los hábitos completados. Cada check cuenta. 💫</p>';
  const subject = `${name}, ${normalizedHeadline.replace(/\s+/g, ' ').trim()} ✨`;
  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#020617;font-family:'Inter','Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f8fafc;">
    <table role="presentation" width="100%" style="width:100%;padding:24px 12px;background:#020617;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px;width:100%;background:linear-gradient(160deg,#0f172a,#111c33);border-radius:24px;padding:32px 24px;border:1px solid rgba(99,102,241,0.35);box-shadow:0 26px 52px rgba(2,6,23,0.55);">
            <tr>
              <td align="center" style="text-align:center;">
                <img src="${REMINDER_LOGO_URL}" alt="Innerbloom" width="44" height="44" style="display:block;margin:0 auto 12px;border-radius:50%;border:1px solid rgba(148,163,184,0.5);background:#ffffff;" />
                <p style="margin:0 0 14px;font-size:12px;letter-spacing:0.45em;text-transform:uppercase;color:#94a3b8;">
                  Innerbloom
                </p>
                <p style="margin:0 0 10px;font-size:15px;color:#cbd5f5;">Hola ${name} 👋</p>
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#f8fafc;">${normalizedHeadline}</h1>
                ${bodyHtml}
                <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-image:linear-gradient(120deg,#8b5cf6,#38bdf8);color:#ffffff;padding:14px 36px;border-radius:999px;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:0.02em;">${ctaLabel}</a>
                <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#94a3b8;">Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br /><a href="${ctaUrl}" style="color:#a5b4fc;text-decoration:none;">${ctaUrl}</a></p>
                <p style="margin:12px 0 0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#475569;">Recordatorio enviado ${friendlyDate} · ${sendTime}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  const textCopy = [normalizedHeadline, finalBody].filter(Boolean).join(' ');
  const text = [
    `Hola ${name} 👋`,
    textCopy || 'Tu Daily Quest ya está lista. Sumá XP registrando tu emoción del día y marcando tus hábitos completados.',
    `${ctaLabel}: ${ctaUrl}`,
    `Recordatorio enviado ${friendlyDate} · ${sendTime}`,
  ].join('\n\n');

  return { to: resolveRecipient(row) ?? '', subject, html, text };
}

export async function runDailyReminderJob(now: Date = new Date()): Promise<DailyReminderJobResult> {
  const reminders = await findPendingEmailReminders(now);

  if (reminders.length === 0) {
    return { attempted: 0, sent: 0, skipped: 0, errors: [] };
  }

  const provider = getEmailProvider();
  const template = await loadReminderTemplate();
  const sent: string[] = [];
  const errors: { reminderId: string; reason: string }[] = [];
  let skipped = 0;

  for (const reminder of reminders) {
    const recipient = resolveRecipient(reminder);
    if (!recipient) {
      skipped += 1;
      errors.push({ reminderId: reminder.user_daily_reminder_id, reason: 'missing_email' });
      continue;
    }

    try {
      const message = buildReminderEmail(reminder, now, template);
      await provider.sendEmail({ ...message, to: recipient });
      sent.push(reminder.user_daily_reminder_id);
    } catch (error) {
      console.error({ error, reminderId: reminder.user_daily_reminder_id }, 'Failed to send reminder email');
      errors.push({ reminderId: reminder.user_daily_reminder_id, reason: (error as Error).message });
    }
  }

  if (sent.length > 0) {
    await markRemindersAsSent(sent, now);
  }

  return { attempted: reminders.length, sent: sent.length, skipped, errors };
}
