import { Request, Response, NextFunction } from 'express';
import { logger } from '@/config/logger';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();

  // Log error with context
  logger.error('Request error:', {
    error: error.message,
    stack: error.stack,
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    sessionId: req.headers['x-session-id']
  });

  // Handle API errors
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
        requestId
      }
    });
    return;
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId
      }
    });
    return;
  }

  // Handle unexpected errors
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: isDevelopment ? { stack: error.stack } : undefined,
      timestamp: new Date().toISOString(),
      requestId
    }
  });
};