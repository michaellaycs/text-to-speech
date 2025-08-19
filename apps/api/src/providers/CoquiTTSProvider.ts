import { ITTSProvider, AudioSettings, TTSConversionResult, TTSError, TTS_ERROR_CODES } from './interfaces';

export class CoquiTTSProvider implements ITTSProvider {
  readonly name = 'CoquiTTS';
  readonly priority = 1.5; // High priority - between WebSpeech and Google

  private readonly timeout = 25000;
  // Using free Hugging Face inference API for Coqui models
  private readonly baseUrl = 'https://api-inference.huggingface.co/models';
  private readonly defaultModel = 'coqui/XTTS-v2'; // High-quality multilingual model

  async isAvailable(): Promise<boolean> {
    // Disable for now due to Hugging Face API authentication requirements
    return false;
    
    try {
      // Test with a minimal request to Hugging Face API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      // Use a truly free public API instead
      const response = await fetch('https://ttsmp3.com/makemp3_new.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'msg=test&lang=Joanna&source=ttsmp3',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.status < 400;
    } catch (error) {
      console.warn('CoquiTTS availability check failed:', error);
      return false;
    }
  }

  async getVoices(): Promise<string[]> {
    return [
      'facebook/fastspeech2-en-ljspeech',
      'microsoft/speecht5_tts', 
      'kakao-enterprise/vits-ljs',
      'facebook/mms-tts-eng',
      'suno/bark-small'
    ];
  }

  async convert(text: string, settings?: Partial<AudioSettings>): Promise<TTSConversionResult> {
    if (text.length > 1000) {
      throw new TTSError(
        `Text too long: ${text.length} characters (max 1000 for Hugging Face API)`,
        TTS_ERROR_CODES.UNSUPPORTED_CONTENT,
        this.name
      );
    }

    const startTime = Date.now();

    try {
      // Select model
      const model = this.mapVoiceSettings(settings?.voice);
      const limitedText = text.substring(0, 500); // Conservative limit for free API
      
      console.log(`CoquiTTS Request: ${limitedText.length} characters, model: ${model}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/${model}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'StandUpVoice/1.0'
        },
        body: JSON.stringify({ 
          inputs: limitedText,
          options: {
            wait_for_model: true
          }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 503) {
          throw new TTSError(
            'CoquiTTS model is loading, please try again in a moment',
            TTS_ERROR_CODES.SERVICE_UNAVAILABLE,
            this.name
          );
        }
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new TTSError(
          `CoquiTTS API error: ${response.status} - ${errorText}`,
          TTS_ERROR_CODES.SERVICE_ERROR,
          this.name
        );
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('audio') && !contentType.includes('application/octet-stream')) {
        const errorText = await response.text();
        throw new TTSError(
          `CoquiTTS returned non-audio content: ${errorText.substring(0, 100)}`,
          TTS_ERROR_CODES.SERVICE_ERROR,
          this.name
        );
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      if (audioBuffer.length < 1000) {
        throw new TTSError(
          `CoquiTTS returned suspiciously small audio file: ${audioBuffer.length} bytes`,
          TTS_ERROR_CODES.SERVICE_ERROR,
          this.name
        );
      }

      const duration = this.estimateAudioDuration(limitedText, settings?.playbackSpeed || 1.0);

      console.log(`CoquiTTS conversion successful: ${audioBuffer.length} bytes, ~${Math.round(duration)}s`);

      return {
        audioBuffer,
        duration,
        format: 'wav', // Hugging Face typically returns WAV
        metadata: {
          ttsService: this.name,
          voice: model,
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
          `CoquiTTS conversion timeout after ${elapsed}ms`,
          TTS_ERROR_CODES.TIMEOUT,
          this.name,
          error instanceof Error ? error : undefined
        );
      }

      if (error instanceof TTSError) {
        throw error;
      }

      throw new TTSError(
        `CoquiTTS conversion failed: ${errorMessage}`,
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
   * Map voice settings to available Hugging Face TTS models
   */
  private mapVoiceSettings(voice?: string): string {
    if (!voice) return 'facebook/fastspeech2-en-ljspeech';
    
    const voiceMap: Record<string, string> = {
      'fastspeech': 'facebook/fastspeech2-en-ljspeech',
      'fastspeech2': 'facebook/fastspeech2-en-ljspeech',
      'speecht5': 'microsoft/speecht5_tts',
      'microsoft': 'microsoft/speecht5_tts',
      'vits': 'kakao-enterprise/vits-ljs',
      'kakao': 'kakao-enterprise/vits-ljs',
      'mms': 'facebook/mms-tts-eng',
      'facebook': 'facebook/mms-tts-eng',
      'bark': 'suno/bark-small',
      'suno': 'suno/bark-small',
      'ljspeech': 'facebook/fastspeech2-en-ljspeech',
      'english': 'facebook/fastspeech2-en-ljspeech'
    };

    // Check if voice is already a model name
    if (voice.includes('/')) {
      return voice;
    }

    return voiceMap[voice.toLowerCase()] || 'facebook/fastspeech2-en-ljspeech';
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