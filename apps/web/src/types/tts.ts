// TTS-specific TypeScript interfaces and types

export interface AudioSettings {
  volume: number; // 0-100
  playbackSpeed: number; // 0.8-1.5
  voice?: string;
}

export interface AudioContent {
  id: string;
  sourceTextId: string;
  filePath: string;
  duration: number;
  generatedAt: string;
  settings: AudioSettings;
  metadata: {
    fileSize: number;
    format: string;
    ttsService: string;
  };
}

export interface ConversionRequest {
  content: string;
  settings?: Partial<AudioSettings>;
}

export interface ConversionStatus {
  id: string;
  status: ConversionStatusType;
  progress: number; // 0-100
  error?: string;
  startTime: string;
  endTime?: string;
}

export type ConversionStatusType = 'pending' | 'processing' | 'completed' | 'failed';

export interface TTSProviderStatus {
  name: string;
  priority: number;
  available: boolean;
  responseTime?: number;
  errorRate?: number;
  lastCheck: string;
}

export interface ProvidersStatusResponse {
  providers: TTSProviderStatus[];
  timestamp: string;
}

// Hook-related types
export interface TTSHookState {
  isConverting: boolean;
  currentAudio: AudioContent | null;
  conversionStatus: ConversionStatus | null;
  error: string | null;
  progress: number;
}

export interface TTSHookActions {
  convert: (content: string, settings?: Partial<AudioSettings>) => Promise<AudioContent>;
  clearError: () => void;
  reset: () => void;
  getAudioUrl: (audioId: string) => string;
  getDownloadUrl: (audioId: string) => string;
  deleteAudio: (audioId: string) => Promise<void>;
  getAudioInfo: (audioId: string) => Promise<AudioContent>;
}

// Component prop types
export interface ConversionStatusProps {
  status: ConversionStatus | null;
  isConverting: boolean;
  progress: number;
  error: string | null;
  onRetry?: () => void;
  className?: string;
  'data-testid'?: string;
}

export interface TTSButtonProps {
  content: string;
  settings?: Partial<AudioSettings>;
  disabled?: boolean;
  onConversionStart?: () => void;
  onConversionComplete?: (audio: AudioContent) => void;
  onConversionError?: (error: string) => void;
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

// Error types
export interface TTSError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
}

export const TTS_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TTS_SERVICE_UNAVAILABLE: 'TTS_SERVICE_UNAVAILABLE',
  TTS_CONVERSION_FAILED: 'TTS_CONVERSION_FAILED',
  TTS_TIMEOUT: 'TTS_TIMEOUT',
  TTS_UNSUPPORTED_CONTENT: 'TTS_UNSUPPORTED_CONTENT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUDIO_NOT_FOUND: 'AUDIO_NOT_FOUND'
} as const;

export type TTSErrorCode = keyof typeof TTS_ERROR_CODES;

// Settings and configuration
export interface TTSConfig {
  apiBaseUrl: string;
  pollInterval: number;
  maxRetries: number;
  timeout: number;
  defaultSettings: AudioSettings;
}

export const DEFAULT_TTS_CONFIG: TTSConfig = {
  apiBaseUrl: 'http://localhost:5000/api',
  pollInterval: 500,
  maxRetries: 3,
  timeout: 30000,
  defaultSettings: {
    volume: 75,
    playbackSpeed: 1.0
  }
};

// Utility types for TTS operations
export type TTSOperation = 'convert' | 'status' | 'download' | 'stream';

export interface TTSMetrics {
  conversionTime: number;
  audioSize: number;
  providerUsed: string;
  retryCount: number;
}

export interface TTSHistory {
  id: string;
  content: string;
  audioId: string;
  createdAt: string;
  duration: number;
  settings: AudioSettings;
  metrics?: TTSMetrics;
}