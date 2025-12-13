import { getEmailProvider } from './email/index.js';
import type { EmailMessage } from './email/index.js';
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
  'https://web-dev-dfa2.up.railway.app/dashboard-v3?tasks=open';

function sanitizeRecipient(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.includes('@') ? trimmed : null;
}

function sanitizeName(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed.split(/\s+/u)[0] : 'Innerbloomer';
}

function buildEmailMessage(params: Required<Pick<TasksReadyEmailParams, 'to'>> & {
  displayName?: string | null;
  timezone?: string | null;
  taskCount?: number | null;
  ctaUrl?: string;
}): EmailMessage {
  const name = sanitizeName(params.displayName);
  const ctaUrl = params.ctaUrl?.trim() || DEFAULT_CTA_URL;
  const subject = 'Tus tareas ya están listas';
  const bodyLines = [
    `Hola ${name},`,
    'Ya generamos tu set inicial de tareas. Podés revisarlas y editarlas cuando quieras.',
  ];

  if (typeof params.taskCount === 'number' && params.taskCount > 0) {
    bodyLines.push(`Preparamos ${params.taskCount} opciones para que empieces.`);
  }

  bodyLines.push('', `Abrir tus tareas: ${ctaUrl}`);

  const text = bodyLines.join('\n');
  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${subject}</title>
  </head>
  <body style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;padding:24px;">
    <table role="presentation" width="100%" style="max-width:640px;margin:0 auto;background:#111827;border-radius:18px;padding:28px;border:1px solid rgba(148,163,184,0.35);">
      <tr>
        <td>
          <p style="margin:0 0 12px;font-size:16px;">Hola ${name},</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Ya generamos tu set inicial de tareas. Podés revisarlas y editarlas cuando quieras.</p>
          ${
            typeof params.taskCount === 'number' && params.taskCount > 0
              ? `<p style="margin:0 0 16px;font-size:14px;color:#cbd5e1;">Preparamos ${params.taskCount} opciones para que empieces.</p>`
              : ''
          }
          <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#6366f1;color:#ffffff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:700;">Abrir mis tareas</a>
          <p style="margin:18px 0 0;font-size:13px;color:#94a3b8;">Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br /><a href="${ctaUrl}" style="color:#a5b4fc;">${ctaUrl}</a></p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { to: params.to, subject, html, text };
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

