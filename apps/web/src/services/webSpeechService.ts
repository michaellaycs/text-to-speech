// Web Speech API Service - Client-side text-to-speech using browser's built-in TTS

import type { AudioSettings } from './ttsService';

export interface WebSpeechCapabilities {
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  canPause: boolean;
  canResume: boolean;
}

export class WebSpeechService {
  private synthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.initializeVoices();
    } else {
      throw new Error('Web Speech API not supported in this browser');
    }
  }

  /**
   * Check Web Speech API capabilities
   */
  getCapabilities(): WebSpeechCapabilities {
    const isSupported = typeof window !== 'undefined' && 
                       'speechSynthesis' in window && 
                       'SpeechSynthesisUtterance' in window;

    return {
      isSupported,
      voices: isSupported ? this.synthesis.getVoices() : [],
      canPause: isSupported,
      canResume: isSupported
    };
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      let voices = this.synthesis.getVoices();
      
      if (voices.length > 0) {
        resolve(voices);
        return;
      }

      // Some browsers load voices asynchronously
      const handleVoicesChanged = () => {
        voices = this.synthesis.getVoices();
        if (voices.length > 0) {
          this.synthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          resolve(voices);
        }
      };

      this.synthesis.addEventListener('voiceschanged', handleVoicesChanged);
      
      // Fallback timeout
      setTimeout(() => {
        this.synthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        resolve(this.synthesis.getVoices());
      }, 1000);
    });
  }

  /**
   * Convert text to speech and play it
   */
  async speak(
    text: string, 
    settings?: Partial<AudioSettings>,
    onProgress?: (progress: number) => void,
    onComplete?: () => void,
    onError?: (error: string) => void
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        // Cancel any current speech
        this.stop();

        if (!text.trim()) {
          reject(new Error('Text content cannot be empty'));
          return;
        }

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance = utterance;

        // Apply settings
        if (settings?.volume !== undefined) {
          utterance.volume = Math.max(0, Math.min(1, settings.volume / 100));
        }

        if (settings?.playbackSpeed !== undefined) {
          utterance.rate = Math.max(0.1, Math.min(3, settings.playbackSpeed));
        }

        if (settings?.voice) {
          const voices = this.synthesis.getVoices();
          const selectedVoice = voices.find(v => v.name === settings.voice);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        }

        // Set up event handlers
        let hasStarted = false;
        let progressInterval: NodeJS.Timeout | null = null;

        utterance.onstart = () => {
          hasStarted = true;
          onProgress?.(0);
          
          // Simulate progress since Web Speech API doesn't provide real progress
          if (onProgress) {
            const duration = this.estimateDuration(text, utterance.rate);
            const interval = Math.max(100, duration / 20); // Update 20 times during speech
            let elapsed = 0;
            
            progressInterval = setInterval(() => {
              elapsed += interval;
              const progress = Math.min(95, (elapsed / duration) * 100);
              onProgress(progress);
              
              if (elapsed >= duration) {
                clearInterval(progressInterval!);
              }
            }, interval);
          }
        };

        utterance.onend = () => {
          if (progressInterval) clearInterval(progressInterval);
          onProgress?.(100);
          onComplete?.();
          this.currentUtterance = null;
          resolve();
        };

        utterance.onerror = (event) => {
          if (progressInterval) clearInterval(progressInterval);
          const errorMessage = `Speech synthesis failed: ${event.error}`;
          onError?.(errorMessage);
          this.currentUtterance = null;
          reject(new Error(errorMessage));
        };

        utterance.onpause = () => {
          if (progressInterval) clearInterval(progressInterval);
        };

        utterance.onresume = () => {
          // Resume progress simulation if needed
          if (onProgress && !progressInterval) {
            // Re-implement progress tracking on resume if needed
          }
        };

        // Start speaking
        this.synthesis.speak(utterance);

        // Fallback timeout in case onstart never fires
        setTimeout(() => {
          if (!hasStarted && this.currentUtterance === utterance) {
            const errorMessage = 'Speech synthesis failed to start';
            onError?.(errorMessage);
            this.currentUtterance = null;
            reject(new Error(errorMessage));
          }
        }, 1000);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Speech synthesis failed';
        onError?.(errorMessage);
        reject(new Error(errorMessage));
      }
    });
  }

  /**
   * Stop current speech
   */
  stop(): void {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    this.currentUtterance = null;
  }

  /**
   * Pause current speech
   */
  pause(): void {
    if (this.synthesis.speaking && !this.synthesis.paused) {
      this.synthesis.pause();
    }
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    if (this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.synthesis.speaking;
  }

  /**
   * Check if currently paused
   */
  isPaused(): boolean {
    return this.synthesis.paused;
  }

  /**
   * Initialize voices (call this on component mount)
   */
  private async initializeVoices(): Promise<void> {
    if (this.isInitialized) return;
    
    await this.getVoices(); // This will wait for voices to load
    this.isInitialized = true;
  }

  /**
   * Estimate speech duration based on text and rate
   */
  private estimateDuration(text: string, rate: number = 1): number {
    // Average speaking rate is ~150 words per minute at rate 1.0
    const wordCount = text.split(/\s+/).length;
    const baseWpm = 150 * rate;
    const baseDurationMinutes = wordCount / baseWpm;
    const baseDurationMs = baseDurationMinutes * 60 * 1000;
    
    // Add time for punctuation pauses and ensure minimum duration
    return Math.max(1000, baseDurationMs * 1.2);
  }

  /**
   * Get recommended voices for comedy content
   */
  async getComedyVoices(): Promise<SpeechSynthesisVoice[]> {
    const voices = await this.getVoices();
    
    // Prefer English voices with good quality
    return voices.filter(voice => 
      voice.lang.startsWith('en-') && 
      (voice.name.includes('Google') || 
       voice.name.includes('Microsoft') || 
       voice.localService === false) // Cloud voices tend to be higher quality
    ).slice(0, 5); // Return top 5 options
  }
}

// Singleton instance
let webSpeechService: WebSpeechService | null = null;

export function getWebSpeechService(): WebSpeechService {
  if (!webSpeechService) {
    webSpeechService = new WebSpeechService();
  }
  return webSpeechService;
}

export function isWebSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 
         'speechSynthesis' in window && 
         'SpeechSynthesisUtterance' in window;
}