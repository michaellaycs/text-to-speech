import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TTSOrchestrator } from '../services/TTSOrchestrator';
import { FileManager } from '../services/FileManager';
import { AudioContent } from '../providers/interfaces';

// Validation schemas
const ConvertTextSchema = z.object({
  content: z.string()
    .min(1, 'Content cannot be empty')
    .max(2000, 'Content exceeds maximum length of 2000 characters'),
  settings: z.object({
    volume: z.number().min(0).max(100).optional(),
    playbackSpeed: z.number().min(0.8).max(1.5).optional(),
    voice: z.string().optional()
  }).optional()
});

const StatusParamsSchema = z.object({
  id: z.string().min(1, 'ID is required')
});

export class TTSController {
  private ttsOrchestrator: TTSOrchestrator;
  private fileManager: FileManager;

  constructor() {
    this.ttsOrchestrator = new TTSOrchestrator();
    this.fileManager = new FileManager();
  }

  /**
   * POST /api/tts/convert
   * Convert text to speech
   */
  convertText = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validation = ConvertTextSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.issues,
            timestamp: new Date().toISOString(),
            requestId: (req as any).id
          }
        });
      }

      const { content, settings } = validation.data;

      // Get session ID from headers (validation handled by middleware)
      const sessionId = req.headers['x-session-id'] as string || 'default-session';

      console.log(`TTS conversion request - Session: ${sessionId}, Content length: ${content.length}`);

      // Convert text to speech using orchestrator
      const conversionResult = await this.ttsOrchestrator.convert(content, settings);

      // Generate unique audio ID
      const audioId = this.generateAudioId();

      // Save audio file
      const audioFileInfo = await this.fileManager.saveAudioFile(
        audioId,
        conversionResult.audioBuffer,
        {
          format: conversionResult.format,
          duration: conversionResult.duration
        }
      );

      // Create audio content response
      const audioContent: AudioContent = {
        id: audioId,
        sourceTextId: this.generateTextId(), // In a full implementation, this would come from a text storage service
        filePath: audioFileInfo.filePath,
        duration: conversionResult.duration,
        generatedAt: new Date(),
        settings: {
          volume: settings?.volume || 75,
          playbackSpeed: settings?.playbackSpeed || 1.0,
          voice: settings?.voice
        },
        metadata: {
          fileSize: audioFileInfo.metadata.size,
          format: conversionResult.format,
          ttsService: conversionResult.metadata.ttsService
        }
      };

      console.log(`TTS conversion successful - Audio ID: ${audioId}, Service: ${conversionResult.metadata.ttsService}`);

      return res.status(200).json(audioContent);

    } catch (error) {
      console.error('TTS conversion error:', error);
      return next(error);
    }
  };

  /**
   * GET /api/tts/status/:id
   * Get conversion status by ID
   */
  getStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate parameters
      const validation = StatusParamsSchema.safeParse(req.params);
      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: validation.error.issues,
            timestamp: new Date().toISOString(),
            requestId: (req as any).id
          }
        });
      }

      const { id } = validation.data;

      // Get conversion status from orchestrator
      const status = this.ttsOrchestrator.getStatus(id);

      if (!status) {
        return res.status(404).json({
          error: {
            code: 'CONVERSION_NOT_FOUND',
            message: `Conversion with ID ${id} not found`,
            timestamp: new Date().toISOString(),
            requestId: (req as any).id
          }
        });
      }

      return res.status(200).json({
        id: status.id,
        status: status.status,
        progress: status.progress,
        error: status.error,
        startTime: status.startTime,
        endTime: status.endTime
      });

    } catch (error) {
      console.error('Get status error:', error);
      return next(error);
    }
  };

  /**
   * GET /api/tts/providers/status
   * Get status of all TTS providers
   */
  getProvidersStatus = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const providersStatus = await this.ttsOrchestrator.getProvidersStatus();
      
      res.status(200).json({
        providers: providersStatus,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get providers status error:', error);
      next(error);
    }
  };

  /**
   * POST /api/tts/cleanup
   * Trigger manual cleanup of old conversion data
   */
  cleanup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const olderThanMinutes = req.body?.olderThanMinutes || 60;
      
      // Clean up orchestrator data
      this.ttsOrchestrator.cleanup(olderThanMinutes);
      
      // Clean up files
      const cleanedFiles = await this.fileManager.cleanup(olderThanMinutes / 60);
      
      res.status(200).json({
        message: 'Cleanup completed',
        cleanedFiles,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Cleanup error:', error);
      next(error);
    }
  };

  /**
   * Generate unique audio ID
   */
  private generateAudioId(): string {
    return `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique text ID
   */
  private generateTextId(): string {
    return `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}