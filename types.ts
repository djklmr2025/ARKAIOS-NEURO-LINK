export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system',
  TOOL = 'tool'
}

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
  attachments?: string[]; // Base64 strings
  functionCalls?: any[];
  functionResponses?: any[];
}

export enum NeuralMode {
  CHAT = 'CHAT',
  VISION = 'VISION', // Screen analysis
  WORKSPACE = 'WORKSPACE' // File system access
}

export interface FileSystemState {
  handle: any | null; // FileSystemDirectoryHandle
  path: string | null;
  permission: 'granted' | 'denied' | 'prompt';
}