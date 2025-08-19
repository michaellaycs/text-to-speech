import { useState, useCallback, useRef } from 'react';
import { ttsService, TTSApiError } from '@/services/ttsService';
import { getWebSpeechService, isWebSpeechSupported } from '@/services/webSpeechService';
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

  // Helper function for Web Speech conversion
  const convertWithWebSpeech = async (
    content: string,
    settings?: Partial<AudioSettings>
  ): Promise<void> => {
    const webSpeechService = getWebSpeechService();
    
    return new Promise<void>((resolve, reject) => {
      webSpeechService.speak(
        content,
        settings,
        (progressValue) => setProgress(progressValue),
        () => {
          setProgress(100);
          setConversionStatus({
            id: 'web-speech-' + Date.now(),
            status: 'completed',
            progress: 100,
            startTime: new Date().toISOString()
          });
          resolve();
        },
        (errorMessage) => {
          setError(errorMessage);
          setConversionStatus({
            id: 'web-speech-' + Date.now(),
            status: 'failed',
            progress: 0,
            error: errorMessage,
            startTime: new Date().toISOString()
          });
          reject(new Error(errorMessage));
        }
      );
    });
  };

  // Helper function to create mock audio content for Web Speech
  const createMockAudioContent = useCallback((
    content: string,
    settings?: Partial<AudioSettings>
  ): AudioContent => {
    const audioId = 'web-speech-' + Date.now();
    return {
      id: audioId,
      sourceTextId: 'text-' + Date.now(),
      filePath: '', // No file path for Web Speech
      duration: estimateTextDuration(content, settings?.playbackSpeed || 1.0),
      generatedAt: new Date().toISOString(),
      settings: {
        volume: settings?.volume || 75,
        playbackSpeed: settings?.playbackSpeed || 1.0,
        voice: settings?.voice
      },
      metadata: {
        fileSize: 0, // No file for Web Speech
        format: 'web-speech',
        ttsService: 'Web Speech API'
      }
    };
  }, []);

  // Estimate duration based on text length and playback speed
  const estimateTextDuration = (text: string, rate: number = 1): number => {
    const wordCount = text.split(/\s+/).length;
    const baseWpm = 150 * rate; // Average words per minute
    const baseDurationMinutes = wordCount / baseWpm;
    return Math.max(1, baseDurationMinutes * 60); // Return in seconds
  };

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
      console.log('TTS Service base URL:', ttsService);

      // Check if Web Speech API is supported and use it as primary method
      if (false && isWebSpeechSupported()) { // Temporarily disabled for debugging
        console.log('Using Web Speech API for TTS conversion');
        await convertWithWebSpeech(content, settings);
        const mockAudioContent = createMockAudioContent(content, settings);
        setCurrentAudio(mockAudioContent);
        return mockAudioContent;
      } else {
        console.log('Web Speech API not supported, using server-side TTS');
        // Fallback to server-side conversion
        const audioContent = await ttsService.convertTextWithRetry(content, settings);
        setCurrentAudio(audioContent);
        setProgress(100);
        setConversionStatus({
          id: audioContent.id,
          status: 'completed',
          progress: 100,
          startTime: new Date().toISOString()
        });
        return audioContent;
      }

    } catch (error) {
      console.error('TTS conversion failed:', error);
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Full error object:', error);
      
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
  }, [createMockAudioContent]);

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
    
    // Stop any ongoing Web Speech if active
    if (isWebSpeechSupported()) {
      getWebSpeechService().stop();
    }
  }, []);

  const getAudioUrl = useCallback((audioId: string): string => {
    // For Web Speech, there's no URL since it plays directly
    if (audioId.startsWith('web-speech-')) {
      return '';
    }
    return ttsService.getAudioStreamUrl(audioId);
  }, []);

  const getDownloadUrl = useCallback((audioId: string): string => {
    // Web Speech can't be downloaded
    if (audioId.startsWith('web-speech-')) {
      return '';
    }
    return ttsService.getAudioDownloadUrl(audioId);
  }, []);

  const deleteAudio = useCallback(async (audioId: string): Promise<void> => {
    try {
      // Web Speech doesn't need deletion
      if (audioId.startsWith('web-speech-')) {
        return;
      }
      
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
      // For Web Speech, return mock info
      if (audioId.startsWith('web-speech-')) {
        return {
          id: audioId,
          format: 'web-speech',
          streamUrl: '',
          downloadUrl: '',
          timestamp: new Date().toISOString()
        };
      }
      
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
  }, [baseTTS]);

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