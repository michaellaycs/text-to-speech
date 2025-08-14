import request from 'supertest';
import express from 'express';
import { healthRouter } from './health';

const app = express();
app.use('/api/health', healthRouter);

describe('Health endpoint', () => {
  test('GET /api/health should return healthy status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
    expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
  });

  test('should return valid timestamp format', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    const timestamp = response.body.timestamp;
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});