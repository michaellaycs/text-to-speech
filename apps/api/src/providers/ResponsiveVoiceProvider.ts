import { ITTSProvider, AudioSettings, TTSConversionResult, TTSError, TTS_ERROR_CODES } from './interfaces';

export class ResponsiveVoiceProvider implements ITTSProvider {
  readonly name = 'ResponsiveVoice';
  readonly priority = 5; // Lower priority fallback

  private readonly baseUrl = 'https://responsivevoice.com/responsivevoice/getvoice.php';
  private readonly timeout = 15000;

  async isAvailable(): Promise<boolean> {
    try {
      // Test with a minimal request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const testUrl = `${this.baseUrl}?t=test&tl=en-US&sv=g1&vn=&pitch=0.5&rate=0.5&vol=1`;
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://responsivevoice.org/'
        }
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('ResponsiveVoice availability check failed:', error);
      return false;
    }
  }

  async getVoices(): Promise<string[]> {
    return [
      'US English Female', 'US English Male', 'UK English Female', 'UK English Male',
      'Australian Female', 'Australian Male', 'French Female', 'French Male',
      'German Female', 'German Male', 'Spanish Female', 'Spanish Male',
      'Italian Female', 'Italian Male', 'Portuguese Female', 'Portuguese Male',
      'Russian Female', 'Japanese Female', 'Korean Female', 'Chinese Female'
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
      const voice = this.mapVoiceSettings(settings?.voice);
      const limitedText = text.substring(0, 500); // Reasonable limit for free usage
      
      // ResponsiveVoice API parameters
      const params = new URLSearchParams({
        't': limitedText,
        'tl': this.getLanguageCode(voice),
        'sv': 'g1', // Service version
        'vn': voice,
        'pitch': '0.5',
        'rate': (settings?.playbackSpeed || 1.0).toString(),
        'vol': '1'
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      
      console.log(`ResponsiveVoice Request: ${limitedText.length} characters, voice: ${voice}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://responsivevoice.org/',
          'Accept': 'audio/mpeg, audio/*, */*'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new TTSError(
          `ResponsiveVoice API error: ${response.status} ${response.statusText}`,
          TTS_ERROR_CODES.SERVICE_ERROR,
          this.name
        );
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('audio') && !contentType.includes('mpeg')) {
        const errorText = await response.text();
        throw new TTSError(
          `ResponsiveVoice returned non-audio content: ${errorText.substring(0, 100)}`,
          TTS_ERROR_CODES.SERVICE_ERROR,
          this.name
        );
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const duration = this.estimateAudioDuration(limitedText, settings?.playbackSpeed || 1.0);

      console.log(`ResponsiveVoice conversion successful: ${audioBuffer.length} bytes, ~${Math.round(duration)}s`);

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
          `ResponsiveVoice conversion timeout after ${elapsed}ms`,
          TTS_ERROR_CODES.TIMEOUT,
          this.name,
          error instanceof Error ? error : undefined
        );
      }

      if (error instanceof TTSError) {
        throw error;
      }

      throw new TTSError(
        `ResponsiveVoice conversion failed: ${errorMessage}`,
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
   * Map voice settings to ResponsiveVoice voice names
   */
  private mapVoiceSettings(voice?: string): string {
    if (!voice) return 'US English Female';
    
    const voiceMap: Record<string, string> = {
      'matthew': 'US English Male',
      'joanna': 'US English Female', 
      'brian': 'UK English Male',
      'amy': 'UK English Female',
      'russell': 'Australian Male',
      'nicole': 'Australian Female',
      'spanish': 'Spanish Female',
      'french': 'French Female',
      'german': 'German Female',
      'italian': 'Italian Female',
      'portuguese': 'Portuguese Female',
      'russian': 'Russian Female',
      'japanese': 'Japanese Female',
      'chinese': 'Chinese Female',
      'korean': 'Korean Female'
    };

    return voiceMap[voice.toLowerCase()] || 'US English Female';
  }

  /**
   * Get language code for ResponsiveVoice
   */
  private getLanguageCode(voiceName: string): string {
    if (voiceName.includes('US English') || voiceName.includes('UK English') || voiceName.includes('Australian')) {
      return 'en-US';
    }
    if (voiceName.includes('French')) return 'fr-FR';
    if (voiceName.includes('German')) return 'de-DE';
    if (voiceName.includes('Spanish')) return 'es-ES';
    if (voiceName.includes('Italian')) return 'it-IT';
    if (voiceName.includes('Portuguese')) return 'pt-BR';
    if (voiceName.includes('Russian')) return 'ru-RU';
    if (voiceName.includes('Japanese')) return 'ja-JP';
    if (voiceName.includes('Chinese')) return 'zh-CN';
    if (voiceName.includes('Korean')) return 'ko-KR';
    return 'en-US';
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