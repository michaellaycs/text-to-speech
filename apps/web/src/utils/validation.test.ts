import {
  validateTextLength,
  getValidationMessage,
  getApproachingLimitMessage,
  isApproachingLimit,
  getRemainingCharacters,
  ValidationErrorTypes,
  type ValidationErrorType,
} from './validation';
import { MAX_CONTENT_LENGTH } from './constants';

describe('Validation Utils', () => {
  describe('validateTextLength', () => {
    it('returns valid for normal text', () => {
      const result = validateTextLength('This is a normal text');
      expect(result).toEqual({
        isValid: true,
        errorMessage: '',
      });
    });

    it('returns invalid for empty string', () => {
      const result = validateTextLength('');
      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Please enter some text to convert to speech',
      });
    });

    it('returns invalid for whitespace-only string', () => {
      const result = validateTextLength('   \n\n   ');
      expect(result).toEqual({
        isValid: false,
        errorMessage: 'Please enter some text to convert to speech',
      });
    });

    it('returns invalid for text exceeding maximum length', () => {
      const longText = 'A'.repeat(MAX_CONTENT_LENGTH + 1);
      const result = validateTextLength(longText);
      expect(result).toEqual({
        isValid: false,
        errorMessage: `Text exceeds maximum length of ${MAX_CONTENT_LENGTH} characters. Current: ${MAX_CONTENT_LENGTH + 1} characters`,
      });
    });

    it('returns valid for text at maximum length', () => {
      const maxText = 'A'.repeat(MAX_CONTENT_LENGTH);
      const result = validateTextLength(maxText);
      expect(result).toEqual({
        isValid: true,
        errorMessage: '',
      });
    });

    it('handles text with line breaks and special characters', () => {
      const textWithFormatting = 'Line 1\nLine 2\n\nParagraph with émojis 🎭 and special chars!@#$%';
      const result = validateTextLength(textWithFormatting);
      expect(result).toEqual({
        isValid: true,
        errorMessage: '',
      });
    });
  });

  describe('getValidationMessage', () => {
    it('returns correct message for EMPTY_TEXT error', () => {
      const message = getValidationMessage('EMPTY_TEXT');
      expect(message).toBe('Please enter some text to convert to speech');
    });

    it('returns correct message for EXCEEDS_MAX_LENGTH error without context', () => {
      const message = getValidationMessage('EXCEEDS_MAX_LENGTH');
      expect(message).toBe(`Text exceeds maximum length of ${MAX_CONTENT_LENGTH} characters. Current: 0 characters`);
    });

    it('returns correct message for EXCEEDS_MAX_LENGTH error with context', () => {
      const message = getValidationMessage('EXCEEDS_MAX_LENGTH', { count: 2500 });
      expect(message).toBe(`Text exceeds maximum length of ${MAX_CONTENT_LENGTH} characters. Current: 2500 characters`);
    });

    it('returns default message for unknown error type', () => {
      const message = getValidationMessage('UNKNOWN_ERROR' as ValidationErrorType);
      expect(message).toBe('Invalid input');
    });
  });

  describe('getApproachingLimitMessage', () => {
    const warningThreshold = Math.floor(MAX_CONTENT_LENGTH * 0.9); // 1800 for 2000 max

    it('returns empty string for text well below threshold', () => {
      const message = getApproachingLimitMessage(1000);
      expect(message).toBe('');
    });

    it('returns empty string for text just below threshold', () => {
      const message = getApproachingLimitMessage(warningThreshold - 1);
      expect(message).toBe('');
    });

    it('returns warning message at threshold', () => {
      const message = getApproachingLimitMessage(warningThreshold);
      expect(message).toBe(`Approaching character limit: ${warningThreshold}/${MAX_CONTENT_LENGTH} characters`);
    });

    it('returns warning message above threshold but below max', () => {
      const testLength = warningThreshold + 50;
      const message = getApproachingLimitMessage(testLength);
      expect(message).toBe(`Approaching character limit: ${testLength}/${MAX_CONTENT_LENGTH} characters`);
    });

    it('returns empty string at maximum length', () => {
      const message = getApproachingLimitMessage(MAX_CONTENT_LENGTH);
      expect(message).toBe('');
    });

    it('returns empty string above maximum length', () => {
      const message = getApproachingLimitMessage(MAX_CONTENT_LENGTH + 100);
      expect(message).toBe('');
    });
  });

  describe('isApproachingLimit', () => {
    const warningThreshold = Math.floor(MAX_CONTENT_LENGTH * 0.9);

    it('returns false for short text', () => {
      const text = 'A'.repeat(500);
      expect(isApproachingLimit(text)).toBe(false);
    });

    it('returns false for text just below threshold', () => {
      const text = 'A'.repeat(warningThreshold - 1);
      expect(isApproachingLimit(text)).toBe(false);
    });

    it('returns true for text at threshold', () => {
      const text = 'A'.repeat(warningThreshold);
      expect(isApproachingLimit(text)).toBe(true);
    });

    it('returns true for text above threshold but below max', () => {
      const text = 'A'.repeat(warningThreshold + 50);
      expect(isApproachingLimit(text)).toBe(true);
    });

    it('returns false for text at maximum length', () => {
      const text = 'A'.repeat(MAX_CONTENT_LENGTH);
      expect(isApproachingLimit(text)).toBe(false);
    });

    it('returns false for text above maximum length', () => {
      const text = 'A'.repeat(MAX_CONTENT_LENGTH + 100);
      expect(isApproachingLimit(text)).toBe(false);
    });
  });

  describe('getRemainingCharacters', () => {
    it('returns correct remaining count for short text', () => {
      const text = 'Hello world';
      const remaining = getRemainingCharacters(text);
      expect(remaining).toBe(MAX_CONTENT_LENGTH - text.length);
    });

    it('returns zero for text at maximum length', () => {
      const text = 'A'.repeat(MAX_CONTENT_LENGTH);
      const remaining = getRemainingCharacters(text);
      expect(remaining).toBe(0);
    });

    it('returns zero (not negative) for text exceeding maximum length', () => {
      const text = 'A'.repeat(MAX_CONTENT_LENGTH + 500);
      const remaining = getRemainingCharacters(text);
      expect(remaining).toBe(0);
    });

    it('handles empty text', () => {
      const remaining = getRemainingCharacters('');
      expect(remaining).toBe(MAX_CONTENT_LENGTH);
    });

    it('handles text with unicode characters', () => {
      const text = '🎭'.repeat(100); // Each emoji counts as 2 characters
      const remaining = getRemainingCharacters(text);
      expect(remaining).toBe(MAX_CONTENT_LENGTH - text.length);
    });
  });

  describe('ValidationErrorTypes', () => {
    it('exports correct error type constants', () => {
      expect(ValidationErrorTypes.EMPTY_TEXT).toBe('EMPTY_TEXT');
      expect(ValidationErrorTypes.EXCEEDS_MAX_LENGTH).toBe('EXCEEDS_MAX_LENGTH');
    });
  });

  describe('Integration Tests', () => {
    it('works correctly for complete validation workflow', () => {
      // Valid text
      let result = validateTextLength('This is valid text');
      expect(result.isValid).toBe(true);
      expect(isApproachingLimit('This is valid text')).toBe(false);
      
      // Approaching limit
      const approachingText = 'A'.repeat(1850);
      result = validateTextLength(approachingText);
      expect(result.isValid).toBe(true);
      expect(isApproachingLimit(approachingText)).toBe(true);
      expect(getApproachingLimitMessage(approachingText.length)).toContain('Approaching');
      
      // Over limit
      const overLimitText = 'A'.repeat(2100);
      result = validateTextLength(overLimitText);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('exceeds maximum length');
      expect(isApproachingLimit(overLimitText)).toBe(false);
      expect(getRemainingCharacters(overLimitText)).toBe(0);
    });

    it('handles edge cases consistently', () => {
      // Whitespace handling
      expect(validateTextLength('   ').isValid).toBe(false);
      expect(validateTextLength(' valid text ').isValid).toBe(true);
      
      // Exact boundary
      const exactMax = 'A'.repeat(MAX_CONTENT_LENGTH);
      expect(validateTextLength(exactMax).isValid).toBe(true);
      expect(isApproachingLimit(exactMax)).toBe(false);
      expect(getRemainingCharacters(exactMax)).toBe(0);
      
      // One over boundary
      const oneOver = 'A'.repeat(MAX_CONTENT_LENGTH + 1);
      expect(validateTextLength(oneOver).isValid).toBe(false);
      expect(getRemainingCharacters(oneOver)).toBe(0);
    });
  });
});