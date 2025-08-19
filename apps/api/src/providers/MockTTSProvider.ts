import { ITTSProvider, AudioSettings, TTSConversionResult, TTSError, TTS_ERROR_CODES } from './interfaces';
import fs from 'fs/promises';
import path from 'path';

/**
 * Mock TTS Provider for testing
 * 
 * This creates a fake audio file to simulate TTS conversion
 * for testing the complete workflow without requiring external APIs
 */
export class MockTTSProvider implements ITTSProvider {
  readonly name = 'MockTTS';
  readonly priority = 10; // Low priority, only for testing

  async isAvailable(): Promise<boolean> {
    return true; // Always available for testing
  }

  async getVoices(): Promise<string[]> {
    return ['Test Voice 1', 'Test Voice 2'];
  }

  async convert(text: string, settings?: Partial<AudioSettings>): Promise<TTSConversionResult> {
    // Simulate processing time
    await this.delay(500);
    
    // Create a minimal MP3 file content (not a real MP3, just for testing)
    const mockAudioContent = Buffer.from(
      `Mock Audio Content for: "${text}"\nSettings: ${JSON.stringify(settings || {})}\nGenerated at: ${new Date().toISOString()}`,
      'utf-8'
    );

    // Calculate mock duration based on text length (roughly 150 words per minute)
    const wordCount = text.split(' ').length;
    const estimatedDuration = Math.max(1, Math.round((wordCount / 150) * 60));

    return {
      audioBuffer: mockAudioContent,
      duration: estimatedDuration,
      format: 'mp3',
      metadata: {
        ttsService: this.name,
        voice: settings?.voice || 'Test Voice 1',
        timestamp: new Date()
      }
    };
  }

  async getStatus() {
    return {
      available: true,
      responseTime: 200, // Mock 200ms response time
      errorRate: 0,
      lastCheck: new Date()
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}