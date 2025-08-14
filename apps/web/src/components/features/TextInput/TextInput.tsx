import React, { useState, useEffect, useCallback } from 'react';
import { TextArea } from '@/components/ui';
import { ConversionStatus } from '@/components/features';
import { validateTextLength, getApproachingLimitMessage } from '@/utils/validation';
import { MAX_CONTENT_LENGTH, VALIDATION_DEBOUNCE_DELAY } from '@/utils/constants';
import { useTTS } from '@/hooks/useTTS';
import type { AudioContent } from '@/types/tts';
import styles from './TextInput.module.css';

export interface TextInputProps {
  onTextChange?: (text: string, isValid: boolean) => void;
  onAudioGenerated?: (audio: AudioContent) => void;
  maxLength?: number;
  initialText?: string;
  className?: string;
  'data-testid'?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  onTextChange,
  onAudioGenerated,
  maxLength = MAX_CONTENT_LENGTH,
  initialText = '',
  className = '',
  'data-testid': testId,
}) => {
  const [text, setText] = useState<string>(initialText);
  const [debouncedText, setDebouncedText] = useState<string>(initialText);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // TTS functionality
  const { 
    isConverting, 
    currentAudio, 
    conversionStatus, 
    error: ttsError, 
    progress: ttsProgress,
    convert,
    clearError: clearTTSError,
    getAudioUrl
  } = useTTS();

  // Debounce text changes
  useEffect(() => {
    setIsValidating(true);
    const timeoutId = setTimeout(() => {
      setDebouncedText(text);
      setIsValidating(false);
    }, VALIDATION_DEBOUNCE_DELAY);

    return () => {
      clearTimeout(timeoutId);
      setIsValidating(false);
    };
  }, [text]);

  // Validate debounced text
  useEffect(() => {
    if (!isValidating) {
      const validation = validateTextLength(debouncedText);
      setHasError(!validation.isValid);
      setErrorMessage(validation.errorMessage);
      
      onTextChange?.(debouncedText, validation.isValid);
    }
  }, [debouncedText, isValidating, onTextChange]);

  // Handle TTS audio generation completion
  useEffect(() => {
    if (currentAudio) {
      onAudioGenerated?.(currentAudio);
    }
  }, [currentAudio, onAudioGenerated]);

  const handleTextChange = useCallback((value: string) => {
    setText(value);
  }, []);

  const handleConvertToSpeech = useCallback(async () => {
    if (!debouncedText.trim() || hasError || isValidating || isConverting) {
      return;
    }

    try {
      // Clear any previous TTS errors
      clearTTSError();
      
      // Convert text to speech
      await convert(debouncedText, {
        volume: 75,
        playbackSpeed: 1.0
      });
      
    } catch (error) {
      console.error('Text-to-speech conversion failed:', error);
      // Error is already handled by the useTTS hook
    }
  }, [debouncedText, hasError, isValidating, isConverting, convert, clearTTSError]);

  const handleRetryConversion = useCallback(() => {
    handleConvertToSpeech();
  }, [handleConvertToSpeech]);

  const isConvertButtonDisabled = (): boolean => {
    return (
      !debouncedText.trim() || 
      hasError || 
      isValidating || 
      isConverting ||
      debouncedText.length > maxLength
    );
  };

  const getCharacterCountDisplay = (): string => {
    const approachingMessage = getApproachingLimitMessage(text.length);
    if (approachingMessage) {
      return approachingMessage;
    }
    return `${text.length}/${maxLength} characters`;
  };

  const getCharacterCountClassName = (): string => {
    if (isValidating) return styles.characterCountValidating;
    if (hasError) return styles.characterCountError;
    if (getApproachingLimitMessage(text.length)) return styles.characterCountWarning;
    return styles.characterCount;
  };

  const combinedClassName = [
    styles.textInput,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={combinedClassName} data-testid={testId}>
      <div className={styles.textAreaContainer}>
        <TextArea
          value={text}
          onChange={handleTextChange}
          placeholder="Enter your comedy material here... Share your jokes, stories, or any text you'd like converted to speech."
          error={hasError}
          data-testid={testId ? `${testId}-textarea` : 'text-input-textarea'}
        />
      </div>
      
      <div className={styles.feedback}>
        <div className={styles.characterCountContainer}>
          <span className={getCharacterCountClassName()}>
            {getCharacterCountDisplay()}
          </span>
        </div>
        
        {hasError && !isValidating && (
          <div className={styles.errorMessage} role="alert" aria-live="polite">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Convert to Speech Button */}
      <div className={styles.convertSection}>
        <button
          className={styles.convertButton}
          onClick={handleConvertToSpeech}
          disabled={isConvertButtonDisabled()}
          type="button"
          data-testid={testId ? `${testId}-convert-button` : 'convert-button'}
          aria-label="Convert text to speech"
        >
          {isConverting ? 'Converting...' : 'Convert to Speech'}
        </button>
        
        {/* Audio Player */}
        {currentAudio && (
          <div className={styles.audioPlayer}>
            <audio
              controls
              src={getAudioUrl(currentAudio.id)}
              className={styles.audioElement}
              data-testid={testId ? `${testId}-audio-player` : 'audio-player'}
            >
              Your browser does not support the audio element.
            </audio>
            <div className={styles.audioInfo}>
              <span className={styles.audioDuration}>
                Duration: {Math.round(currentAudio.duration)}s
              </span>
              <span className={styles.audioSize}>
                Size: {Math.round(currentAudio.metadata.fileSize / 1024)}KB
              </span>
              <span className={styles.audioService}>
                Generated by: {currentAudio.metadata.ttsService}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Conversion Status */}
      {(isConverting || ttsError || conversionStatus) && (
        <ConversionStatus
          status={conversionStatus}
          isConverting={isConverting}
          progress={ttsProgress}
          error={ttsError}
          onRetry={handleRetryConversion}
          data-testid={testId ? `${testId}-conversion-status` : 'conversion-status'}
        />
      )}
    </div>
  );
};