import { ITTSProvider, AudioSettings, TTSConversionResult, TTSError, TTS_ERROR_CODES } from './interfaces';
import { config } from '../config/environment';

interface GoogleTTSRequest {
  input: {
    text: string;
  };
  voice: {
    languageCode: string;
    name?: string;
    ssmlGender?: 'NEUTRAL' | 'FEMALE' | 'MALE';
  };
  audioConfig: {
    audioEncoding: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
    speakingRate?: number;
    volumeGainDb?: number;
  };
}

interface GoogleTTSResponse {
  audioContent: string; // Base64 encoded audio
}

export class GoogleTTSProvider implements ITTSProvider {
  readonly name = 'GoogleTTS';
  readonly priority = 2; // Second priority after Web Speech

  private apiKey: string;
  private baseUrl = 'https://texttospeech.googleapis.com/v1';
  private timeout: number;

  constructor() {
    this.apiKey = config.tts.googleApiKey || '';
    this.timeout = config.tts.timeout;
    
    if (!this.apiKey) {
      console.warn('Google TTS API key not configured. Provider will be unavailable.');
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      // Test API availability with a simple voices list request
      const response = await fetch(`${this.baseUrl}/voices?key=${this.apiKey}`, {
        method: 'GET',
        timeout: 2000,
      });
      return response.ok;
    } catch (error) {
      console.error('Google TTS availability check failed:', error);
      return false;
    }
  }

  async getVoices(): Promise<string[]> {
    if (!this.apiKey) return [];

    try {
      const response = await fetch(`${this.baseUrl}/voices?key=${this.apiKey}`, {
        method: 'GET',
        timeout: 2000,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.voices?.map((voice: any) => voice.name) || [];
    } catch (error) {
      console.error('Failed to fetch Google TTS voices:', error);
      return [];
    }
  }

  async convert(text: string, settings?: Partial<AudioSettings>): Promise<TTSConversionResult> {
    if (!this.apiKey) {
      throw new TTSError(
        'Google TTS API key not configured',
        TTS_ERROR_CODES.API_KEY_INVALID,
        this.name
      );
    }

    if (text.length > 2000) {
      throw new TTSError(
        `Text too long: ${text.length} characters (max 2000)`,
        TTS_ERROR_CODES.UNSUPPORTED_CONTENT,
        this.name
      );
    }

    const startTime = Date.now();

    try {
      const request: GoogleTTSRequest = {
        input: { text },
        voice: {
          languageCode: 'en-US',
          name: settings?.voice,
          ssmlGender: 'NEUTRAL'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: settings?.playbackSpeed || 1.0,
          volumeGainDb: settings?.volume ? this.convertVolumeToDb(settings.volume) : 0
        }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/text:synthesize?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new TTSError(
          `Google TTS API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`,
          TTS_ERROR_CODES.CONVERSION_FAILED,
          this.name
        );
      }

      const data: GoogleTTSResponse = await response.json();
      const audioBuffer = Buffer.from(data.audioContent, 'base64');
      const duration = this.estimateAudioDuration(text, settings?.playbackSpeed || 1.0);

      return {
        audioBuffer,
        duration,
        format: 'mp3',
        metadata: {
          ttsService: this.name,
          voice: settings?.voice,
          timestamp: new Date()
        }
      };

    } catch (error) {
      const elapsed = Date.now() - startTime;
      
      if (error.name === 'AbortError' || elapsed >= this.timeout) {
        throw new TTSError(
          `Google TTS conversion timeout after ${elapsed}ms`,
          TTS_ERROR_CODES.TIMEOUT,
          this.name,
          error
        );
      }

      if (error instanceof TTSError) {
        throw error;
      }

      throw new TTSError(
        `Google TTS conversion failed: ${error.message}`,
        TTS_ERROR_CODES.CONVERSION_FAILED,
        this.name,
        error
      );
    }
  }

  async getStatus() {
    const startTime = Date.now();
    const available = await this.isAvailable();
    const responseTime = Date.now() - startTime;

    return {
      available,
      responseTime,
      errorRate: 0, // Would be calculated over time in production
      lastCheck: new Date()
    };
  }

  /**
   * Convert volume (0-100) to decibel gain for Google TTS
   */
  private convertVolumeToDb(volume: number): number {
    // Convert 0-100 volume to -20db to +6db range
    // 75 (default) = 0db, 0 = -20db, 100 = +6db
    const normalized = Math.max(0, Math.min(100, volume));
    if (normalized === 75) return 0;
    if (normalized < 75) {
      return -20 + (normalized / 75) * 20;
    } else {
      return ((normalized - 75) / 25) * 6;
    }
  }

  /**
   * Estimate audio duration based on text length and speaking rate
   * Average speaking rate: ~150 words per minute at normal speed
   */
  private estimateAudioDuration(text: string, speakingRate: number): number {
    const wordCount = text.split(/\s+/).length;
    const wordsPerMinute = 150 * speakingRate;
    const baseDurationMinutes = wordCount / wordsPerMinute;
    const baseDurationSeconds = baseDurationMinutes * 60;
    
    // Add buffer for punctuation pauses and ensure minimum duration
    return Math.max(1, baseDurationSeconds * 1.1);
  }
}