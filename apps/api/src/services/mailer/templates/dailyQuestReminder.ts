export type DailyQuestReminderTemplateParams = {
  ctaUrl: string;
  displayName?: string;
  ctaLabel?: string;
  intro?: string;
  questTitle?: string;
  questSummary?: string;
  highlightLabel?: string;
  highlightValue?: string;
  footerNote?: string;
};

const DEFAULT_SUBJECT = 'Tu Daily Quest está lista';
const DEFAULT_CTA_LABEL = 'Abrir Daily Quest';
const DEFAULT_INTRO = 'Respirá hondo, calibrá tu enfoque y completá tu misión diaria antes de que cierre el ciclo.';
const DEFAULT_QUEST_TITLE = 'Daily Quest • Foco + Emociones';
const DEFAULT_QUEST_SUMMARY =
  'Anotá tus emociones, priorizá el siguiente micro-paso y recibí XP extra antes de que el Boss detecte inactividad.';
const DEFAULT_HIGHLIGHT_LABEL = 'Racha activa';
const DEFAULT_FOOTER = 'Si ya completaste el Daily Quest ignorá este correo, tu progreso se sincroniza automáticamente.';

export const DAILY_QUEST_REMINDER_SUBJECT = DEFAULT_SUBJECT;

export const renderDailyQuestReminderHtml = (params: DailyQuestReminderTemplateParams) => {
  const {
    ctaUrl,
    displayName,
    ctaLabel = DEFAULT_CTA_LABEL,
    intro = DEFAULT_INTRO,
    questTitle = DEFAULT_QUEST_TITLE,
    questSummary = DEFAULT_QUEST_SUMMARY,
    highlightLabel = DEFAULT_HIGHLIGHT_LABEL,
    highlightValue,
    footerNote = DEFAULT_FOOTER,
  } = params;

  const greeting = displayName ? `Hola ${displayName.split(' ')[0]} ✨` : 'Hola agente ✨';

  return `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${DEFAULT_SUBJECT}</title>
    </head>
    <body style="margin:0;background:#05060a;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f4f6fb;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#0d1018;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
              <tr>
                <td style="background:linear-gradient(120deg,#6c47ff,#ff5ea6);padding:32px;text-align:left;">
                  <div style="font-size:18px;letter-spacing:0.3px;text-transform:uppercase;color:rgba(255,255,255,0.8);margin-bottom:4px;">Daily Quest</div>
                  <div style="font-size:30px;font-weight:700;color:#fff;line-height:1.2;">${greeting}</div>
                  <p style="font-size:16px;color:rgba(255,255,255,0.92);line-height:1.5;margin:12px 0 0;">${intro}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;">
                    <div style="font-size:14px;letter-spacing:0.4px;text-transform:uppercase;color:#8a94ff;margin-bottom:8px;">${questTitle}</div>
                    <div style="font-size:18px;line-height:1.6;color:#e6e8f1;">${questSummary}</div>
                    <div style="margin-top:20px;display:flex;align-items:center;">
                      <a href="${ctaUrl}" style="background:#fff;color:#0d1018;font-weight:600;font-size:16px;padding:14px 28px;border-radius:999px;text-decoration:none;display:inline-block;">${ctaLabel}</a>
                    </div>
                  </div>
                  <div style="margin-top:24px;display:flex;gap:16px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:200px;background:#090b12;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;">
                      <div style="font-size:13px;text-transform:uppercase;letter-spacing:0.4px;color:rgba(255,255,255,0.7);">${highlightLabel}</div>
                      <div style="font-size:26px;font-weight:700;margin-top:6px;color:#fff;">${highlightValue ?? 'Mantén la energía'}</div>
                      <p style="font-size:14px;color:rgba(255,255,255,0.65);margin-top:8px;">Cada Daily Quest enviado suma XP, evita penalizaciones y desbloquea el botín semanal.</p>
                    </div>
                    <div style="flex:1;min-width:200px;background:#090b12;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;">
                      <div style="font-size:13px;text-transform:uppercase;letter-spacing:0.4px;color:rgba(255,255,255,0.7);">Modo Zen</div>
                      <div style="font-size:16px;line-height:1.6;color:#e6e8f1;">Terminá el formulario en menos de 3 minutos. Concéntrate en la próxima acción y enviá antes del límite.</div>
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 32px 32px;color:rgba(255,255,255,0.6);font-size:13px;line-height:1.6;text-align:center;">
                  ${footerNote}
                  <br />
                  <span style="color:rgba(255,255,255,0.4);">Innerbloom · selfimgames@gmail.com</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};

export const renderDailyQuestReminderText = (params: DailyQuestReminderTemplateParams) => {
  const name = params.displayName ? params.displayName.split(' ')[0] : 'agente';
  return [
    `Hola ${name},`,
    params.intro ?? DEFAULT_INTRO,
    params.questSummary ?? DEFAULT_QUEST_SUMMARY,
    `Completá tu Daily Quest ahora: ${params.ctaUrl}`,
    params.footerNote ?? DEFAULT_FOOTER,
  ].join('\n\n');
};
