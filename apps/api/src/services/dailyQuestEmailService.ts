import { getEmailProvider } from './email/index.js';
import type { EmailMessage } from './email/index.js';

export type DailyQuestEmailTask = {
  name: string;
  xp: number;
  pillar?: string | null;
};

export type DailyQuestEmailParams = {
  to: string;
  date: string;
  ctaUrl: string;
  displayName?: string | null;
  timezone?: string | null;
  tasks?: DailyQuestEmailTask[];
  streakDays?: number | null;
  xpToday?: number | null;
};

export type DailyQuestEmailContent = Pick<EmailMessage, 'subject' | 'html' | 'text'>;

function formatFriendlyDate(date: string, timezone?: string | null): string {
  const normalizedTimezone = timezone?.trim() || 'UTC';

  const isoDate = /\d{4}-\d{2}-\d{2}/u.test(date)
    ? `${date}T12:00:00Z`
    : date;

  const parsed = new Date(isoDate);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  try {
    const formatter = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: normalizedTimezone,
    });
    return formatter.format(parsed);
  } catch (error) {
    console.warn({ error }, 'Failed to format date for daily quest email');
    return date;
  }
}

function sanitizeName(name?: string | null): string {
  if (!name) {
    return 'Innerbloomer';
  }

  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : 'Innerbloomer';
}

function renderTasksHtml(tasks?: DailyQuestEmailTask[]): string {
  if (!tasks || tasks.length === 0) {
    return '';
  }

  const items = tasks
    .map((task) => {
      const xpValue = Number.isFinite(task.xp) ? `${task.xp} XP` : '';
      const pillar = task.pillar?.trim();
      const metaParts = [pillar, xpValue].filter(Boolean).join(' • ');
      return `<li style="margin-bottom:8px;line-height:1.4;"><strong>${task.name}</strong>${
        metaParts ? ` <span style="color:#6b7280;">(${metaParts})</span>` : ''
      }</li>`;
    })
    .join('');

  return `<ul style="padding-left:20px;margin:16px 0;">${items}</ul>`;
}

function renderStatsHtml(streakDays?: number | null, xpToday?: number | null): string {
  const pieces: string[] = [];

  if (typeof streakDays === 'number' && streakDays > 0) {
    pieces.push(`${streakDays} día${streakDays === 1 ? '' : 's'} de streak`);
  }

  if (typeof xpToday === 'number' && xpToday > 0) {
    pieces.push(`${xpToday} XP sumados hoy`);
  }

  if (pieces.length === 0) {
    return '';
  }

  return `<p style="margin:16px 0 0;font-size:14px;color:#6b7280;">${pieces.join(' • ')}</p>`;
}

function buildTextFallback(params: DailyQuestEmailParams, friendlyDate: string, name: string): string {
  const lines: string[] = [];
  lines.push(`Hola ${name},`);
  lines.push(`Tu Daily Quest de ${friendlyDate} ya está lista.`);
  lines.push('Completa las tareas y suma XP para tu streak.');

  if (params.tasks && params.tasks.length > 0) {
    lines.push('', 'Tareas destacadas:');
    for (const task of params.tasks) {
      const xpValue = Number.isFinite(task.xp) ? `${task.xp} XP` : '';
      const pillar = task.pillar?.trim();
      const suffix = [pillar, xpValue].filter(Boolean).join(' • ');
      lines.push(`- ${task.name}${suffix ? ` (${suffix})` : ''}`);
    }
  }

  if (typeof params.streakDays === 'number' && params.streakDays > 0) {
    lines.push('', `Llevas ${params.streakDays} día${params.streakDays === 1 ? '' : 's'} seguidos.`);
  }

  if (typeof params.xpToday === 'number' && params.xpToday > 0) {
    lines.push(`Hoy sumaste ${params.xpToday} XP.`);
  }

  lines.push('', `Abrir Daily Quest: ${params.ctaUrl}`);

  return lines.join('\n');
}

export function buildDailyQuestEmailContent(params: DailyQuestEmailParams): DailyQuestEmailContent {
  const name = sanitizeName(params.displayName);
  const friendlyDate = formatFriendlyDate(params.date, params.timezone);
  const subject = `${name}, tu Daily Quest de ${friendlyDate} ya está lista`;
  const text = buildTextFallback(params, friendlyDate, name);
  const tasksHtml = renderTasksHtml(params.tasks);
  const statsHtml = renderStatsHtml(params.streakDays, params.xpToday);
  const ctaHtml = `<a href="${params.ctaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:600;margin:24px 0;">Abrir Daily Quest</a>`;

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
          <p style="margin:0 0 16px;font-size:16px;">Hola ${name},</p>
          <p style="margin:0 0 16px;font-size:16px;">Tu Daily Quest de <strong>${friendlyDate}</strong> ya está lista. Completa las tareas y mantené tu streak.</p>
          ${tasksHtml}
          ${statsHtml}
          ${ctaHtml}
          <p style="margin:32px 0 0;font-size:14px;color:#94a3b8;">Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br /><a href="${params.ctaUrl}" style="color:#6366f1;">${params.ctaUrl}</a></p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

export async function sendDailyQuestEmail(params: DailyQuestEmailParams): Promise<void> {
  const provider = getEmailProvider();
  const content = buildDailyQuestEmailContent(params);
  await provider.sendEmail({ to: params.to, subject: content.subject, html: content.html, text: content.text });
}
