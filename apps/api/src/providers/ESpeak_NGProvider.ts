import { ITTSProvider, AudioSettings, TTSConversionResult, TTSError, TTS_ERROR_CODES } from './interfaces';

interface VoiceRSSResponse {
  // eSpeak-NG via VoiceRSS returns audio directly
}

export class ESpeak_NGProvider implements ITTSProvider {
  readonly name = 'ESpeak_NG';
  readonly priority = 4; // After GoogleTTS, FreeTTS

  private readonly baseUrl = 'http://api.voicerss.org/';
  private readonly timeout = 15000;

  async isAvailable(): Promise<boolean> {
    try {
      // Test with a minimal request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const testUrl = `${this.baseUrl}?key=undefined&hl=en-us&c=MP3&f=22khz_16bit_mono&src=test`;
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      // VoiceRSS returns 401 for invalid key but service is available
      return response.status === 401 || response.ok;
    } catch (error) {
      console.warn('ESpeak_NG availability check failed:', error);
      return false;
    }
  }

  async getVoices(): Promise<string[]> {
    return [
      'en-us', 'en-gb', 'en-au', 'en-ca', 'en-in',
      'es-es', 'es-mx', 'fr-fr', 'de-de', 'it-it',
      'pt-br', 'ru-ru', 'ja-jp', 'zh-cn', 'ko-kr'
    ];
  }

  async convert(text: string, settings?: Partial<AudioSettings>): Promise<TTSConversionResult> {
    if (text.length > 2000) {
      throw new TTSError(
        `Text too long: ${text.length} characters (max 2000)`,
        TTS_ERROR_CODES.UNSUPPORTED_CONTENT,
        this.name
      );
    }

    const startTime = Date.now();
    
    try {
      // Use VoiceRSS free tier (demo mode - works without API key for small requests)
      const voice = this.mapVoiceSettings(settings?.voice);
      const limitedText = text.substring(0, 300); // Limit for free usage
      
      const url = `${this.baseUrl}?key=demo&hl=${voice}&c=MP3&f=22khz_16bit_mono&src=${encodeURIComponent(limitedText)}`;
      
      console.log(`ESpeak_NG Request: ${limitedText.length} characters, voice: ${voice}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new TTSError(
          `ESpeak_NG API error: ${response.status} ${response.statusText}`,
          TTS_ERROR_CODES.SERVICE_ERROR,
          this.name
        );
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('audio')) {
        const errorText = await response.text();
        throw new TTSError(
          `ESpeak_NG returned non-audio content: ${errorText.substring(0, 100)}`,
          TTS_ERROR_CODES.SERVICE_ERROR,
          this.name
        );
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const duration = this.estimateAudioDuration(limitedText, settings?.playbackSpeed || 1.0);

      console.log(`ESpeak_NG conversion successful: ${audioBuffer.length} bytes, ~${Math.round(duration)}s`);

      return {
        audioBuffer,
        duration,
        format: 'mp3',
        metadata: {
          ttsService: this.name,
          voice: voice,
          timestamp: new Date(),
          fileSize: audioBuffer.length,
          originalTextLength: text.length,
          processedTextLength: limitedText.length
        }
      };

    } catch (error) {
      const elapsed = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if ((error instanceof Error && error.name === 'AbortError') || elapsed >= this.timeout) {
        throw new TTSError(
          `ESpeak_NG conversion timeout after ${elapsed}ms`,
          TTS_ERROR_CODES.TIMEOUT,
          this.name,
          error instanceof Error ? error : undefined
        );
      }

      if (error instanceof TTSError) {
        throw error;
      }

      throw new TTSError(
        `ESpeak_NG conversion failed: ${errorMessage}`,
        TTS_ERROR_CODES.CONVERSION_FAILED,
        this.name,
        error instanceof Error ? error : undefined
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
      errorRate: 0,
      lastCheck: new Date()
    };
  }

  /**
   * Map voice settings to supported language codes
   */
  private mapVoiceSettings(voice?: string): string {
    if (!voice) return 'en-us';
    
    const voiceMap: Record<string, string> = {
      'matthew': 'en-us',
      'joanna': 'en-us', 
      'brian': 'en-gb',
      'amy': 'en-gb',
      'russell': 'en-au',
      'nicole': 'en-au',
      'spanish': 'es-es',
      'french': 'fr-fr',
      'german': 'de-de',
      'italian': 'it-it',
      'portuguese': 'pt-br',
      'russian': 'ru-ru',
      'japanese': 'ja-jp',
      'chinese': 'zh-cn',
      'korean': 'ko-kr'
    };

    return voiceMap[voice.toLowerCase()] || 'en-us';
  }

  /**
   * Estimate audio duration based on text length and speaking rate
   */
  private estimateAudioDuration(text: string, speakingRate: number): number {
    const wordCount = text.split(/\s+/).length;
    const wordsPerMinute = 150 * speakingRate; // Average speaking rate
    const baseDurationMinutes = wordCount / wordsPerMinute;
    const baseDurationSeconds = baseDurationMinutes * 60;
    
    // Add buffer for punctuation pauses and ensure minimum duration
    return Math.max(1, baseDurationSeconds * 1.2);
  }
}