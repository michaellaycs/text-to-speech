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
  generatedAt: Date;
  settings: AudioSettings;
  metadata: {
    fileSize: number;
    format: string;
    ttsService: string;
  };
}

export interface TTSConversionRequest {
  content: string;
  settings?: Partial<AudioSettings>;
}

export interface TTSConversionResult {
  audioBuffer: Buffer;
  duration: number;
  format: string;
  metadata: {
    ttsService: string;
    voice?: string;
    timestamp: Date;
  };
}

export interface ITTSProvider {
  readonly name: string;
  readonly priority: number; // Lower number = higher priority
  
  /**
   * Check if the TTS provider is available and functional
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Get available voices for this provider
   */
  getVoices(): Promise<string[]>;
  
  /**
   * Convert text to speech
   * @param text - Text to convert (max 2000 characters)
   * @param settings - Audio settings for conversion
   * @returns Promise<TTSConversionResult>
   * @throws TTSError on conversion failure
   */
  convert(text: string, settings?: Partial<AudioSettings>): Promise<TTSConversionResult>;
  
  /**
   * Get provider-specific configuration or status
   */
  getStatus(): Promise<{
    available: boolean;
    responseTime?: number;
    errorRate?: number;
    lastCheck: Date;
  }>;
}

export class TTSError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'TTSError';
  }
}

export const TTS_ERROR_CODES = {
  SERVICE_UNAVAILABLE: 'TTS_SERVICE_UNAVAILABLE',
  CONVERSION_FAILED: 'TTS_CONVERSION_FAILED',
  TIMEOUT: 'TTS_TIMEOUT',
  UNSUPPORTED_CONTENT: 'TTS_UNSUPPORTED_CONTENT',
  INVALID_SETTINGS: 'TTS_INVALID_SETTINGS',
  NETWORK_ERROR: 'TTS_NETWORK_ERROR',
  API_KEY_INVALID: 'TTS_API_KEY_INVALID'
} as const;