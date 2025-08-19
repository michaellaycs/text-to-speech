import { useState, useCallback, useRef, useEffect } from 'react';
import { AudioContent } from '../types/tts';

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  error: string | null;
  currentAudio: AudioContent | null;
  audioUrl: string | null;
}

export interface AudioPlayerActions {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  loadAudio: (audio: AudioContent, audioUrl: string) => void;
  clearAudio: () => void;
  reset: () => void;
}

export interface UseAudioPlayerOptions {
  autoPlay?: boolean;
  defaultVolume?: number;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

export function useAudioPlayer(options: UseAudioPlayerOptions = {}): AudioPlayerState & AudioPlayerActions {
  const {
    autoPlay = false,
    defaultVolume = 75,
    onTimeUpdate,
    onEnded,
    onError
  } = options;

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(defaultVolume);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<AudioContent | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousVolumeRef = useRef(defaultVolume);

  // Actions
  const play = useCallback(async (): Promise<void> => {
    if (!audioRef.current || error) {
      throw new Error('Audio not ready for playback');
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch {
      const errorMessage = 'Failed to play audio. Please try again.';
      setError(errorMessage);
      onError?.(errorMessage);
      throw new Error(errorMessage);
    }
  }, [error, onError]);

  const pause = useCallback((): void => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  const seek = useCallback((time: number): void => {
    if (!audioRef.current || !duration) return;

    const clampedTime = Math.max(0, Math.min(duration, time));
    audioRef.current.currentTime = clampedTime;
    setCurrentTime(clampedTime);
  }, [duration]);

  const setVolume = useCallback((newVolume: number): void => {
    const clampedVolume = Math.max(0, Math.min(100, newVolume));
    setVolumeState(clampedVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume / 100;
    }

    if (clampedVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }

    if (clampedVolume > 0) {
      previousVolumeRef.current = clampedVolume;
    }
  }, [isMuted]);

  const toggleMute = useCallback((): void => {
    if (!audioRef.current) return;

    if (isMuted) {
      // Unmute: restore previous volume
      const restoreVolume = previousVolumeRef.current > 0 ? previousVolumeRef.current : 75;
      setVolume(restoreVolume);
    } else {
      // Mute: save current volume and set to 0
      if (volume > 0) {
        previousVolumeRef.current = volume;
      }
      setVolumeState(0);
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume, setVolume]);

  const loadAudio = useCallback((audio: AudioContent, url: string): void => {
    setCurrentAudio(audio);
    setAudioUrl(url);
    setError(null);
    setIsLoading(true);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    // Create or update audio element
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.load();
    }
  }, []);

  const clearAudio = useCallback((): void => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    setCurrentAudio(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setIsLoading(false);
  }, []);

  const reset = useCallback((): void => {
    clearAudio();
    setVolumeState(defaultVolume);
    setIsMuted(false);
    previousVolumeRef.current = defaultVolume;
  }, [clearAudio, defaultVolume]);

  // Audio element event handlers
  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    if (autoPlay) {
      play().catch(console.error);
    }
  }, [autoPlay, play]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    }
  }, [onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    onEnded?.();
  }, [onEnded]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setIsPlaying(false);
    const errorMessage = 'Failed to load audio. Please check the audio source.';
    setError(errorMessage);
    onError?.(errorMessage);
  }, [onError]);

  // Initialize audio element and event listeners
  useEffect(() => {
    if (!audioUrl) return;

    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    // Set initial properties
    audio.volume = volume / 100;
    audio.preload = 'metadata';

    // Add event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Set source and load
    audio.src = audioUrl;
    audio.load();

    // Cleanup function
    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [
    audioUrl,
    volume,
    handleLoadStart,
    handleCanPlay,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleEnded,
    handleError
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  return {
    // State
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isLoading,
    error,
    currentAudio,
    audioUrl,

    // Actions
    play,
    pause,
    seek,
    setVolume,
    toggleMute,
    loadAudio,
    clearAudio,
    reset
  };
}

export default useAudioPlayer;