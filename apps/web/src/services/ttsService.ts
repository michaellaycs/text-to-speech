// TTS Service - Frontend API client for text-to-speech operations

export interface AudioSettings {
  volume: number; // 0-100
  playbackSpeed: number; // 0.8-1.5
  voice?: string;
}

export interface AudioContent {
  id: string;
  sourceTextId: string;
  filePath: string;
  duration: number;
  generatedAt: string;
  settings: AudioSettings;
  metadata: {
    fileSize: number;
    format: string;
    ttsService: string;
  };
}

export interface ConversionRequest {
  content: string;
  settings?: Partial<AudioSettings>;
}

export interface ConversionStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: string;
  startTime: string;
  endTime?: string;
}

export interface TTSError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

export class TTSService {
  private baseURL: string;
  private sessionId: string | null = null;

  constructor(baseURL: string = 'http://localhost:5000/api') {
    this.baseURL = baseURL;
  }

  /**
   * Set session ID for API requests
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Convert text to speech
   */
  async convertText(
    content: string,
    settings?: Partial<AudioSettings>
  ): Promise<AudioContent> {
    const response = await this.request<AudioContent>('/tts/convert', {
      method: 'POST',
      body: { content, settings }
    });

    return response;
  }

  /**
   * Get conversion status by ID
   */
  async getConversionStatus(id: string): Promise<ConversionStatus> {
    const response = await this.request<ConversionStatus>(`/tts/status/${id}`, {
      method: 'GET'
    });

    return response;
  }

  /**
   * Get TTS providers status
   */
  async getProvidersStatus(): Promise<{
    providers: Array<{
      name: string;
      priority: number;
      available: boolean;
      responseTime?: number;
      errorRate?: number;
      lastCheck: string;
    }>;
    timestamp: string;
  }> {
    const response = await this.request<{
      providers: Array<{
        name: string;
        priority: number;
        available: boolean;
        responseTime?: number;
        errorRate?: number;
        lastCheck: string;
      }>;
      timestamp: string;
    }>('/tts/providers/status', {
      method: 'GET'
    });

    return response;
  }

  /**
   * Get audio stream URL
   */
  getAudioStreamUrl(audioId: string): string {
    return `${this.baseURL}/audio/stream/${audioId}`;
  }

  /**
   * Get audio download URL
   */
  getAudioDownloadUrl(audioId: string): string {
    return `${this.baseURL}/audio/${audioId}`;
  }

  /**
   * Get audio file info
   */
  async getAudioInfo(audioId: string): Promise<{
    id: string;
    size: number;
    format: string;
    duration: number;
    createdAt: string;
    streamUrl: string;
    downloadUrl: string;
    timestamp: string;
  }> {
    const response = await this.request<{
      id: string;
      size: number;
      format: string;
      duration: number;
      createdAt: string;
      streamUrl: string;
      downloadUrl: string;
      timestamp: string;
    }>(`/audio/${audioId}/info`, {
      method: 'GET'
    });

    return response;
  }

  /**
   * Delete audio file
   */
  async deleteAudio(audioId: string): Promise<void> {
    await this.request(`/audio/${audioId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Poll conversion status until complete or failed
   */
  async pollConversionStatus(
    conversionId: string,
    onProgress?: (status: ConversionStatus) => void,
    pollInterval: number = 500
  ): Promise<ConversionStatus> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getConversionStatus(conversionId);
          
          onProgress?.(status);

          if (status.status === 'completed') {
            resolve(status);
            return;
          }

          if (status.status === 'failed') {
            reject(new Error(status.error || 'Conversion failed'));
            return;
          }

          // Continue polling if still processing or pending
          setTimeout(poll, pollInterval);

        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  /**
   * Convert text with automatic retry logic
   */
  async convertTextWithRetry(
    content: string,
    settings?: Partial<AudioSettings>,
    maxRetries: number = 3
  ): Promise<AudioContent> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.convertText(content, settings);
      } catch (error) {
        console.warn(`TTS conversion attempt ${attempt} failed:`, error);
        lastError = error as Error;

        // Don't retry on validation errors
        if (this.isValidationError(error)) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt - 1) * 1000);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Make HTTP request to API
   */
  private async request<T>(
    endpoint: string,
    options: {
      method: 'GET' | 'POST' | 'DELETE';
      body?: any;
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add session ID if available
    if (this.sessionId) {
      headers['X-Session-ID'] = this.sessionId;
    }

    const requestOptions: RequestInit = {
      method: options.method,
      headers,
      ...(options.body && { body: JSON.stringify(options.body) })
    };

    try {
      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        let errorData: TTSError;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            code: 'HTTP_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
            timestamp: new Date().toISOString()
          };
        }

        throw new TTSApiError(errorData);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();

    } catch (error) {
      if (error instanceof TTSApiError) {
        throw error;
      }

      // Network or other errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new TTSApiError({
        code: 'NETWORK_ERROR',
        message: `Request failed: ${errorMessage}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Check if error is a validation error (shouldn't retry)
   */
  private isValidationError(error: any): boolean {
    return error instanceof TTSApiError && 
           error.code === 'VALIDATION_ERROR';
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Custom error class for TTS API errors
 */
export class TTSApiError extends Error {
  public code: string;
  public details?: any;
  public timestamp: string;
  public requestId?: string;

  constructor(errorData: TTSError) {
    super(errorData.message);
    this.name = 'TTSApiError';
    this.code = errorData.code;
    this.details = errorData.details;
    this.timestamp = errorData.timestamp;
    this.requestId = errorData.requestId;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.code) {
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';
      case 'TTS_SERVICE_UNAVAILABLE':
        return 'Text-to-speech service is temporarily unavailable. Please try again later.';
      case 'TTS_TIMEOUT':
        return 'Conversion is taking longer than expected. Please try with shorter text.';
      case 'TTS_CONVERSION_FAILED':
        return 'Failed to convert text to speech. Please try again.';
      case 'NETWORK_ERROR':
        return 'Connection error. Please check your internet connection and try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

// Create singleton instance
export const ttsService = new TTSService();