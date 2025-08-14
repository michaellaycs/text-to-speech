import { Router } from 'express';
import { AudioController } from '../controllers/AudioController';

const router = Router();
const audioController = new AudioController();

/**
 * GET /api/audio/stream/:id
 * Stream audio file for web playback with range support
 * 
 * Params: id - audio file ID
 * Headers: Range (optional) for partial content requests
 * 
 * Response: 200 (full content) or 206 (partial content)
 * Content-Type: audio/mpeg, audio/wav, etc.
 */
router.get('/stream/:id', audioController.streamAudio);

/**
 * GET /api/audio/:id
 * Download audio file directly
 * 
 * Params: id - audio file ID
 * 
 * Response: 200 with audio file as attachment
 * Content-Disposition: attachment with generated filename
 */
router.get('/:id', audioController.downloadAudio);

/**
 * GET /api/audio/:id/info
 * Get audio file information and metadata
 * 
 * Params: id - audio file ID
 * 
 * Response: JSON with audio metadata, URLs, etc.
 */
router.get('/:id/info', audioController.getAudioInfo);

/**
 * DELETE /api/audio/:id
 * Delete audio file and metadata
 * 
 * Params: id - audio file ID
 * 
 * Response: 204 No Content on success
 */
router.delete('/:id', audioController.deleteAudio);

export default router;