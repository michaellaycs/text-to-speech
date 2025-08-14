// Test setup for API
import { logger } from '@/config/logger';

// Reduce log level during tests
logger.level = 'error';

// Clean up temp storage before each test
beforeEach(() => {
  // Test-specific setup can be added here
});

afterEach(() => {
  // Test cleanup can be added here
});