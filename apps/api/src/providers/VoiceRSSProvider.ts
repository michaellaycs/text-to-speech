import { ITTSProvider, AudioSettings, TTSConversionResult, TTSError, TTS_ERROR_CODES } from './interfaces';
import fetch from 'node-fetch';

/**
 * VoiceRSS TTS Provider - Free online TTS service
 * 
 * This provider uses the VoiceRSS API which offers free TTS conversion
 * without requiring API keys for basic usage.
 * API Documentation: http://www.voicerss.org/api/
 */
export class VoiceRSSProvider implements ITTSProvider {
  readonly name = 'VoiceRSS';
  readonly priority = 3; // Medium priority - free service
  
  private readonly baseUrl = 'http://api.voicerss.org';
  private readonly apiKey = 'undefined'; // VoiceRSS provides a demo key
  
  async isAvailable(): Promise<boolean> {
    try {
      // Test with a very short text to check availability
      const testResponse = await fetch(`${this.baseUrl}/?key=${this.apiKey}&hl=en-us&c=MP3&f=44khz_16bit_stereo&src=test`, {
        method: 'GET',
        timeout: 5000
      });
      
      return testResponse.ok && testResponse.headers.get('content-type')?.includes('audio');
    } catch (error) {
      console.warn('VoiceRSS availability check failed:', error);
      return false;
    }
  }

  async getVoices(): Promise<string[]> {
    // VoiceRSS supported voices/languages
    return [
      'en-us', // English (US)
      'en-gb', // English (UK) 
      'en-au', // English (Australia)
      'en-ca', // English (Canada)
      'en-in', // English (India)
      'es-es', // Spanish (Spain)
      'es-mx', // Spanish (Mexico)
      'fr-fr', // French (France)
      'de-de', // German (Germany)
      'it-it', // Italian (Italy)
      'pt-br', // Portuguese (Brazil)
      'ru-ru', // Russian (Russia)
      'ja-jp', // Japanese (Japan)
      'ko-kr', // Korean (Korea)
      'zh-cn', // Chinese (Mandarin)
    ];
  }

  async convert(text: string, settings?: Partial<AudioSettings>): Promise<TTSConversionResult> {
    try {
      // Prepare parameters
      const voice = this.mapVoiceSettings(settings?.voice);
      const speed = this.mapSpeedSettings(settings?.playbackSpeed);
      
      // VoiceRSS API parameters
      const params = new URLSearchParams({
        key: this.apiKey,
        hl: voice,
        c: 'MP3',
        f: '44khz_16bit_stereo',
        src: text.substring(0, 500), // VoiceRSS has text length limits for free tier
        r: speed.toString()
      });

      const url = `${this.baseUrl}/?${params.toString()}`;
      
      console.log(`VoiceRSS TTS Request: ${text.length} characters, voice: ${voice}`);
      
      const response = await fetch(url, {
        method: 'GET',
        timeout: 30000 // 30 second timeout for audio generation
      });

      if (!response.ok) {
        throw new TTSError(
          `VoiceRSS API error: ${response.status} ${response.statusText}`,
          TTS_ERROR_CODES.SERVICE_ERROR,
          this.name
        );
      }

      // Check if response is audio
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('audio')) {
        const errorText = await response.text();
        throw new TTSError(
          `VoiceRSS returned non-audio response: ${errorText}`,
          TTS_ERROR_CODES.CONVERSION_FAILED,
          this.name
        );
      }

      // Get audio buffer
      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      if (audioBuffer.length === 0) {
        throw new TTSError(
          'VoiceRSS returned empty audio data',
          TTS_ERROR_CODES.CONVERSION_FAILED,
          this.name
        );
      }

      // Estimate duration (rough calculation: ~150 words per minute)
      const wordCount = text.split(' ').length;
      const estimatedDuration = Math.max(1, Math.round((wordCount / 150) * 60));

      console.log(`VoiceRSS conversion successful: ${audioBuffer.length} bytes, ~${estimatedDuration}s`);

      return {
        audioBuffer,
        duration: estimatedDuration,
        format: 'mp3',
        metadata: {
          ttsService: this.name,
          voice: voice,
          timestamp: new Date()
        }
      };

    } catch (error) {
      console.error('VoiceRSS conversion error:', error);
      
      if (error instanceof TTSError) {
        throw error;
      }
      
      // Handle network errors
      if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        throw new TTSError(
          'VoiceRSS service is temporarily unavailable. Please check your internet connection.',
          TTS_ERROR_CODES.SERVICE_UNAVAILABLE,
          this.name,
          error
        );
      }
      
      throw new TTSError(
        `VoiceRSS conversion failed: ${error.message}`,
        TTS_ERROR_CODES.CONVERSION_FAILED,
        this.name,
        error
      );
    }
  }

  async getStatus() {
    const available = await this.isAvailable();
    return {
      available,
      responseTime: available ? 1000 : 0, // Estimate 1 second for free service
      errorRate: available ? 0.1 : 1.0, // Free services may have higher error rates
      lastCheck: new Date()
    };
  }

  /**
   * Map voice settings to VoiceRSS language codes
   */
  private mapVoiceSettings(voice?: string): string {
    if (!voice) return 'en-us';
    
    const voiceMap: Record<string, string> = {
      'english': 'en-us',
      'english-us': 'en-us',
      'english-uk': 'en-gb',
      'spanish': 'es-es',
      'french': 'fr-fr',
      'german': 'de-de',
      'italian': 'it-it',
      'portuguese': 'pt-br',
      'russian': 'ru-ru',
      'japanese': 'ja-jp',
      'korean': 'ko-kr',
      'chinese': 'zh-cn'
    };
    
    return voiceMap[voice.toLowerCase()] || voice.toLowerCase() || 'en-us';
  }

  /**
   * Map playback speed to VoiceRSS rate (-10 to 10)
   */
  private mapSpeedSettings(speed?: number): number {
    if (!speed) return 0;
    
    // Convert 0.8-1.5 range to -10 to 10 range
    if (speed < 0.8) return -10;
    if (speed > 1.5) return 10;
    
    // Linear mapping: 0.8 -> -10, 1.0 -> 0, 1.5 -> 10
    return Math.round((speed - 1.0) * 20);
  }
}