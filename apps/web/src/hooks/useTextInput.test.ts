import { renderHook, act, waitFor } from '@testing-library/react';
import { useTextInput } from './useTextInput';
import { MAX_CONTENT_LENGTH, VALIDATION_DEBOUNCE_DELAY } from '@/utils/constants';

describe('useTextInput Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('initializes with default values', () => {
      const { result } = renderHook(() => useTextInput());

      expect(result.current.text).toBe('');
      expect(result.current.debouncedText).toBe('');
      expect(result.current.hasError).toBe(false);
      expect(result.current.errorMessage).toBe('');
      expect(result.current.isValidating).toBe(false);
      expect(result.current.characterCount).toBe(0);
      expect(result.current.isApproachingLimit).toBe(false);
      expect(result.current.isValid).toBe(false); // Empty text is invalid
    });

    it('initializes with provided initial text', () => {
      const { result } = renderHook(() => 
        useTextInput({ initialText: 'Initial content' })
      );

      expect(result.current.text).toBe('Initial content');
      expect(result.current.debouncedText).toBe('Initial content');
      expect(result.current.characterCount).toBe(15);
    });

    it('initializes with custom max length', () => {
      const { result } = renderHook(() => 
        useTextInput({ maxLength: 100 })
      );

      expect(result.current.getCharacterCountDisplay()).toBe('0/100 characters');
    });
  });

  describe('Text Management', () => {
    it('updates text when setText is called', () => {
      const { result } = renderHook(() => useTextInput());

      act(() => {
        result.current.setText('New text');
      });

      expect(result.current.text).toBe('New text');
      expect(result.current.characterCount).toBe(8);
      expect(result.current.isValidating).toBe(true);
    });

    it('clears text when clearText is called', () => {
      const { result } = renderHook(() => 
        useTextInput({ initialText: 'Some content' })
      );

      act(() => {
        result.current.clearText();
      });

      expect(result.current.text).toBe('');
      expect(result.current.characterCount).toBe(0);
    });

    it('preserves formatting in text', () => {
      const { result } = renderHook(() => useTextInput());
      const formattedText = 'Line 1\n\nLine 3\n\tTabbed content';

      act(() => {
        result.current.setText(formattedText);
      });

      expect(result.current.text).toBe(formattedText);
    });
  });

  describe('Debouncing', () => {
    it('debounces text validation', async () => {
      const onTextChange = jest.fn();
      const { result } = renderHook(() => 
        useTextInput({ onTextChange })
      );

      act(() => {
        result.current.setText('Test');
      });

      // Should be validating
      expect(result.current.isValidating).toBe(true);
      expect(onTextChange).not.toHaveBeenCalled();

      // Advance timers
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
        expect(result.current.debouncedText).toBe('Test');
        expect(onTextChange).toHaveBeenCalledWith('Test', true);
      });
    });

    it('resets debounce timer on new input', async () => {
      const onTextChange = jest.fn();
      const { result } = renderHook(() => 
        useTextInput({ onTextChange })
      );

      act(() => {
        result.current.setText('First');
      });

      // Advance time partially
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY / 2);
      });

      // Change text again (should reset timer)
      act(() => {
        result.current.setText('Second');
      });

      // Complete the remaining partial time
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY / 2);
      });

      // Should still be validating (timer was reset)
      expect(result.current.isValidating).toBe(true);
      expect(onTextChange).not.toHaveBeenCalled();

      // Complete full debounce time
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY / 2);
      });

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
        expect(onTextChange).toHaveBeenCalledWith('Second', true);
      });
    });

    it('respects custom debounce delay', async () => {
      const customDelay = 1000;
      const onTextChange = jest.fn();
      const { result } = renderHook(() => 
        useTextInput({ onTextChange, debounceDelay: customDelay })
      );

      act(() => {
        result.current.setText('Test');
      });

      // Advance by default delay (should still be validating)
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });

      expect(result.current.isValidating).toBe(true);
      expect(onTextChange).not.toHaveBeenCalled();

      // Advance by custom delay
      act(() => {
        jest.advanceTimersByTime(customDelay - VALIDATION_DEBOUNCE_DELAY);
      });

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
        expect(onTextChange).toHaveBeenCalledWith('Test', true);
      });
    });
  });

  describe('Validation', () => {
    it('validates empty text as invalid', async () => {
      const { result } = renderHook(() => useTextInput());

      act(() => {
        result.current.setText('');
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });

      await waitFor(() => {
        expect(result.current.hasError).toBe(true);
        expect(result.current.errorMessage).toContain('Please enter some text');
        expect(result.current.isValid).toBe(false);
      });
    });

    it('validates whitespace-only text as invalid', async () => {
      const { result } = renderHook(() => useTextInput());

      act(() => {
        result.current.setText('   \n\n   ');
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });

      await waitFor(() => {
        expect(result.current.hasError).toBe(true);
        expect(result.current.errorMessage).toContain('Please enter some text');
        expect(result.current.isValid).toBe(false);
      });
    });

    it('validates text exceeding max length', async () => {
      const { result } = renderHook(() => useTextInput());
      const longText = 'A'.repeat(MAX_CONTENT_LENGTH + 100);

      act(() => {
        result.current.setText(longText);
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });

      await waitFor(() => {
        expect(result.current.hasError).toBe(true);
        expect(result.current.errorMessage).toContain('exceeds maximum length');
        expect(result.current.isValid).toBe(false);
      });
    });

    it('validates normal text as valid', async () => {
      const { result } = renderHook(() => useTextInput());

      act(() => {
        result.current.setText('This is valid text');
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });

      await waitFor(() => {
        expect(result.current.hasError).toBe(false);
        expect(result.current.errorMessage).toBe('');
        expect(result.current.isValid).toBe(true);
      });
    });

    it('calls validateText manually', async () => {
      const { result } = renderHook(() => 
        useTextInput({ initialText: 'Valid text' })
      );

      // Wait for initial debounce
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });

      await waitFor(() => {
        const isValid = result.current.validateText();
        expect(isValid).toBe(true);
      });
    });
  });

  describe('Character Count and Limits', () => {
    it('detects approaching character limit', async () => {
      const { result } = renderHook(() => useTextInput());
      const approachingLimitText = 'A'.repeat(1850); // 90% of 2000

      act(() => {
        result.current.setText(approachingLimitText);
      });

      expect(result.current.isApproachingLimit).toBe(true);
      expect(result.current.getCharacterCountDisplay()).toContain('Approaching character limit');
    });

    it('shows normal character count for regular text', () => {
      const { result } = renderHook(() => useTextInput());

      act(() => {
        result.current.setText('Hello world');
      });

      expect(result.current.isApproachingLimit).toBe(false);
      expect(result.current.getCharacterCountDisplay()).toBe('11/2000 characters');
    });

    it('uses custom max length in character count', () => {
      const { result } = renderHook(() => 
        useTextInput({ maxLength: 500 })
      );

      act(() => {
        result.current.setText('Test');
      });

      expect(result.current.getCharacterCountDisplay()).toBe('4/500 characters');
    });

    it('returns correct character count class names', async () => {
      const { result } = renderHook(() => useTextInput());

      // Normal text
      act(() => {
        result.current.setText('Normal text');
      });
      expect(result.current.getCharacterCountClassName()).toBe('characterCountValidating');

      // After debounce
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });
      await waitFor(() => {
        expect(result.current.getCharacterCountClassName()).toBe('characterCount');
      });

      // Approaching limit
      act(() => {
        result.current.setText('A'.repeat(1850));
      });
      expect(result.current.getCharacterCountClassName()).toBe('characterCountValidating');

      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });
      await waitFor(() => {
        expect(result.current.getCharacterCountClassName()).toBe('characterCountWarning');
      });

      // Error state
      act(() => {
        result.current.setText('A'.repeat(2100));
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });
      await waitFor(() => {
        expect(result.current.getCharacterCountClassName()).toBe('characterCountError');
      });
    });
  });

  describe('Callbacks', () => {
    it('calls onTextChange with correct parameters', async () => {
      const onTextChange = jest.fn();
      const { result } = renderHook(() => 
        useTextInput({ onTextChange })
      );

      act(() => {
        result.current.setText('Valid text');
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });

      await waitFor(() => {
        expect(onTextChange).toHaveBeenCalledWith('Valid text', true);
      });

      // Clear and test invalid state
      onTextChange.mockClear();
      act(() => {
        result.current.setText('');
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });

      await waitFor(() => {
        expect(onTextChange).toHaveBeenCalledWith('', false);
      });
    });

    it('handles missing onTextChange callback gracefully', () => {
      const { result } = renderHook(() => useTextInput());

      expect(() => {
        act(() => {
          result.current.setText('Test');
          jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
        });
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid text changes correctly', async () => {
      const onTextChange = jest.fn();
      const { result } = renderHook(() => 
        useTextInput({ onTextChange })
      );

      // Rapid changes
      act(() => {
        result.current.setText('A');
      });
      act(() => {
        result.current.setText('AB');
      });
      act(() => {
        result.current.setText('ABC');
      });

      // Should only validate the final value
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });

      await waitFor(() => {
        expect(onTextChange).toHaveBeenCalledTimes(1);
        expect(onTextChange).toHaveBeenCalledWith('ABC', true);
      });
    });

    it('cleans up timers on unmount', () => {
      const { result, unmount } = renderHook(() => useTextInput());

      act(() => {
        result.current.setText('Test');
      });

      expect(result.current.isValidating).toBe(true);

      // Unmount before debounce completes
      unmount();

      // Should not throw or cause memory leaks
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });
    });

    it('handles zero max length', () => {
      const { result } = renderHook(() => 
        useTextInput({ maxLength: 0 })
      );

      expect(result.current.getCharacterCountDisplay()).toBe('0/0 characters');

      act(() => {
        result.current.setText('A');
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });

      waitFor(() => {
        expect(result.current.hasError).toBe(true);
      });
    });
  });
});