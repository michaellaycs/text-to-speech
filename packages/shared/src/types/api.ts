// API request/response types
import { AudioSettings } from './audio';
import { ProcessingStatus } from './tts';
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
    stack?: string;
  };
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
}

export interface ConversionRequest {
  content: string;
  settings?: Partial<AudioSettings>;
}

export interface ConversionStatusResponse {
  id: string;
  status: ProcessingStatus;
  progress: number;
}

