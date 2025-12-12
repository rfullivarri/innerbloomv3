declare module 'config/emotion_messages.json' {
  type EmotionMessage = {
    label: string;
    tone: string;
    weekly_message: string;
    biweekly_context: string;
  };

  const messages: Record<string, EmotionMessage>;
  export default messages;
}
