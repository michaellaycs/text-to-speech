import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { FileManager } from '../services/FileManager';

// Validation schemas
const AudioParamsSchema = z.object({
  id: z.string().min(1, 'Audio ID is required')
});

export class AudioController {
  private fileManager: FileManager;

  constructor() {
    this.fileManager = new FileManager();
  }

  /**
   * GET /api/audio/stream/:id
   * Stream audio file for web playback
   */
  streamAudio = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // Validate parameters
      const validation = AudioParamsSchema.safeParse(req.params);
      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid audio ID',
            details: validation.error.issues,
            timestamp: new Date().toISOString(),
            requestId: (req as any).id
          }
        });
      }

      const { id } = validation.data;

      // Check if audio file exists
      const audioExists = await this.fileManager.audioFileExists(id);
      if (!audioExists) {
        return res.status(404).json({
          error: {
            code: 'AUDIO_NOT_FOUND',
            message: `Audio file with ID ${id} not found`,
            timestamp: new Date().toISOString(),
            requestId: (req as any).id
          }
        });
      }

      // Get audio metadata for headers
      const metadata = await this.fileManager.getAudioMetadata(id);
      if (!metadata) {
        return res.status(404).json({
          error: {
            code: 'AUDIO_METADATA_NOT_FOUND',
            message: `Audio metadata for ID ${id} not found`,
            timestamp: new Date().toISOString(),
            requestId: (req as any).id
          }
        });
      }

      // Set appropriate headers for audio streaming with CORS support
      res.set({
        'Content-Type': this.getContentType(metadata.format),
        'Content-Length': metadata.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'X-Audio-Duration': metadata.duration.toString(),
        'X-Audio-Format': metadata.format,
        // Additional CORS headers for HTML5 audio
        'Access-Control-Allow-Origin': req.headers.origin || '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
        'Cross-Origin-Resource-Policy': 'cross-origin'
      });

      // Get the audio file as buffer for proper streaming
      const audioBuffer = await this.fileManager.getAudioFile(id);
      if (!audioBuffer) {
        return res.status(404).json({
          error: {
            code: 'AUDIO_FILE_ERROR',
            message: 'Failed to read audio file',
            timestamp: new Date().toISOString(),
            requestId: (req as any).id
          }
        });
      }

      // Handle range requests for audio seeking
      const range = req.headers.range;
      if (range) {
        // Parse range header
        const rangeMatch = range.match(/bytes=(\d+)-(\d*)/);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10);
          const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : audioBuffer.length - 1;

          if (start >= audioBuffer.length || end >= audioBuffer.length || start > end) {
            return res.status(416).json({
              error: {
                code: 'INVALID_RANGE',
                message: 'Requested range not satisfiable',
                timestamp: new Date().toISOString(),
                requestId: (req as any).id
              }
            });
          }

          // Set partial content headers
          res.status(206);
          res.set({
            'Content-Range': `bytes ${start}-${end}/${audioBuffer.length}`,
            'Content-Length': (end - start + 1).toString()
          });

          // Send the requested byte range
          const chunk = audioBuffer.slice(start, end + 1);
          console.log(`Audio range request: ${start}-${end}/${audioBuffer.length} (${chunk.length} bytes)`);
          res.send(chunk);
        } else {
          // Invalid range header
          return res.status(400).json({
            error: {
              code: 'INVALID_RANGE_HEADER',
              message: 'Invalid range header format',
              timestamp: new Date().toISOString(),
              requestId: (req as any).id
            }
          });
        }
      } else {
        // Normal streaming without range - send complete file
        console.log(`Audio streaming started - ID: ${id}, Size: ${audioBuffer.length} bytes`);
        res.send(audioBuffer);
      }

      console.log(`Audio streaming started - ID: ${id}, Size: ${metadata.size} bytes`);

    } catch (error) {
      console.error('Audio streaming error:', error);
      next(error);
    }
  };

  /**
   * GET /api/audio/:id
   * Download audio file directly
   */
  downloadAudio = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // Validate parameters
      const validation = AudioParamsSchema.safeParse(req.params);
      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid audio ID',
            details: validation.error.issues,
            timestamp: new Date().toISOString(),
            requestId: (req as any).id
          }
        });
      }

      const { id } = validation.data;

      // Get audio file buffer
      const audioBuffer = await this.fileManager.getAudioFile(id);
      if (!audioBuffer) {
        return res.status(404).json({
          error: {
            code: 'AUDIO_NOT_FOUND',
            message: `Audio file with ID ${id} not found`,
            timestamp: new Date().toISOString(),
            requestId: (req as any).id
          }
        });
      }

      // Get metadata for headers
      const metadata = await this.fileManager.getAudioMetadata(id);
      if (!metadata) {
        return res.status(404).json({
          error: {
            code: 'AUDIO_METADATA_NOT_FOUND',
            message: `Audio metadata for ID ${id} not found`,
            timestamp: new Date().toISOString(),
            requestId: (req as any).id
          }
        });
      }

      // Generate filename for download
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `comedy-material-${timestamp}-${id}.${metadata.format}`;

      // Set headers for file download
      res.set({
        'Content-Type': this.getContentType(metadata.format),
        'Content-Length': audioBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600',
        'X-Audio-Duration': metadata.duration.toString(),
        'X-Audio-Format': metadata.format
      });

      console.log(`Audio download started - ID: ${id}, Filename: ${filename}`);

      // Send the audio file
      res.send(audioBuffer);

    } catch (error) {
      console.error('Audio download error:', error);
      next(error);
    }
  };

  /**
   * GET /api/audio/:id/info
   * Get audio file information
   */
  getAudioInfo = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // Validate parameters
      const validation = AudioParamsSchema.safeParse(req.params);
      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid audio ID',
            details: validation.error.issues,
            timestamp: new Date().toISOString(),
            requestId: (req as any).id
          }
        });
      }

      const { id } = validation.data;

      // Check if audio file exists
      const audioExists = await this.fileManager.audioFileExists(id);
      if (!audioExists) {
        return res.status(404).json({
          error: {
            code: 'AUDIO_NOT_FOUND',
            message: `Audio file with ID ${id} not found`,
            timestamp: new Date().toISOString(),
            requestId: (req as any).id
          }
        });
      }

      // Get audio metadata
      const metadata = await this.fileManager.getAudioMetadata(id);
      if (!metadata) {
        return res.status(404).json({
          error: {
            code: 'AUDIO_METADATA_NOT_FOUND',
            message: `Audio metadata for ID ${id} not found`,
            timestamp: new Date().toISOString(),
            requestId: (req as any).id
          }
        });
      }

      res.status(200).json({
        id,
        ...metadata,
        streamUrl: `/api/audio/stream/${id}`,
        downloadUrl: `/api/audio/${id}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get audio info error:', error);
      next(error);
    }
  };

  /**
   * DELETE /api/audio/:id
   * Delete audio file
   */
  deleteAudio = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // Validate parameters
      const validation = AudioParamsSchema.safeParse(req.params);
      if (!validation.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid audio ID',
            details: validation.error.issues,
            timestamp: new Date().toISOString(),
            requestId: (req as any).id
          }
        });
      }

      const { id } = validation.data;

      // Delete the audio file
      const deleted = await this.fileManager.deleteAudioFile(id);
      if (!deleted) {
        return res.status(404).json({
          error: {
            code: 'AUDIO_NOT_FOUND',
            message: `Audio file with ID ${id} not found`,
            timestamp: new Date().toISOString(),
            requestId: (req as any).id
          }
        });
      }

      console.log(`Audio file deleted - ID: ${id}`);

      res.status(204).send(); // No content

    } catch (error) {
      console.error('Delete audio error:', error);
      next(error);
    }
  };

  /**
   * Get appropriate Content-Type for audio format
   */
  private getContentType(format: string): string {
    switch (format.toLowerCase()) {
      case 'mp3':
        return 'audio/mpeg';
      case 'wav':
        return 'audio/wav';
      case 'ogg':
        return 'audio/ogg';
      case 'opus':
        return 'audio/opus';
      default:
        return 'audio/mpeg'; // Default to MP3
    }
  }
}