export interface ChatMessage {
    role: 'user' | 'model' | 'system' | 'tool';
    parts: { text: string }[];
  }