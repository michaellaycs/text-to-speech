import { Request, Response, NextFunction } from 'express';
import { logger } from '@/config/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  
  // Add request ID to headers for downstream use
  req.headers['x-request-id'] = requestId;
  res.set('X-Request-ID', requestId);

  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length'),
    sessionId: req.headers['x-session-id']
  });

  // Override res.end to log response
  const originalEnd = res.end;
  (res as any).end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length')
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};