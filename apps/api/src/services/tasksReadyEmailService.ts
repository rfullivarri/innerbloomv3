import { getEmailProvider } from './email/index.js';
import type { EmailMessage } from './email/index.js';
import { HttpError } from '../lib/http-error.js';
import {
  claimTasksReadyNotification,
  hasTasksReadyNotification,
  releaseTasksReadyNotification,
} from '../repositories/tasks-ready-notifications.repository.js';

type TasksReadyEmailParams = {
  userId: string;
  tasksGroupId: string;
  to?: string | null;
  displayName?: string | null;
  timezone?: string | null;
  taskCount?: number | null;
  origin?: string;
  correlationId?: string;
};

const LOG_PREFIX = '[tasks-ready-email]';

const DEFAULT_CTA_URL =
  process.env.TASKS_READY_CTA_URL?.trim() ||
  process.env.DAILY_REMINDER_CTA_URL?.trim() ||
  'https://innerbloomjourney.org/login';

const BRAND_LOGO_URL = 'https://innerbloomjourney.org/IB-COLOR-LOGO.png';

function sanitizeRecipient(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.includes('@') ? trimmed : null;
}

function sanitizeName(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed.split(/\s+/u)[0] : 'Innerbloomer';
}

function buildEmailMessage(params: { to: string } & {
  displayName?: string | null;
  timezone?: string | null;
  taskCount?: number | null;
  ctaUrl?: string;
}): EmailMessage {
  const name = sanitizeName(params.displayName);
  const ctaUrl = params.ctaUrl?.trim() || DEFAULT_CTA_URL;
  const subject = 'Tu journey está a punto de comenzar';
  const bodyLines = [
    `Hola ${name},`,
    'Ya generamos tu set inicial de tareas usando IA, diseñado según tus objetivos y tu momento actual.',
    'Todo está listo. Este es el primer paso de tu camino en Innerbloom.',
    '',
    `Iniciar mi Journey: ${ctaUrl}`,
  ];

  const text = bodyLines.join('\n');
  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${subject}</title>
  </head>
  <body style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;color:#0f172a;padding:24px;">
    <table role="presentation" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <tr>
        <td>
          <table role="presentation" width="100%" style="margin:0 0 16px;">
            <tr>
              <td style="text-align:center;">
                <span style="font-family:'Manrope','Segoe UI',system-ui,-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;font-size:12px;font-weight:700;letter-spacing:0.32em;text-transform:uppercase;color:#94a3b8;vertical-align:middle;display:inline-block;">Innerbloom</span>
                <img src="${BRAND_LOGO_URL}" alt="Innerbloom logo" width="26" height="26" style="width:26px;height:26px;vertical-align:middle;display:inline-block;margin-left:10px;border:0;" />
              </td>
            </tr>
          </table>
          <p style="margin:0 0 16px;font-size:16px;text-align:center;">Hola ${name},</p>
          <h1 style="margin:0 0 12px;font-size:28px;line-height:1.3;text-align:center;">Tu journey está a punto de comenzar</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;text-align:center;">Ya generamos tu set inicial de tareas usando IA, diseñado según tus objetivos y tu momento actual.</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;text-align:center;">Todo está listo. Este es el primer paso de tu camino en Innerbloom.</p>
          <div style="text-align:center;">
            <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#8b5cf6;color:#ffffff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:700;">Iniciar mi Journey</a>
          </div>
          <p style="margin:24px 0 0;font-size:14px;color:#94a3b8;text-align:center;">Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br /><a href="${ctaUrl}" style="color:#6366f1;">${ctaUrl}</a></p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { to: params.to, subject, html, text };
}

type TasksReadyPreviewParams = {
  to?: string | null;
  displayName?: string | null;
  timezone?: string | null;
  taskCount?: number | null;
  ctaUrl?: string | null;
};

export async function sendTasksReadyEmailPreview(
  params: TasksReadyPreviewParams,
): Promise<{ ok: true; recipient: string; sent_at: string; task_count: number | null }> {
  const recipient = sanitizeRecipient(params.to);

  if (!recipient) {
    throw new HttpError(400, 'missing_recipient', 'The user does not have an email address to send the tasks ready email');
  }

  const provider = getEmailProvider();
  const now = new Date();
  const message = buildEmailMessage({
    to: recipient,
    displayName: params.displayName,
    timezone: params.timezone,
    taskCount: params.taskCount ?? null,
    ctaUrl: params.ctaUrl ?? undefined,
  });

  await provider.sendEmail(message);

  return { ok: true, recipient, sent_at: now.toISOString(), task_count: params.taskCount ?? null };
}

function logSkip(reason: string, meta: Record<string, unknown>): void {
  console.info(LOG_PREFIX, { reason, ...meta });
}

export async function notifyTasksReadyEmail(params: TasksReadyEmailParams): Promise<void> {
  const recipient = sanitizeRecipient(params.to);
  if (!recipient) {
    logSkip('missing_recipient', params);
    return;
  }

  if (process.env.NODE_ENV === 'test') {
    logSkip('skipped_in_test_env', params);
    return;
  }

  const alreadySent = await hasTasksReadyNotification(params.userId, params.tasksGroupId);
  if (alreadySent) {
    logSkip('already_sent', params);
    return;
  }

  const claimId = await claimTasksReadyNotification(params.userId, params.tasksGroupId);

  if (!claimId) {
    logSkip('claimed_by_other_process', params);
    return;
  }

  try {
    const provider = getEmailProvider();
    const message = buildEmailMessage({
      to: recipient,
      displayName: params.displayName,
      timezone: params.timezone,
      taskCount: params.taskCount,
    });

    await provider.sendEmail(message);
    console.info(LOG_PREFIX, {
      status: 'sent',
      userId: params.userId,
      tasksGroupId: params.tasksGroupId,
      origin: params.origin,
      correlationId: params.correlationId,
    });
  } catch (error) {
    await releaseTasksReadyNotification(claimId).catch((releaseError) => {
      console.error(LOG_PREFIX, { message: 'Failed to release claim', releaseError });
    });
    throw error;
  }
}
