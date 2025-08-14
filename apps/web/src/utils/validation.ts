import { MAX_CONTENT_LENGTH } from './constants';

export interface ValidationResult {
  isValid: boolean;
  errorMessage: string;
}

export interface ValidationError {
  EMPTY_TEXT: 'EMPTY_TEXT';
  EXCEEDS_MAX_LENGTH: 'EXCEEDS_MAX_LENGTH';
}

export const ValidationErrorTypes: ValidationError = {
  EMPTY_TEXT: 'EMPTY_TEXT',
  EXCEEDS_MAX_LENGTH: 'EXCEEDS_MAX_LENGTH'
} as const;

export type ValidationErrorType = keyof ValidationError;

/**
 * Validates text length according to application constraints
 * @param text - The text to validate
 * @returns ValidationResult with validity status and error message
 */
export function validateTextLength(text: string): ValidationResult {
  // Check for empty text (after trimming whitespace)
  if (text.trim().length === 0) {
    return {
      isValid: false,
      errorMessage: getValidationMessage('EMPTY_TEXT')
    };
  }
  
  // Check for maximum length
  if (text.length > MAX_CONTENT_LENGTH) {
    return {
      isValid: false,
      errorMessage: getValidationMessage('EXCEEDS_MAX_LENGTH', { count: text.length })
    };
  }
  
  return {
    isValid: true,
    errorMessage: ''
  };
}

/**
 * Returns user-friendly error messages for validation errors
 * @param errorType - The type of validation error
 * @param context - Additional context for dynamic messages
 * @returns User-friendly error message
 */
export function getValidationMessage(
  errorType: ValidationErrorType,
  context?: { count?: number }
): string {
  switch (errorType) {
    case 'EMPTY_TEXT':
      return 'Please enter some text to convert to speech';
    
    case 'EXCEEDS_MAX_LENGTH': {
      const count = context?.count || 0;
      return `Text exceeds maximum length of ${MAX_CONTENT_LENGTH} characters. Current: ${count} characters`;
    }
    
    default:
      return 'Invalid input';
  }
}

/**
 * Gets warning message when approaching character limit
 * @param currentLength - Current text length
 * @returns Warning message or empty string if not near limit
 */
export function getApproachingLimitMessage(currentLength: number): string {
  const warningThreshold = Math.floor(MAX_CONTENT_LENGTH * 0.9);
  
  if (currentLength >= warningThreshold && currentLength < MAX_CONTENT_LENGTH) {
    return `Approaching character limit: ${currentLength}/${MAX_CONTENT_LENGTH} characters`;
  }
  
  return '';
}

/**
 * Checks if text length is approaching the maximum limit
 * @param text - The text to check
 * @returns true if approaching limit (90% or more of max length)
 */
export function isApproachingLimit(text: string): boolean {
  const warningThreshold = Math.floor(MAX_CONTENT_LENGTH * 0.9);
  return text.length >= warningThreshold && text.length < MAX_CONTENT_LENGTH;
}

/**
 * Gets the remaining character count
 * @param text - The current text
 * @returns number of characters remaining
 */
export function getRemainingCharacters(text: string): number {
  return Math.max(0, MAX_CONTENT_LENGTH - text.length);
}