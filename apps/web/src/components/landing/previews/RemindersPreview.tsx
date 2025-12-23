export function RemindersPreview() {
  return (
    <div className="feature-mini-panel reminders-preview">
      <div className="phone-mock" aria-label="Preview de recordatorios en app">
        <div className="toast one">
          <strong>Recordatorio</strong>
          <div>Check-in de emoción en 5 min</div>
        </div>
        <div className="toast two">
          <strong>Daily Quest</strong>
          <div>Bloque de foco listo para marcar</div>
        </div>
      </div>
    </div>
  );
}
