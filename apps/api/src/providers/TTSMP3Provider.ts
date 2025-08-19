import { ITTSProvider, AudioSettings, TTSConversionResult, TTSError, TTS_ERROR_CODES } from './interfaces';

export class TTSMP3Provider implements ITTSProvider {
  readonly name = 'TTSMP3';
  readonly priority = 1.5; // High priority - good free service

  private readonly timeout = 20000;
  private readonly baseUrl = 'https://ttsmp3.com/makemp3_new.php';

  async isAvailable(): Promise<boolean> {
    try {
      // Test with a minimal request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: 'msg=test&lang=Joanna&source=ttsmp3',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('TTSMP3 availability check failed:', error);
      return false;
    }
  }

  async getVoices(): Promise<string[]> {
    return [
      'Joanna', 'Matthew', 'Ivy', 'Justin', 'Kendra', 'Kimberly',
      'Salli', 'Joey', 'Nicole', 'Russell', 'Amy', 'Brian',
      'Emma', 'Raveena', 'Aditi', 'Enrique', 'Conchita', 'Geraint'
    ];
  }

  async convert(text: string, settings?: Partial<AudioSettings>): Promise<TTSConversionResult> {
    if (text.length > 3000) {
      throw new TTSError(
        `Text too long: ${text.length} characters (max 3000 for TTSMP3)`,
        TTS_ERROR_CODES.UNSUPPORTED_CONTENT,
        this.name
      );
    }

    const startTime = Date.now();

    try {
      const voice = this.mapVoiceSettings(settings?.voice);
      
      console.log(`TTSMP3 Request: ${text.length} characters, voice: ${voice}`);

      // Step 1: Request audio generation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const requestBody = new URLSearchParams({
        'msg': text,
        'lang': voice,
        'source': 'ttsmp3'
      });

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://ttsmp3.com/',
          'Origin': 'https://ttsmp3.com'
        },
        body: requestBody.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new TTSError(
          `TTSMP3 API error: ${response.status} ${response.statusText}`,
          TTS_ERROR_CODES.SERVICE_ERROR,
          this.name
        );
      }

      const responseData = await response.json();
      
      if (!responseData.URL) {
        throw new TTSError(
          `TTSMP3 did not return audio URL: ${JSON.stringify(responseData)}`,
          TTS_ERROR_CODES.SERVICE_ERROR,
          this.name
        );
      }

      // Step 2: Download the generated audio
      const audioUrl = responseData.URL;
      console.log(`TTSMP3 audio URL: ${audioUrl}`);

      const audioController = new AbortController();
      const audioTimeoutId = setTimeout(() => audioController.abort(), 15000);

      const audioResponse = await fetch(audioUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: audioController.signal,
      });

      clearTimeout(audioTimeoutId);

      if (!audioResponse.ok) {
        throw new TTSError(
          `Failed to download audio from TTSMP3: ${audioResponse.status}`,
          TTS_ERROR_CODES.SERVICE_ERROR,
          this.name
        );
      }

      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      
      if (audioBuffer.length < 1000) {
        throw new TTSError(
          `TTSMP3 returned suspiciously small audio file: ${audioBuffer.length} bytes`,
          TTS_ERROR_CODES.SERVICE_ERROR,
          this.name
        );
      }

      const duration = this.estimateAudioDuration(text, settings?.playbackSpeed || 1.0);

      console.log(`TTSMP3 conversion successful: ${audioBuffer.length} bytes, ~${Math.round(duration)}s`);

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
          processedTextLength: text.length
        }
      };

    } catch (error) {
      const elapsed = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if ((error instanceof Error && error.name === 'AbortError') || elapsed >= this.timeout) {
        throw new TTSError(
          `TTSMP3 conversion timeout after ${elapsed}ms`,
          TTS_ERROR_CODES.TIMEOUT,
          this.name,
          error instanceof Error ? error : undefined
        );
      }

      if (error instanceof TTSError) {
        throw error;
      }

      throw new TTSError(
        `TTSMP3 conversion failed: ${errorMessage}`,
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
   * Map voice settings to TTSMP3 voice names
   */
  private mapVoiceSettings(voice?: string): string {
    if (!voice) return 'Joanna';
    
    const voiceMap: Record<string, string> = {
      'matthew': 'Matthew',
      'joanna': 'Joanna', 
      'brian': 'Brian',
      'amy': 'Amy',
      'russell': 'Russell',
      'nicole': 'Nicole',
      'ivy': 'Ivy',
      'justin': 'Justin',
      'kendra': 'Kendra',
      'kimberly': 'Kimberly',
      'salli': 'Salli',
      'joey': 'Joey',
      'emma': 'Emma',
      'raveena': 'Raveena',
      'aditi': 'Aditi',
      'enrique': 'Enrique',
      'conchita': 'Conchita',
      'geraint': 'Geraint'
    };

    return voiceMap[voice.toLowerCase()] || 'Joanna';
  }

  /**
   * Estimate audio duration based on text length and speaking rate
   */
  private estimateAudioDuration(text: string, speakingRate: number): number {
    const wordCount = text.split(/\s+/).length;
    const wordsPerMinute = 150 * speakingRate; // Average speaking rate
    const baseDurationMinutes = wordCount / wordsPerMinute;
    const baseDurationSeconds = baseDurationMinutes * 60;
    
    // Add buffer for processing and ensure minimum duration
    return Math.max(2, baseDurationSeconds * 1.1);
  }
}