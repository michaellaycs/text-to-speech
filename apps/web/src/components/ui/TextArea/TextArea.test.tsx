import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextArea } from './TextArea';

describe('TextArea Component', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<TextArea {...defaultProps} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue('');
    });

    it('renders with provided value', () => {
      render(<TextArea {...defaultProps} value="Test content" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('Test content');
    });

    it('renders with placeholder text', () => {
      const placeholder = 'Custom placeholder';
      render(<TextArea {...defaultProps} placeholder={placeholder} />);
      const textarea = screen.getByPlaceholderText(placeholder);
      expect(textarea).toBeInTheDocument();
    });

    it('renders with default placeholder when none provided', () => {
      render(<TextArea {...defaultProps} />);
      const textarea = screen.getByPlaceholderText('Enter your text here...');
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('calls onChange when text is typed', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<TextArea {...defaultProps} onChange={handleChange} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');
      
      expect(handleChange).toHaveBeenCalledTimes(5); // One call per character
      expect(handleChange).toHaveBeenLastCalledWith('Hello');
    });

    it('calls onChange when text is pasted', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<TextArea {...defaultProps} onChange={handleChange} />);
      
      const textarea = screen.getByRole('textbox');
      await user.click(textarea);
      await user.paste('Pasted content');
      
      expect(handleChange).toHaveBeenCalledWith('Pasted content');
    });

    it('preserves line breaks and paragraphs', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<TextArea {...defaultProps} onChange={handleChange} />);
      
      const textarea = screen.getByRole('textbox');
      const multilineText = 'First line\n\nSecond paragraph';
      
      await user.click(textarea);
      await user.paste(multilineText);
      
      expect(handleChange).toHaveBeenCalledWith(multilineText);
    });
  });

  describe('Auto-resize Functionality', () => {
    it('adjusts height on content change', async () => {
      const { rerender } = render(<TextArea {...defaultProps} value="" />);
      const textarea = screen.getByRole('textbox');
      
      // Mock scrollHeight to simulate content growth
      Object.defineProperty(textarea, 'scrollHeight', {
        writable: true,
        value: 150,
      });
      
      rerender(<TextArea {...defaultProps} value="This is a longer text that should increase the height" />);
      
      await waitFor(() => {
        expect(textarea.style.height).toBe('150px');
      });
    });
  });

  describe('Tab Handling', () => {
    it('inserts tab character on Tab key press', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<TextArea {...defaultProps} value="Hello world" onChange={handleChange} />);
      
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      
      // Set cursor position
      textarea.focus();
      textarea.setSelectionRange(5, 5); // After "Hello"
      
      await user.keyboard('{Tab}');
      
      expect(handleChange).toHaveBeenCalledWith('Hello\t world');
    });

    it('handles tab insertion with text selection', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<TextArea {...defaultProps} value="Hello world" onChange={handleChange} />);
      
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      
      // Select " world"
      textarea.focus();
      textarea.setSelectionRange(5, 11);
      
      await user.keyboard('{Tab}');
      
      expect(handleChange).toHaveBeenCalledWith('Hello\t');
    });
  });

  describe('Error States', () => {
    it('applies error styling when error prop is true', () => {
      render(<TextArea {...defaultProps} error={true} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });

    it('does not apply error styling when error prop is false', () => {
      render(<TextArea {...defaultProps} error={false} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-invalid', 'false');
    });
  });

  describe('Disabled State', () => {
    it('disables textarea when disabled prop is true', () => {
      render(<TextArea {...defaultProps} disabled={true} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });

    it('enables textarea when disabled prop is false', () => {
      render(<TextArea {...defaultProps} disabled={false} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label', () => {
      render(<TextArea {...defaultProps} />);
      const textarea = screen.getByLabelText('Text input area');
      expect(textarea).toBeInTheDocument();
    });

    it('applies custom data-testid', () => {
      render(<TextArea {...defaultProps} data-testid="custom-textarea" />);
      const textarea = screen.getByTestId('custom-textarea');
      expect(textarea).toBeInTheDocument();
    });

    it('has proper rows attribute', () => {
      render(<TextArea {...defaultProps} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('rows', '3');
    });
  });

  describe('CSS Classes', () => {
    it('applies default CSS classes', () => {
      render(<TextArea {...defaultProps} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('textarea');
    });

    it('applies error class when error is true', () => {
      render(<TextArea {...defaultProps} error={true} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('error');
    });

    it('applies disabled class when disabled is true', () => {
      render(<TextArea {...defaultProps} disabled={true} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('disabled');
    });

    it('applies custom className', () => {
      render(<TextArea {...defaultProps} className="custom-class" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty onChange callback gracefully', () => {
      const handleChange = undefined;
      render(<TextArea value="" onChange={handleChange!} />);
      const textarea = screen.getByRole('textbox');
      
      // Should not throw error
      expect(() => {
        fireEvent.change(textarea, { target: { value: 'test' } });
      }).not.toThrow();
    });

    it('handles very long text content', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      const longText = 'A'.repeat(5000);
      
      render(<TextArea {...defaultProps} onChange={handleChange} />);
      const textarea = screen.getByRole('textbox');
      
      await user.click(textarea);
      await user.paste(longText);
      
      expect(handleChange).toHaveBeenCalledWith(longText);
    });
  });
});