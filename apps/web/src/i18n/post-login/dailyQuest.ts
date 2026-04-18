import type { PostLoginTranslations } from './types';

export const dailyQuestTranslations = {
  'dailyQuest.header.kicker': { es: 'Daily Quest', en: 'Daily Quest' },
  'dailyQuest.header.title': { es: 'Retrospectiva', en: 'Retrospective' },
  'dailyQuest.header.description': {
    es: 'Registrá cómo te sentiste ayer, elegí la emoción que predominó y marcá las tareas logradas. ¡Seguí sumando GP y rachas!',
    en: 'Log how you felt yesterday, choose the emotion that stood out most, and mark completed tasks. Keep stacking GP and streaks!',
  },
  'dailyQuest.closeAria': { es: 'Cerrar Daily Quest', en: 'Close Daily Quest' },
  'dailyQuest.emotion.question': {
    es: '¿Qué sentimiento prevaleció más el día de ayer?',
    en: 'Which feeling stood out the most yesterday?',
  },
  'dailyQuest.emotion.availableAria': { es: 'Emociones disponibles', en: 'Available emotions' },
  'dailyQuest.checklist.title': { es: 'Checklist del día', en: 'Daily checklist' },
  'dailyQuest.pillars.body': { es: 'Cuerpo', en: 'Body' },
  'dailyQuest.pillars.mind': { es: 'Mente', en: 'Mind' },
  'dailyQuest.pillars.soul': { es: 'Alma', en: 'Soul' },
  'dailyQuest.notes.label': { es: 'Notas opcionales', en: 'Optional notes' },
  'dailyQuest.notes.placeholder': {
    es: '¿Algo que quieras destacar de tu día?',
    en: 'Anything you want to highlight from your day?',
  },
  'dailyQuest.actions.later': { es: 'Más tarde', en: 'Later' },
  'dailyQuest.actions.confirm': { es: 'Confirmar', en: 'Confirm' },
  'dailyQuest.actions.saving': { es: 'Guardando…', en: 'Saving…' },
  'dailyQuest.actions.confirmAria': { es: 'Registrar Daily Quest', en: 'Submit Daily Quest' },
  'dailyQuest.helper.selectEmotion': {
    es: 'Seleccioná una emoción para confirmar.',
    en: 'Select one emotion to confirm.',
  },
  'dailyQuest.toast.selectEmotionRequired': {
    es: 'Elegí una emoción para continuar.',
    en: 'Choose an emotion to continue.',
  },
  'dailyQuest.toast.saveError': {
    es: 'No pudimos guardar tu Daily Quest. Intentá nuevamente.',
    en: "We couldn't save your Daily Quest. Please try again.",
  },
  'dailyQuest.toast.snoozedReminder': {
    es: 'Recordatorio pospuesto. Volvé cuando quieras completar tu Daily Quest.',
    en: 'Reminder snoozed. Come back whenever you want to complete your Daily Quest.',
  },
  'dailyQuest.toast.savedSuccess': { es: 'Registro guardado con éxito.', en: 'Saved successfully.' },
  'dailyQuest.celebration.holdInstruction': {
    es: 'Mantené presionado 2 segundos para cerrar',
    en: 'Press and hold for 2 seconds to close',
  },
  'dailyQuest.celebration.holdButton': { es: 'Mantené presionado', en: 'Press and hold' },
  'dailyQuest.celebration.message.1': {
    es: 'Registro guardado. ¡Arrancaste con todo! 💥 Seguimos sumando GP hoy.',
    en: "Entry saved. You're off to a strong start! 💥 Let's keep adding GP today.",
  },
  'dailyQuest.celebration.message.2': {
    es: 'Listo el diario de ayer. ¡Hoy más fuerte! 💪✨',
    en: "Yesterday's journal is done. Let's go stronger today! 💪✨",
  },
  'dailyQuest.celebration.message.3': {
    es: '¡Bien! Emoción registrada y tareas checkeadas. 🚀 A por el día.',
    en: 'Nice! Emotion logged and tasks checked. 🚀 Let’s take on the day.',
  },
  'dailyQuest.difficulty.easy': { es: 'Fácil', en: 'Easy' },
  'dailyQuest.difficulty.medium': { es: 'Media', en: 'Medium' },
  'dailyQuest.difficulty.hard': { es: 'Difícil', en: 'Hard' },
  'dailyQuest.footer.gpLabel': { es: 'GP', en: 'GP' },
  'dailyQuest.mobile.permissionRequired': {
    es: 'Necesitamos permiso para enviarte notificaciones en este dispositivo.',
    en: 'We need permission to send you notifications on this device.',
  },
  'dailyQuest.mobile.testNotification.title': { es: 'Innerbloom', en: 'Innerbloom' },
  'dailyQuest.mobile.testNotification.body': {
    es: 'Prueba local: tu Daily Quest ya puede recordarte.',
    en: 'Local test: your Daily Quest reminders are now active.',
  },
  'dailyQuest.mobile.notification.title': { es: 'Daily Quest', en: 'Daily Quest' },
  'dailyQuest.mobile.notification.body': {
    es: 'Revisá tu Daily Quest y sumá GP hoy.',
    en: 'Check your Daily Quest and earn GP today.',
  },
} satisfies PostLoginTranslations;
