import React, { useRef, useEffect, useState, useCallback } from 'react';
import styles from './AudioPlayer.module.css';

export interface AudioPlayerProps {
  src: string;
  autoPlay?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onLoadStart?: () => void;
  onCanPlay?: () => void;
  onError?: (error: string) => void;
  className?: string;
  'data-testid'?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  autoPlay = false,
  onTimeUpdate,
  onEnded,
  onLoadStart,
  onCanPlay,
  onError,
  className,
  'data-testid': testId = 'audio-player'
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Audio event handlers
  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setError(null);
    onLoadStart?.();
  }, [onLoadStart]);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    onCanPlay?.();
  }, [onCanPlay]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    }
  }, [onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    onEnded?.();
  }, [onEnded]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setIsPlaying(false);
    const errorMessage = 'Failed to load audio. Please try again.';
    setError(errorMessage);
    onError?.(errorMessage);
  }, [onError]);

  // Control functions
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || error) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          const errorMessage = 'Failed to play audio. Please try again.';
          setError(errorMessage);
          onError?.(errorMessage);
        });
    }
  }, [isPlaying, error, onError]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVolume = parseInt(e.target.value);
    const newVolume = Math.min(100, Math.max(0, inputVolume)); // Cap between 0-100
    setVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
      if (newVolume === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
      }
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;

    if (isMuted) {
      audioRef.current.volume = volume / 100;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!audioRef.current) return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlayPause();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        audioRef.current.currentTime = Math.max(0, currentTime - 5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        audioRef.current.currentTime = Math.min(duration, currentTime + 5);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (volume < 100) {
          const newVolume = Math.min(100, volume + 10);
          setVolume(newVolume);
          audioRef.current.volume = newVolume / 100;
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (volume > 0) {
          const newVolume = Math.max(0, volume - 10);
          setVolume(newVolume);
          audioRef.current.volume = newVolume / 100;
        }
        break;
      case 'KeyM':
        e.preventDefault();
        toggleMute();
        break;
      case 'Home':
        e.preventDefault();
        audioRef.current.currentTime = 0;
        break;
      case 'End':
        e.preventDefault();
        audioRef.current.currentTime = duration;
        break;
    }
  }, [togglePlayPause, currentTime, duration, volume, toggleMute]);

  // Initialize volume when component mounts
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Format time as MM:SS
  const formatTime = (timeInSeconds: number): string => {
    if (isNaN(timeInSeconds)) return '0:00';
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className={`${styles.audioPlayer} ${className || ''}`}
      data-testid={testId}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="application"
      aria-label="Audio player"
    >
      <audio
        ref={audioRef}
        src={src}
        autoPlay={autoPlay}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
        preload="metadata"
        style={{ display: 'none' }}
        controlsList="nodownload nofullscreen noremoteplayback"
      />

      {error ? (
        <div className={styles.error} role="alert">
          <span className={styles.errorIcon}>⚠️</span>
          <span className={styles.errorMessage}>{error}</span>
        </div>
      ) : (
        <>
          <div className={styles.controls}>
            {/* Play/Pause Button */}
            <button
              className={`${styles.playButton} ${isLoading ? styles.loading : ''}`}
              onClick={togglePlayPause}
              disabled={isLoading || !!error}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              data-testid="play-pause-button"
            >
              {isLoading ? (
                <span className={styles.spinner}>⏳</span>
              ) : isPlaying ? (
                <span className={styles.pauseIcon}>⏸️</span>
              ) : (
                <span className={styles.playIcon}></span>
              )}
            </button>

            {/* Time Display */}
            <div className={styles.timeDisplay} data-testid="time-display">
              <span className={styles.currentTime}>{formatTime(currentTime)}</span>
              <span className={styles.separator}>/</span>
              <span className={styles.duration}>{formatTime(duration)}</span>
            </div>

            {/* Volume Controls */}
            <div className={styles.volumeControls}>
              <button
                className={styles.muteButton}
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                data-testid="mute-button"
              >
                {isMuted || volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className={styles.volumeSlider}
                aria-label="Volume"
                data-testid="volume-slider"
              />
              <span className={styles.volumePercentage}>{isMuted ? 0 : volume}%</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className={styles.progressSection}>
            <div
              className={styles.progressBar}
              onClick={handleSeek}
              role="slider"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={currentTime}
              aria-label="Seek"
              tabIndex={0}
              data-testid="progress-bar"
            >
              <div className={styles.progressBarBackground}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${progressPercentage}%` }}
                />
                <div
                  className={styles.progressBarThumb}
                  style={{ left: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AudioPlayer;