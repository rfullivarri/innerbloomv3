type Language = 'es' | 'en';

export function RemindersPreview({ language = 'es' }: { language?: Language }) {
  const reminderTitle = language === 'es' ? 'Recordatorio' : 'Reminder';
  const reminderBody =
    language === 'es' ? 'Check-in de emoción en 5 min' : 'Emotion check-in in 5 min';
  const questBody = language === 'es' ? 'Bloque de foco listo para marcar' : 'Focus block ready to mark';
  const ariaLabel = language === 'es' ? 'Preview de recordatorios en app' : 'App reminders preview';

  return (
    <div className="feature-mini-panel reminders-preview">
      <div className="phone-mock" aria-label={ariaLabel}>
        <div className="toast one">
          <strong>{reminderTitle}</strong>
          <div>{reminderBody}</div>
        </div>
        <div className="toast two">
          <strong>Daily Quest</strong>
          <div>{questBody}</div>
        </div>
      </div>
    </div>
  );
}
