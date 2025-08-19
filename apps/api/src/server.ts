import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';
import { healthRouter } from '@/routes/health';
import ttsRouter from '@/routes/tts';
import audioRouter from '@/routes/audio';
import { logger } from '@/config/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    process.env.CORS_ORIGIN
  ].filter((origin): origin is string => Boolean(origin)),
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Routes
app.use('/api/health', healthRouter);
app.use('/api/tts', ttsRouter);
app.use('/api/audio', audioRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown'
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`StandUp Voice API server running on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

export { app };