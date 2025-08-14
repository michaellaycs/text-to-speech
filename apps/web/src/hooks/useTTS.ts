import { useState, useCallback, useRef } from 'react';
import { ttsService, TTSApiError } from '@/services/ttsService';
import type { 
  AudioContent, 
  AudioSettings, 
  ConversionStatus,
  TTSHookState,
  TTSHookActions
} from '@/types/tts';

export function useTTS(): TTSHookState & TTSHookActions {
  const [isConverting, setIsConverting] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<AudioContent | null>(null);
  const [conversionStatus, setConversionStatus] = useState<ConversionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Keep track of current conversion to handle cleanup
  const currentConversionRef = useRef<string | null>(null);

  const convert = useCallback(async (
    content: string,
    settings?: Partial<AudioSettings>
  ): Promise<AudioContent> => {
    try {
      setIsConverting(true);
      setError(null);
      setProgress(0);
      setConversionStatus(null);
      setCurrentAudio(null);

      console.log('Starting TTS conversion...', { contentLength: content.length });

      // Start conversion
      const audioContent = await ttsService.convertTextWithRetry(content, settings);
      
      setCurrentAudio(audioContent);
      setProgress(100);
      setConversionStatus({
        id: audioContent.id,
        status: 'completed',
        progress: 100,
        startTime: new Date().toISOString()
      });

      console.log('TTS conversion completed:', { audioId: audioContent.id });
      
      return audioContent;

    } catch (error) {
      console.error('TTS conversion failed:', error);
      
      let errorMessage = 'Conversion failed. Please try again.';
      
      if (error instanceof TTSApiError) {
        errorMessage = error.getUserMessage();
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setConversionStatus({
        id: 'unknown',
        status: 'failed',
        progress: 0,
        error: errorMessage,
        startTime: new Date().toISOString()
      });

      throw error;
    } finally {
      setIsConverting(false);
      currentConversionRef.current = null;
    }
  }, []);

  // Removed convertWithStatusPolling as it's not needed for the current implementation

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsConverting(false);
    setCurrentAudio(null);
    setConversionStatus(null);
    setError(null);
    setProgress(0);
    currentConversionRef.current = null;
  }, []);

  const getAudioUrl = useCallback((audioId: string): string => {
    return ttsService.getAudioStreamUrl(audioId);
  }, []);

  const getDownloadUrl = useCallback((audioId: string): string => {
    return ttsService.getAudioDownloadUrl(audioId);
  }, []);

  const deleteAudio = useCallback(async (audioId: string): Promise<void> => {
    try {
      await ttsService.deleteAudio(audioId);
      
      // Clear current audio if it was the one deleted
      if (currentAudio?.id === audioId) {
        setCurrentAudio(null);
        setConversionStatus(null);
      }
    } catch (error) {
      console.error('Failed to delete audio:', error);
      throw error;
    }
  }, [currentAudio]);

  const getAudioInfo = useCallback(async (audioId: string) => {
    try {
      return await ttsService.getAudioInfo(audioId);
    } catch (error) {
      console.error('Failed to get audio info:', error);
      throw error;
    }
  }, []);

  return {
    // State
    isConverting,
    currentAudio,
    conversionStatus,
    error,
    progress,
    
    // Actions
    convert,
    clearError,
    reset,
    getAudioUrl,
    getDownloadUrl,
    deleteAudio,
    getAudioInfo
  };
}

// Extended hook with additional features for advanced use cases
export function useAdvancedTTS() {
  const baseTTS = useTTS();
  const [history, setHistory] = useState<AudioContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const convertAndStore = useCallback(async (
    content: string,
    settings?: Partial<AudioSettings>
  ): Promise<AudioContent> => {
    const result = await baseTTS.convert(content, settings);
    
    // Add to history
    setHistory(prev => [result, ...prev].slice(0, 10)); // Keep last 10
    
    return result;
  }, [baseTTS.convert]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const getProvidersStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      return await ttsService.getProvidersStatus();
    } catch (error) {
      console.error('Failed to get providers status:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    ...baseTTS,
    history,
    isLoading,
    convertAndStore,
    clearHistory,
    getProvidersStatus
  };
}