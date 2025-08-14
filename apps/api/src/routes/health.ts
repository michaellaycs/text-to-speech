import { Router, Request, Response } from 'express';

interface HealthCheckResponse {
  status: string;
  timestamp: string;
}

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response<HealthCheckResponse>) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});