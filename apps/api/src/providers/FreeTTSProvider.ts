import { ITTSProvider, AudioSettings, TTSConversionResult, TTSError, TTS_ERROR_CODES } from './interfaces';
import fetch from 'node-fetch';

/**
 * FreeTTS Provider - Using free TTS service with no API key required
 * 
 * This provider uses a combination of free TTS services that don't require authentication.
 * Note: Free services may have limitations on usage and quality.
 */
export class FreeTTSProvider implements ITTSProvider {
  readonly name = 'FreeTTS';
  readonly priority = 3; // Medium priority - free service
  
  private readonly baseUrl = 'https://api.streamelements.com/kappa/v2/speech';
  
  async isAvailable(): Promise<boolean> {
    try {
      // Test the service with a simple HEAD request or very short text
      const testUrl = `${this.baseUrl}?voice=Brian&text=test`;
      const response = await fetch(testUrl, {
        method: 'HEAD',
        timeout: 5000
      });
      
      return response.ok;
    } catch (error) {
      console.warn('FreeTTS availability check failed:', error);
      return false;
    }
  }

  async getVoices(): Promise<string[]> {
    // StreamElements TTS supported voices
    return [
      'Brian',    // English (UK) - Male
      'Amy',      // English (UK) - Female
      'Emma',     // English (UK) - Female
      'Geraint',  // English (Wales) - Male
      'Russell',  // English (Australia) - Male
      'Nicole',   // English (Australia) - Female
      'Joey',     // English (US) - Male
      'Justin',   // English (US) - Male
      'Matthew',  // English (US) - Male
      'Ivy',      // English (US) - Female
      'Joanna',   // English (US) - Female
      'Kendra',   // English (US) - Female
      'Kimberly', // English (US) - Female
      'Salli',    // English (US) - Female
      'Raveena',  // English (India) - Female
    ];
  }

  async convert(text: string, settings?: Partial<AudioSettings>): Promise<TTSConversionResult> {
    try {
      // Prepare parameters
      const voice = this.mapVoiceSettings(settings?.voice);
      
      // Limit text length for free service
      const limitedText = text.substring(0, 300); // Keep it short for free service
      
      // StreamElements TTS API
      const url = `${this.baseUrl}?voice=${voice}&text=${encodeURIComponent(limitedText)}`;
      
      console.log(`FreeTTS Request: ${limitedText.length} characters, voice: ${voice}`);
      
      const response = await fetch(url, {
        method: 'GET',
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new TTSError(
          `FreeTTS API error: ${response.status} ${response.statusText}`,
          TTS_ERROR_CODES.SERVICE_ERROR,
          this.name
        );
      }

      // Check if response is audio
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('audio')) {
        throw new TTSError(
          `FreeTTS returned non-audio response: ${contentType}`,
          TTS_ERROR_CODES.CONVERSION_FAILED,
          this.name
        );
      }

      // Get audio buffer
      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      if (audioBuffer.length === 0) {
        throw new TTSError(
          'FreeTTS returned empty audio data',
          TTS_ERROR_CODES.CONVERSION_FAILED,
          this.name
        );
      }

      // Estimate duration (rough calculation: ~150 words per minute)
      const wordCount = limitedText.split(' ').length;
      const estimatedDuration = Math.max(1, Math.round((wordCount / 150) * 60));

      console.log(`FreeTTS conversion successful: ${audioBuffer.length} bytes, ~${estimatedDuration}s`);

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
      console.error('FreeTTS conversion error:', error);
      
      if (error instanceof TTSError) {
        throw error;
      }
      
      // Handle network errors
      if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        throw new TTSError(
          'FreeTTS service is temporarily unavailable. Please check your internet connection.',
          TTS_ERROR_CODES.SERVICE_UNAVAILABLE,
          this.name,
          error
        );
      }
      
      throw new TTSError(
        `FreeTTS conversion failed: ${error.message}`,
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
      responseTime: available ? 2000 : 0, // Estimate 2 seconds for free service
      errorRate: available ? 0.2 : 1.0, // Free services may have higher error rates
      lastCheck: new Date()
    };
  }

  /**
   * Map voice settings to available voices
   */
  private mapVoiceSettings(voice?: string): string {
    if (!voice) return 'Brian';
    
    const voiceMap: Record<string, string> = {
      'english': 'Brian',
      'english-us': 'Joey',
      'english-uk': 'Brian',
      'male': 'Brian',
      'female': 'Amy',
      'brian': 'Brian',
      'amy': 'Amy',
      'joey': 'Joey',
      'joanna': 'Joanna'
    };
    
    return voiceMap[voice.toLowerCase()] || 'Brian';
  }
}