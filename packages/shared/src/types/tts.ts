// TTS service types
export interface TextContent {
  id: string;
  content: string;
  characterCount: number;
  createdAt: Date;
  processingStatus: ProcessingStatus;
  metadata?: TextMetadata;
}

export interface TextMetadata {
  estimatedDuration?: number;
  wordCount?: number;
}

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface TTSProvider {
  name: string;
  convert(text: string, options?: TTSOptions): Promise<ArrayBuffer>;
  getVoices(): Promise<Voice[]>;
  isAvailable(): boolean;
}

export interface TTSOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender?: 'male' | 'female' | 'neutral';
}