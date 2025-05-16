// src/components/Chat/types/types.ts

export interface TextPart {
  text: string;
}

export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  // id?: string; // Optional unique ID for the file instance if needed
  // previewUrl?: string; // Optional for client-side image previews (not implemented here)
}

export interface ChatMessage {
  id: string; // Unique ID for each message
  role: "user" | "model" | "system";
  parts: TextPart[];
  files?: FileAttachment[];
  timestamp?: string; // Or Date object, ISO string is good for storage
}

export interface ChatHistory {
  id:string;
  title: string;
  messages: ChatMessage[];
  createdAt: string; // ISO date string
}