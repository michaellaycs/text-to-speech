import { ITTSProvider, AudioSettings, TTSConversionResult, TTSError, TTS_ERROR_CODES } from './interfaces';

/**
 * Web Speech Provider - Server-side placeholder
 * 
 * Note: Web Speech API only works in browsers. This server-side implementation
 * serves as a placeholder and will always indicate unavailability.
 * The actual Web Speech integration will be handled client-side in the frontend.
 */
export class WebSpeechProvider implements ITTSProvider {
  readonly name = 'WebSpeech';
  readonly priority = 1; // Highest priority when available

  async isAvailable(): Promise<boolean> {
    // Web Speech API is only available in browsers, not on server
    return false;
  }

  async getVoices(): Promise<string[]> {
    // Return empty array since this is server-side
    return [];
  }

  async convert(text: string, settings?: Partial<AudioSettings>): Promise<TTSConversionResult> {
    throw new TTSError(
      'Web Speech API is not available on server-side. Use client-side implementation.',
      TTS_ERROR_CODES.SERVICE_UNAVAILABLE,
      this.name
    );
  }

  async getStatus() {
    return {
      available: false,
      responseTime: 0,
      errorRate: 1.0,
      lastCheck: new Date()
    };
  }
}

/**
 * Client-side Web Speech utility functions
 * These would be used in the frontend implementation
 */
export const WebSpeechUtils = {
  /**
   * Check if Web Speech API is available in current browser
   */
  isWebSpeechAvailable(): boolean {
    return typeof window !== 'undefined' && 
           'speechSynthesis' in window && 
           'SpeechSynthesisUtterance' in window;
  },

  /**
   * Get available voices from browser
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.isWebSpeechAvailable()) return [];
    return speechSynthesis.getVoices();
  },

  /**
   * Convert text to speech using browser's Web Speech API
   * This would be implemented in the frontend
   */
  async convertTextToSpeech(
    text: string, 
    settings?: Partial<AudioSettings>
  ): Promise<AudioBuffer> {
    if (!this.isWebSpeechAvailable()) {
      throw new Error('Web Speech API not available');
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply settings
      if (settings?.volume) {
        utterance.volume = settings.volume / 100;
      }
      if (settings?.playbackSpeed) {
        utterance.rate = settings.playbackSpeed;
      }
      if (settings?.voice) {
        const voices = this.getAvailableVoices();
        const selectedVoice = voices.find(v => v.name === settings.voice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.onend = () => {
        // Note: Web Speech API doesn't provide direct audio buffer access
        // This would need additional implementation for audio capture
        resolve(new AudioBuffer({ length: 0, sampleRate: 44100, numberOfChannels: 1 }));
      };

      utterance.onerror = (event) => {
        reject(new Error(`Web Speech synthesis failed: ${event.error}`));
      };

      speechSynthesis.speak(utterance);
    });
  }
};