import { getEmailProvider } from './email/index.js';
import type { EmailMessage } from './email/index.js';
import {
  findPendingEmailReminders,
  markRemindersAsSent,
  type PendingEmailReminderRow,
} from '../repositories/user-daily-reminders.repository.js';

const DEFAULT_CTA_URL = process.env.DAILY_REMINDER_CTA_URL?.trim() || 'https://innerbloom.app/daily-quest';

export type DailyReminderJobResult = {
  attempted: number;
  sent: number;
  skipped: number;
  errors: { reminderId: string; reason: string }[];
};

function resolveRecipient(row: PendingEmailReminderRow): string | null {
  const primary = row.email_primary?.trim();
  if (primary) {
    return primary;
  }
  const fallback = row.email?.trim();
  return fallback || null;
}

function resolveDisplayName(row: PendingEmailReminderRow): string {
  return row.first_name?.trim() || row.full_name?.trim() || 'Innerbloomer';
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

function formatLocalTimeLabel(localTime: string, timezone: string): string {
  try {
    const [hours, minutes, seconds] = localTime.split(':').map((part) => Number(part));
    const reference = new Date('2024-01-01T00:00:00Z');
    reference.setUTCHours(hours ?? 0, minutes ?? 0, seconds ?? 0, 0);

    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    }).format(reference);
  } catch (error) {
    console.warn({ error }, 'Failed to format local time for reminder email');
    return `${localTime.slice(0, 5)} hs`;
  }
}

function buildReminderEmail(row: PendingEmailReminderRow, now: Date): EmailMessage {
  const name = resolveDisplayName(row);
  const ctaUrl = DEFAULT_CTA_URL;
  const friendlyDate = formatLocalDate(now, row.effective_timezone);
  const friendlyTime = formatLocalTimeLabel(row.local_time, row.effective_timezone);
  const subject = `${name}, mantené tu streak hoy`;
  const intro = `Tu Daily Quest de ${friendlyDate} ya está lista.`;
  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${subject}</title>
  </head>
  <body style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
    <table role="presentation" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
      <tr>
        <td>
          <p style="margin:0 0 12px;font-size:16px;">Hola ${name},</p>
          <p style="margin:0 0 12px;font-size:16px;">${intro}</p>
          <p style="margin:0 0 16px;font-size:15px;color:#475569;">Programaste tus recordatorios a las <strong>${friendlyTime}</strong> (${row.effective_timezone}).</p>
          <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:600;margin:24px 0;">Abrir Innerbloom</a>
          <p style="margin:24px 0 0;font-size:14px;color:#94a3b8;">Si el botón no funciona, copiá este enlace: <a href="${ctaUrl}" style="color:#6366f1;">${ctaUrl}</a></p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  const text = [`Hola ${name},`, intro, `Abrí Innerbloom: ${ctaUrl}`].join('\n');

  return { to: resolveRecipient(row) ?? '', subject, html, text };
}

export async function runDailyReminderJob(now: Date = new Date()): Promise<DailyReminderJobResult> {
  const reminders = await findPendingEmailReminders(now);

  if (reminders.length === 0) {
    return { attempted: 0, sent: 0, skipped: 0, errors: [] };
  }

  const provider = getEmailProvider();
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
      const message = buildReminderEmail(reminder, now);
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
