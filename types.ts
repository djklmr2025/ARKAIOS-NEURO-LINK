export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
  attachments?: string[]; // Base64 strings
}

export interface SystemStatus {
  isRecording: boolean;
  isScreenSharing: boolean;
  isProcessing: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

export enum NeuralMode {
  CHAT = 'CHAT',
  VISION = 'VISION', // Screen analysis
  COMMAND = 'COMMAND' // Future: execution
}