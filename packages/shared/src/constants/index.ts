// Shared constants
export const API_BASE_URL = 'http://localhost:5000';
export const MAX_CONTENT_LENGTH = 2000;
export const SESSION_TIMEOUT = 3600000; // 1 hour in milliseconds
export const TTS_TIMEOUT = 30000; // 30 seconds
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const AUDIO_FORMATS = ['mp3', 'wav'] as const;
export const SUPPORTED_FILE_TYPES = ['.txt', '.docx', '.pdf'] as const;

export const DEFAULT_AUDIO_SETTINGS = {
  volume: 75,
  playbackSpeed: 1.0
} as const;