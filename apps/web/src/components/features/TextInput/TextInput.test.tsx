import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextInput } from './TextInput';
import { VALIDATION_DEBOUNCE_DELAY } from '@/utils/constants';

// Mock the TTS hook
jest.mock('@/hooks/useTTS', () => ({
  useTTS: () => ({
    isConverting: false,
    currentAudio: null,
    conversionStatus: null,
    error: null,
    progress: 0,
    convert: jest.fn(),
    clearError: jest.fn(),
    getAudioUrl: jest.fn((id) => `http://localhost/audio/${id}`),
  }),
}));

// Mock the ConversionStatus component
jest.mock('@/components/features', () => ({
  ...jest.requireActual('@/components/features'),
  ConversionStatus: ({ status, isConverting, error }: { status?: string; isConverting?: boolean; error?: string }) => (
    <div data-testid="conversion-status">
      {isConverting && <span>Converting...</span>}
      {error && <span>Error: {error}</span>}
      {status && <span>Status: {status}</span>}
    </div>
  ),
}));

describe('TextInput Component', () => {
  const defaultProps = {};

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders the TextInput component', () => {
      render(<TextInput {...defaultProps} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
    });

    it('renders with initial text', () => {
      render(<TextInput {...defaultProps} initialText="Initial content" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('Initial content');
    });

    it('renders character count display', () => {
      render(<TextInput {...defaultProps} />);
      expect(screen.getByText('0/2000 characters')).toBeInTheDocument();
    });

    it('renders convert to speech button', () => {
      render(<TextInput {...defaultProps} />);
      const button = screen.getByRole('button', { name: /convert text to speech/i });
      expect(button).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<TextInput {...defaultProps} className="custom-class" data-testid="text-input" />);
      const component = screen.getByTestId('text-input');
      expect(component).toHaveClass('custom-class');
    });
  });

  describe('Text Input Functionality', () => {
    it('updates text when user types', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TextInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello world');
      
      expect(textarea).toHaveValue('Hello world');
    });

    it('calls onTextChange callback after debounce', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onTextChange = jest.fn();
      render(<TextInput {...defaultProps} onTextChange={onTextChange} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test');
      
      // Advance timers to trigger debounced validation
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });
      
      await waitFor(() => {
        expect(onTextChange).toHaveBeenCalledWith('Test', true);
      });
    });

    it('preserves line breaks and formatting', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onTextChange = jest.fn();
      render(<TextInput {...defaultProps} onTextChange={onTextChange} />);
      
      const textarea = screen.getByRole('textbox');
      const multilineText = 'Line 1\n\nLine 3';
      
      await user.click(textarea);
      await user.paste(multilineText);
      
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });
      
      await waitFor(() => {
        expect(onTextChange).toHaveBeenCalledWith(multilineText, true);
      });
    });
  });

  describe('Character Count Display', () => {
    it('shows current character count', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TextInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');
      
      expect(screen.getByText('5/2000 characters')).toBeInTheDocument();
    });

    it('shows warning when approaching character limit', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TextInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      const nearLimitText = 'A'.repeat(1850); // Above 90% of 2000
      
      await user.click(textarea);
      await user.paste(nearLimitText);
      
      await waitFor(() => {
        expect(screen.getByText(/approaching character limit/i)).toBeInTheDocument();
      });
    });

    it('shows error styling when exceeding character limit', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TextInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      const overLimitText = 'A'.repeat(2050); // Over 2000 limit
      
      await user.click(textarea);
      await user.paste(overLimitText);
      
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/text exceeds maximum length/i)).toBeInTheDocument();
      });
    });
  });

  describe('Validation', () => {
    it('shows error for empty text after debounce', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TextInput {...defaultProps} initialText="test" />);
      
      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/please enter some text/i)).toBeInTheDocument();
      });
    });

    it('shows validation error with proper accessibility attributes', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TextInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'A'.repeat(2050));
      
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });
      
      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('calls onTextChange with isValid status', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onTextChange = jest.fn();
      render(<TextInput {...defaultProps} onTextChange={onTextChange} />);
      
      const textarea = screen.getByRole('textbox');
      
      // Valid text
      await user.type(textarea, 'Valid text');
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });
      
      await waitFor(() => {
        expect(onTextChange).toHaveBeenCalledWith('Valid text', true);
      });
      
      // Invalid text (too long)
      await user.clear(textarea);
      await user.paste('A'.repeat(2050));
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });
      
      await waitFor(() => {
        expect(onTextChange).toHaveBeenCalledWith('A'.repeat(2050), false);
      });
    });
  });

  describe('Convert to Speech Button', () => {
    it('is enabled with valid text', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TextInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      const button = screen.getByRole('button', { name: /convert text to speech/i });
      
      await user.type(textarea, 'Valid text');
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });
      
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('is disabled with empty text', () => {
      render(<TextInput {...defaultProps} />);
      const button = screen.getByRole('button', { name: /convert text to speech/i });
      expect(button).toBeDisabled();
    });

    it('is disabled with invalid text', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TextInput {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /convert text to speech/i });
      
      await user.paste('A'.repeat(2050));
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });
      
      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });

    it('is disabled while validating', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TextInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      const button = screen.getByRole('button', { name: /convert text to speech/i });
      
      await user.type(textarea, 'Text');
      
      // During validation (before debounce completes)
      expect(button).toBeDisabled();
    });
  });

  describe('Debouncing', () => {
    it('debounces validation calls', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onTextChange = jest.fn();
      render(<TextInput {...defaultProps} onTextChange={onTextChange} />);
      
      const textarea = screen.getByRole('textbox');
      
      // Type quickly
      await user.type(textarea, 'Test');
      
      // Should not call onTextChange yet
      expect(onTextChange).not.toHaveBeenCalled();
      
      // Advance timers
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });
      
      // Now it should be called once
      await waitFor(() => {
        expect(onTextChange).toHaveBeenCalledTimes(1);
        expect(onTextChange).toHaveBeenCalledWith('Test', true);
      });
    });

    it('resets debounce timer on new input', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onTextChange = jest.fn();
      render(<TextInput {...defaultProps} onTextChange={onTextChange} />);
      
      const textarea = screen.getByRole('textbox');
      
      await user.type(textarea, 'Test');
      
      // Advance time partially
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY / 2);
      });
      
      // Type more (should reset timer)
      await user.type(textarea, ' more');
      
      // Complete the remaining time
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY / 2);
      });
      
      // Should not have called yet (timer was reset)
      expect(onTextChange).not.toHaveBeenCalled();
      
      // Complete full debounce time
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY / 2);
      });
      
      await waitFor(() => {
        expect(onTextChange).toHaveBeenCalledWith('Test more', true);
      });
    });
  });

  describe('Custom Props', () => {
    it('respects custom maxLength', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TextInput {...defaultProps} maxLength={100} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'A'.repeat(50));
      
      expect(screen.getByText('50/100 characters')).toBeInTheDocument();
    });

    it('applies custom data-testid', () => {
      render(<TextInput {...defaultProps} data-testid="custom-text-input" />);
      const component = screen.getByTestId('custom-text-input');
      expect(component).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined callbacks gracefully', () => {
      expect(() => {
        render(<TextInput {...defaultProps} onTextChange={undefined} />);
      }).not.toThrow();
    });

    it('handles whitespace-only text validation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TextInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '   \n\n   ');
      
      act(() => {
        jest.advanceTimersByTime(VALIDATION_DEBOUNCE_DELAY);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/please enter some text/i)).toBeInTheDocument();
      });
    });
  });
});