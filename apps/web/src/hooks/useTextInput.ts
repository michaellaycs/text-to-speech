import { useState, useEffect, useCallback } from 'react';
import { validateTextLength, getApproachingLimitMessage } from '@/utils/validation';
import { MAX_CONTENT_LENGTH, VALIDATION_DEBOUNCE_DELAY } from '@/utils/constants';

export interface TextInputState {
  text: string;
  debouncedText: string;
  hasError: boolean;
  errorMessage: string;
  isValidating: boolean;
  characterCount: number;
  isApproachingLimit: boolean;
  isValid: boolean;
}

export interface TextInputActions {
  setText: (text: string) => void;
  clearText: () => void;
  validateText: () => boolean;
  getCharacterCountDisplay: () => string;
  getCharacterCountClassName: () => string;
}

export interface UseTextInputOptions {
  maxLength?: number;
  initialText?: string;
  onTextChange?: (text: string, isValid: boolean) => void;
  debounceDelay?: number;
}

export interface UseTextInputReturn extends TextInputState, TextInputActions {}

/**
 * Custom hook for managing text input state, validation, and character counting
 * Provides debounced validation and clean API for text input components
 */
export function useTextInput(options: UseTextInputOptions = {}): UseTextInputReturn {
  const {
    maxLength = MAX_CONTENT_LENGTH,
    initialText = '',
    onTextChange,
    debounceDelay = VALIDATION_DEBOUNCE_DELAY,
  } = options;

  // Core state
  const [text, setText] = useState<string>(initialText);
  const [debouncedText, setDebouncedText] = useState<string>(initialText);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Debounce text changes
  useEffect(() => {
    setIsValidating(true);
    const timeoutId = setTimeout(() => {
      setDebouncedText(text);
      setIsValidating(false);
    }, debounceDelay);

    return () => {
      clearTimeout(timeoutId);
      setIsValidating(false);
    };
  }, [text, debounceDelay]);

  // Validate debounced text
  useEffect(() => {
    if (!isValidating) {
      const validation = validateTextLength(debouncedText);
      setHasError(!validation.isValid);
      setErrorMessage(validation.errorMessage);
      
      onTextChange?.(debouncedText, validation.isValid);
    }
  }, [debouncedText, isValidating, onTextChange]);

  // Actions
  const clearText = useCallback(() => {
    setText('');
  }, []);

  const validateText = useCallback((): boolean => {
    const validation = validateTextLength(debouncedText);
    setHasError(!validation.isValid);
    setErrorMessage(validation.errorMessage);
    return validation.isValid;
  }, [debouncedText]);

  const getCharacterCountDisplay = useCallback((): string => {
    const approachingMessage = getApproachingLimitMessage(text.length);
    if (approachingMessage) {
      return approachingMessage;
    }
    return `${text.length}/${maxLength} characters`;
  }, [text.length, maxLength]);

  const getCharacterCountClassName = useCallback((): string => {
    if (isValidating) return 'characterCountValidating';
    if (hasError) return 'characterCountError';
    if (getApproachingLimitMessage(text.length)) return 'characterCountWarning';
    return 'characterCount';
  }, [isValidating, hasError, text.length]);

  // Computed values
  const characterCount = text.length;
  const isApproachingLimit = !!getApproachingLimitMessage(text.length);
  const isValid = !hasError && !isValidating && debouncedText.trim().length > 0;

  return {
    // State
    text,
    debouncedText,
    hasError,
    errorMessage,
    isValidating,
    characterCount,
    isApproachingLimit,
    isValid,
    // Actions
    setText,
    clearText,
    validateText,
    getCharacterCountDisplay,
    getCharacterCountClassName,
  };
}