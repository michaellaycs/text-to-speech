import { Router } from 'express';
import { TTSController } from '../controllers/TTSController';
// Import session validator when it's available
// import { sessionValidator } from '../middleware/sessionValidator';

const router = Router();
const ttsController = new TTSController();

/**
 * POST /api/tts/convert
 * Convert text to speech
 * 
 * Body: {
 *   content: string (max 2000 chars),
 *   settings?: {
 *     volume?: number (0-100),
 *     playbackSpeed?: number (0.8-1.5),
 *     voice?: string
 *   }
 * }
 * 
 * Headers: X-Session-ID required
 */
router.post('/convert', 
  // sessionValidator, // TODO: Add when session middleware is implemented
  ttsController.convertText
);

/**
 * GET /api/tts/status/:id
 * Get conversion status by ID
 * 
 * Params: id - conversion ID
 */
router.get('/status/:id', ttsController.getStatus);

/**
 * GET /api/tts/providers/status
 * Get status of all TTS providers
 */
router.get('/providers/status', ttsController.getProvidersStatus);

/**
 * POST /api/tts/cleanup
 * Trigger manual cleanup of old conversion data
 * 
 * Body: {
 *   olderThanMinutes?: number (default: 60)
 * }
 */
router.post('/cleanup', ttsController.cleanup);

export default router;