import * as fs from 'fs/promises';
import * as path from 'path';
import { createReadStream, existsSync } from 'fs';
import { config } from '../config/environment';

export interface FileMetadata {
  size: number;
  format: string;
  duration: number;
  createdAt: Date;
  checksum?: string;
}

export interface AudioFileInfo {
  id: string;
  filePath: string;
  metadata: FileMetadata;
}

export class FileManager {
  private storageBasePath: string;
  private audioDirectory: string;
  private sessionsDirectory: string;
  private maxFileSize: number;

  constructor() {
    this.storageBasePath = config.tempStoragePath;
    this.audioDirectory = path.join(this.storageBasePath, 'audio');
    this.sessionsDirectory = path.join(this.storageBasePath, 'sessions');
    this.maxFileSize = config.maxFileSize;
    
    // Initialize storage directories
    this.initializeStorage().catch(error => {
      console.error('Failed to initialize file storage:', error);
    });
  }

  /**
   * Save audio buffer to file system
   */
  async saveAudioFile(
    audioId: string,
    audioBuffer: Buffer,
    metadata: Omit<FileMetadata, 'size' | 'createdAt'>
  ): Promise<AudioFileInfo> {
    try {
      // Validate buffer size
      if (audioBuffer.length > this.maxFileSize) {
        throw new Error(`Audio file too large: ${audioBuffer.length} bytes (max: ${this.maxFileSize})`);
      }

      // Generate file path
      const fileName = `${audioId}.${metadata.format}`;
      const filePath = path.join(this.audioDirectory, fileName);

      // Ensure directory exists
      await this.ensureDirectoryExists(this.audioDirectory);

      // Write audio file
      await fs.writeFile(filePath, audioBuffer);

      // Create metadata file
      const fullMetadata: FileMetadata = {
        ...metadata,
        size: audioBuffer.length,
        createdAt: new Date()
      };

      const metadataPath = path.join(this.audioDirectory, `${audioId}.meta`);
      await fs.writeFile(metadataPath, JSON.stringify(fullMetadata, null, 2));

      console.log(`Audio file saved: ${filePath} (${audioBuffer.length} bytes)`);

      return {
        id: audioId,
        filePath,
        metadata: fullMetadata
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to save audio file ${audioId}:`, error);
      throw new Error(`File save failed: ${errorMessage}`);
    }
  }

  /**
   * Get audio file as buffer
   */
  async getAudioFile(audioId: string): Promise<Buffer | null> {
    try {
      const filePath = await this.findAudioFile(audioId);
      if (!filePath) return null;

      const buffer = await fs.readFile(filePath);
      return buffer;

    } catch (error) {
      console.error(`Failed to read audio file ${audioId}:`, error);
      return null;
    }
  }

  /**
   * Get audio file as readable stream
   */
  getAudioStream(audioId: string): NodeJS.ReadableStream | null {
    try {
      const filePath = this.findAudioFileSync(audioId);
      if (!filePath || !existsSync(filePath)) return null;

      return createReadStream(filePath);

    } catch (error) {
      console.error(`Failed to create audio stream ${audioId}:`, error);
      return null;
    }
  }

  /**
   * Get audio file metadata
   */
  async getAudioMetadata(audioId: string): Promise<FileMetadata | null> {
    try {
      const metadataPath = path.join(this.audioDirectory, `${audioId}.meta`);
      
      if (!existsSync(metadataPath)) return null;

      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(metadataContent) as FileMetadata;

    } catch (error) {
      console.error(`Failed to read metadata for ${audioId}:`, error);
      return null;
    }
  }

  /**
   * Check if audio file exists
   */
  async audioFileExists(audioId: string): Promise<boolean> {
    const filePath = await this.findAudioFile(audioId);
    return filePath !== null;
  }

  /**
   * Delete audio file and its metadata
   */
  async deleteAudioFile(audioId: string): Promise<boolean> {
    try {
      const filePath = await this.findAudioFile(audioId);
      const metadataPath = path.join(this.audioDirectory, `${audioId}.meta`);

      let deletedFiles = 0;

      // Delete main file
      if (filePath && existsSync(filePath)) {
        await fs.unlink(filePath);
        deletedFiles++;
      }

      // Delete metadata file
      if (existsSync(metadataPath)) {
        await fs.unlink(metadataPath);
        deletedFiles++;
      }

      console.log(`Deleted ${deletedFiles} files for audio ID: ${audioId}`);
      return deletedFiles > 0;

    } catch (error) {
      console.error(`Failed to delete audio file ${audioId}:`, error);
      return false;
    }
  }

  /**
   * Get file size and disk usage information
   */
  async getDiskUsage(): Promise<{
    audioFiles: number;
    totalSize: number;
    availableSpace?: number;
  }> {
    try {
      const audioFiles = await fs.readdir(this.audioDirectory);
      const audioFileStats = audioFiles.filter(f => f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.ogg'));
      
      let totalSize = 0;
      
      for (const file of audioFileStats) {
        try {
          const filePath = path.join(this.audioDirectory, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        } catch (error) {
          // Skip files that can't be accessed
          continue;
        }
      }

      return {
        audioFiles: audioFileStats.length,
        totalSize,
      };

    } catch (error) {
      console.error('Failed to calculate disk usage:', error);
      return {
        audioFiles: 0,
        totalSize: 0
      };
    }
  }

  /**
   * Clean up old files based on age
   */
  async cleanup(olderThanHours: number = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let cleanedFiles = 0;

    try {
      // Clean audio files
      cleanedFiles += await this.cleanupDirectory(this.audioDirectory, cutoffTime);
      
      // Clean session files if they exist
      if (existsSync(this.sessionsDirectory)) {
        cleanedFiles += await this.cleanupDirectory(this.sessionsDirectory, cutoffTime);
      }

      console.log(`Cleanup completed: ${cleanedFiles} files removed`);
      return cleanedFiles;

    } catch (error) {
      console.error('Cleanup failed:', error);
      return cleanedFiles;
    }
  }

  /**
   * Schedule automatic cleanup
   */
  scheduleCleanup(intervalHours: number = 1, fileAgeHours: number = 24): NodeJS.Timeout {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    return setInterval(async () => {
      try {
        const cleanedFiles = await this.cleanup(fileAgeHours);
        if (cleanedFiles > 0) {
          console.log(`Scheduled cleanup removed ${cleanedFiles} old files`);
        }
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Initialize storage directories
   */
  private async initializeStorage(): Promise<void> {
    await this.ensureDirectoryExists(this.storageBasePath);
    await this.ensureDirectoryExists(this.audioDirectory);
    await this.ensureDirectoryExists(this.sessionsDirectory);
    console.log('File storage initialized:', this.storageBasePath);
  }

  /**
   * Ensure directory exists, create if it doesn't
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch (error) {
      await fs.mkdir(dirPath, { recursive: true });
      console.log('Created directory:', dirPath);
    }
  }

  /**
   * Find audio file path by ID (async)
   */
  private async findAudioFile(audioId: string): Promise<string | null> {
    const possibleExtensions = ['mp3', 'wav', 'ogg'];
    
    for (const ext of possibleExtensions) {
      const filePath = path.join(this.audioDirectory, `${audioId}.${ext}`);
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        continue;
      }
    }
    
    return null;
  }

  /**
   * Find audio file path by ID (sync)
   */
  private findAudioFileSync(audioId: string): string | null {
    const possibleExtensions = ['mp3', 'wav', 'ogg'];
    
    for (const ext of possibleExtensions) {
      const filePath = path.join(this.audioDirectory, `${audioId}.${ext}`);
      if (existsSync(filePath)) {
        return filePath;
      }
    }
    
    return null;
  }

  /**
   * Clean up files in a directory older than cutoff time
   */
  private async cleanupDirectory(dirPath: string, cutoffTime: Date): Promise<number> {
    let cleanedFiles = 0;

    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        
        try {
          const stats = await fs.stat(filePath);
          if (stats.mtime < cutoffTime) {
            await fs.unlink(filePath);
            cleanedFiles++;
          }
        } catch (error) {
          // Skip files that can't be accessed
          continue;
        }
      }

    } catch (error) {
      console.error(`Failed to cleanup directory ${dirPath}:`, error);
    }

    return cleanedFiles;
  }
}