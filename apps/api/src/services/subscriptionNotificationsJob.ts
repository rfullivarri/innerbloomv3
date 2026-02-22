import { pool } from '../db.js';
import { getEmailProvider } from './email/index.js';

const DAY_MS = 24 * 60 * 60 * 1000;

type NotificationRule = {
  offsetDays: number;
  type: 'trial_ending_7d' | 'renewal_7d' | 'renewal_15d';
  anchorField: 'trial_ends_at' | 'current_period_ends_at';
};

type SubscriptionCandidate = {
  user_subscription_id: string;
  plan_code: string;
  status: string;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  user_id: string;
  email_primary: string | null;
  email: string | null;
  first_name: string | null;
  full_name: string | null;
};

export type SubscriptionNotificationsJobResult = {
  attempted: number;
  sent: number;
  skipped: number;
  deduplicated: number;
  errors: { userSubscriptionId: string; reason: string }[];
};

const RULES_BY_PLAN: Record<string, NotificationRule[]> = {
  FREE: [{ offsetDays: 7, type: 'trial_ending_7d', anchorField: 'trial_ends_at' }],
  MONTH: [{ offsetDays: 7, type: 'renewal_7d', anchorField: 'current_period_ends_at' }],
  SIX_MONTHS: [
    { offsetDays: 15, type: 'renewal_15d', anchorField: 'current_period_ends_at' },
    { offsetDays: 7, type: 'renewal_7d', anchorField: 'current_period_ends_at' },
  ],
  YEAR: [
    { offsetDays: 15, type: 'renewal_15d', anchorField: 'current_period_ends_at' },
    { offsetDays: 7, type: 'renewal_7d', anchorField: 'current_period_ends_at' },
  ],
};

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function daysUntil(anchorDate: Date, now: Date): number {
  const anchorDay = startOfUtcDay(anchorDate).getTime();
  const nowDay = startOfUtcDay(now).getTime();
  return Math.round((anchorDay - nowDay) / DAY_MS);
}

function resolveRecipient(candidate: SubscriptionCandidate): string | null {
  const primary = candidate.email_primary?.trim();
  if (primary) {
    return primary;
  }

  const fallback = candidate.email?.trim();
  return fallback || null;
}

function resolveName(candidate: SubscriptionCandidate): string {
  const raw = candidate.first_name?.trim() || candidate.full_name?.trim() || 'Innerbloomer';
  return raw.split(/\s+/u).filter(Boolean)[0] || 'Innerbloomer';
}

function buildDedupeKey(userSubscriptionId: string, notificationType: string, scheduledFor: Date): string {
  return `subscription:${userSubscriptionId}:${notificationType}:${scheduledFor.toISOString().slice(0, 10)}`;
}

function buildSubject(ruleType: NotificationRule['type']): string {
  if (ruleType === 'trial_ending_7d') {
    return 'Tu prueba de Innerbloom termina en 7 días';
  }

  if (ruleType === 'renewal_15d') {
    return 'Tu suscripción se renueva en 15 días';
  }

  return 'Tu suscripción se renueva en 7 días';
}

function buildBody(name: string, ruleType: NotificationRule['type'], periodEndDate: string): { html: string; text: string } {
  const ctaUrl = process.env.SUBSCRIPTION_BILLING_URL?.trim() || 'https://web-dev-dfa2.up.railway.app/settings/billing';
  const headline =
    ruleType === 'trial_ending_7d'
      ? `Tu trial finaliza el ${periodEndDate}`
      : `Tu suscripción se renovará el ${periodEndDate}`;

  const text = [
    `Hola ${name},`,
    `${headline}.`,
    'Podés revisar o actualizar tu plan desde la sección de facturación.',
    `Gestionar suscripción: ${ctaUrl}`,
  ].join('\n\n');

  const html = `<!doctype html>
<html lang="es">
  <body style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">
    <p>Hola ${name},</p>
    <p>${headline}.</p>
    <p>Podés revisar o actualizar tu plan desde la sección de facturación.</p>
    <p><a href="${ctaUrl}" target="_blank" rel="noopener noreferrer">Gestionar suscripción</a></p>
  </body>
</html>`;

  return { html, text };
}

async function getCandidates(): Promise<SubscriptionCandidate[]> {
  const query = `
    SELECT
      us.user_subscription_id,
      us.plan_code,
      us.status,
      us.trial_ends_at,
      us.current_period_ends_at,
      us.user_id,
      u.email_primary,
      u.email,
      u.first_name,
      u.full_name
    FROM user_subscriptions us
    JOIN users u ON u.user_id = us.user_id
    WHERE us.status IN ('trialing', 'active')
      AND us.plan_code IN ('FREE', 'MONTH', 'SIX_MONTHS', 'YEAR')
  `;

  const result = await pool.query<SubscriptionCandidate>(query);
  return result.rows;
}

export async function runSubscriptionNotificationsJob(now: Date = new Date()): Promise<SubscriptionNotificationsJobResult> {
  const provider = getEmailProvider();
  const candidates = await getCandidates();

  let attempted = 0;
  let sent = 0;
  let skipped = 0;
  let deduplicated = 0;
  const errors: { userSubscriptionId: string; reason: string }[] = [];

  for (const candidate of candidates) {
    const rules = RULES_BY_PLAN[candidate.plan_code] ?? [];

    for (const rule of rules) {
      const anchorRaw = candidate[rule.anchorField];
      if (!anchorRaw) {
        continue;
      }

      const anchorDate = new Date(anchorRaw);
      if (Number.isNaN(anchorDate.getTime())) {
        continue;
      }

      if (daysUntil(anchorDate, now) !== rule.offsetDays) {
        continue;
      }

      attempted += 1;
      const scheduledFor = new Date(anchorDate.getTime() - rule.offsetDays * DAY_MS);
      const dedupeKey = buildDedupeKey(candidate.user_subscription_id, rule.type, scheduledFor);

      const insertResult = await pool.query<{ subscription_notification_id: string }>(
        `
          INSERT INTO subscription_notifications (
            user_subscription_id,
            notification_type,
            scheduled_for,
            sent_at,
            channel,
            dedupe_key
          )
          VALUES ($1, $2, $3, NULL, 'email', $4)
          ON CONFLICT (dedupe_key) DO NOTHING
          RETURNING subscription_notification_id
        `,
        [candidate.user_subscription_id, rule.type, scheduledFor, dedupeKey],
      );

      const insertedNotificationId = insertResult.rows[0]?.subscription_notification_id;
      if (!insertedNotificationId) {
        deduplicated += 1;
        continue;
      }

      const recipient = resolveRecipient(candidate);
      if (!recipient) {
        skipped += 1;
        errors.push({ userSubscriptionId: candidate.user_subscription_id, reason: 'missing_email' });
        continue;
      }

      const name = resolveName(candidate);
      const periodEnd = new Intl.DateTimeFormat('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(anchorDate);

      const body = buildBody(name, rule.type, periodEnd);

      try {
        await provider.sendEmail({
          to: recipient,
          subject: buildSubject(rule.type),
          html: body.html,
          text: body.text,
        });

        await pool.query(
          `UPDATE subscription_notifications SET sent_at = $2 WHERE subscription_notification_id = $1`,
          [insertedNotificationId, now],
        );

        sent += 1;
      } catch (error) {
        console.error({ error, userSubscriptionId: candidate.user_subscription_id }, 'Failed to send subscription notification');
        errors.push({ userSubscriptionId: candidate.user_subscription_id, reason: (error as Error).message });
      }
    }
  }

  return { attempted, sent, skipped, deduplicated, errors };
}
