import { ITTSProvider, AudioSettings, TTSConversionResult, TTSError, TTS_ERROR_CODES } from '../providers/interfaces';
import { WebSpeechProvider } from '../providers/WebSpeechProvider';
import { GoogleTTSProvider } from '../providers/GoogleTTSProvider';
import { config } from '../config/environment';

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface ConversionStatus {
  id: string;
  status: ProcessingStatus;
  progress: number; // 0-100
  error?: string;
  startTime: Date;
  endTime?: Date;
}

export interface ConversionRequest {
  id: string;
  content: string;
  settings?: Partial<AudioSettings>;
}

export class TTSOrchestrator {
  private providers: ITTSProvider[];
  private activeConversions = new Map<string, ConversionStatus>();
  private conversionResults = new Map<string, TTSConversionResult>();

  constructor() {
    // Initialize providers in priority order
    this.providers = [
      new WebSpeechProvider(), // Priority 1 - but will be unavailable server-side
      new GoogleTTSProvider(),  // Priority 2 - main fallback
    ];

    // Sort by priority (lower number = higher priority)
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Convert text to speech using the best available provider
   */
  async convert(content: string, settings?: Partial<AudioSettings>): Promise<TTSConversionResult> {
    const conversionId = this.generateConversionId();
    
    // Initialize conversion status
    this.activeConversions.set(conversionId, {
      id: conversionId,
      status: ProcessingStatus.PENDING,
      progress: 0,
      startTime: new Date()
    });

    try {
      // Validate input
      if (!content || content.trim().length === 0) {
        throw new TTSError(
          'Content cannot be empty',
          TTS_ERROR_CODES.UNSUPPORTED_CONTENT,
          'TTSOrchestrator'
        );
      }

      if (content.length > 2000) {
        throw new TTSError(
          `Content too long: ${content.length} characters (max 2000)`,
          TTS_ERROR_CODES.UNSUPPORTED_CONTENT,
          'TTSOrchestrator'
        );
      }

      // Update status to processing
      this.updateConversionStatus(conversionId, ProcessingStatus.PROCESSING, 10);

      // Get available providers
      const availableProviders = await this.getAvailableProviders();
      
      if (availableProviders.length === 0) {
        throw new TTSError(
          'No TTS providers are currently available',
          TTS_ERROR_CODES.SERVICE_UNAVAILABLE,
          'TTSOrchestrator'
        );
      }

      this.updateConversionStatus(conversionId, ProcessingStatus.PROCESSING, 30);

      // Try providers in priority order
      let lastError: TTSError | undefined;
      
      for (const provider of availableProviders) {
        try {
          console.log(`Attempting conversion with ${provider.name}`);
          this.updateConversionStatus(conversionId, ProcessingStatus.PROCESSING, 50);

          const result = await this.attemptConversion(provider, content, settings);
          
          // Success - update status and store result
          this.updateConversionStatus(conversionId, ProcessingStatus.COMPLETED, 100);
          this.conversionResults.set(conversionId, result);
          
          console.log(`Conversion successful with ${provider.name}`);
          return result;
          
        } catch (error) {
          console.warn(`Provider ${provider.name} failed:`, error.message);
          lastError = error instanceof TTSError ? error : new TTSError(
            `Provider ${provider.name} failed: ${error.message}`,
            TTS_ERROR_CODES.CONVERSION_FAILED,
            provider.name,
            error
          );
          
          // Continue to next provider
          continue;
        }
      }

      // All providers failed
      throw lastError || new TTSError(
        'All TTS providers failed',
        TTS_ERROR_CODES.SERVICE_UNAVAILABLE,
        'TTSOrchestrator'
      );

    } catch (error) {
      // Update status to failed
      const ttsError = error instanceof TTSError ? error : new TTSError(
        `Conversion failed: ${error.message}`,
        TTS_ERROR_CODES.CONVERSION_FAILED,
        'TTSOrchestrator',
        error
      );

      this.updateConversionStatus(
        conversionId, 
        ProcessingStatus.FAILED, 
        0, 
        ttsError.message
      );

      throw ttsError;
    }
  }

  /**
   * Get conversion status by ID
   */
  getStatus(id: string): ConversionStatus | null {
    return this.activeConversions.get(id) || null;
  }

  /**
   * Get conversion result by ID
   */
  getResult(id: string): TTSConversionResult | null {
    return this.conversionResults.get(id) || null;
  }

  /**
   * Get all available providers
   */
  async getAvailableProviders(): Promise<ITTSProvider[]> {
    const availableProviders: ITTSProvider[] = [];
    
    for (const provider of this.providers) {
      try {
        const isAvailable = await provider.isAvailable();
        if (isAvailable) {
          availableProviders.push(provider);
        }
      } catch (error) {
        console.warn(`Failed to check availability for ${provider.name}:`, error);
      }
    }

    return availableProviders;
  }

  /**
   * Get provider status summary
   */
  async getProvidersStatus() {
    const statuses = await Promise.allSettled(
      this.providers.map(async provider => ({
        name: provider.name,
        priority: provider.priority,
        ...(await provider.getStatus())
      }))
    );

    return statuses.map(result => 
      result.status === 'fulfilled' ? result.value : {
        name: 'Unknown',
        priority: 999,
        available: false,
        error: result.reason?.message || 'Status check failed',
        lastCheck: new Date()
      }
    );
  }

  /**
   * Clean up old conversion data
   */
  cleanup(olderThanMinutes: number = 60): void {
    const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    
    for (const [id, status] of this.activeConversions) {
      if (status.startTime < cutoffTime) {
        this.activeConversions.delete(id);
        this.conversionResults.delete(id);
      }
    }
  }

  /**
   * Attempt conversion with a specific provider with timeout
   */
  private async attemptConversion(
    provider: ITTSProvider,
    content: string,
    settings?: Partial<AudioSettings>
  ): Promise<TTSConversionResult> {
    const timeoutMs = config.tts.timeout;

    return Promise.race([
      provider.convert(content, settings),
      this.createTimeoutPromise(timeoutMs, provider.name)
    ]);
  }

  /**
   * Create a timeout promise that rejects after specified time
   */
  private createTimeoutPromise(timeoutMs: number, providerName: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new TTSError(
          `Provider ${providerName} timed out after ${timeoutMs}ms`,
          TTS_ERROR_CODES.TIMEOUT,
          providerName
        ));
      }, timeoutMs);
    });
  }

  /**
   * Update conversion status
   */
  private updateConversionStatus(
    id: string,
    status: ProcessingStatus,
    progress: number,
    error?: string
  ): void {
    const existing = this.activeConversions.get(id);
    if (existing) {
      existing.status = status;
      existing.progress = progress;
      existing.error = error;
      
      if (status === ProcessingStatus.COMPLETED || status === ProcessingStatus.FAILED) {
        existing.endTime = new Date();
      }
    }
  }

  /**
   * Generate unique conversion ID
   */
  private generateConversionId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}