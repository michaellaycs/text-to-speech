// Audio-related types
export interface AudioContent {
  id: string;
  sourceTextId: string;
  filePath: string;
  duration: number;
  generatedAt: Date;
  settings: AudioSettings;
  metadata: AudioMetadata;
}

export interface AudioSettings {
  volume: number; // 0-100
  playbackSpeed: number; // 0.8-1.5
  voice?: string;
}

export interface AudioMetadata {
  fileSize: number;
  format: string;
  ttsService: string;
}

export interface AudioExportOptions {
  format: 'mp3' | 'wav';
  quality: 'low' | 'medium' | 'high';
  filename?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackSpeed: number;
}