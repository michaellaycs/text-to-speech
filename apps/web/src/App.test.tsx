import { render, screen } from '@testing-library/react';
import App from './App';

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
    getAudioUrl: jest.fn(),
  }),
}));

// Mock the ConversionStatus component
jest.mock('@/components/features', () => ({
  ...jest.requireActual('@/components/features'),
  ConversionStatus: () => <div data-testid="conversion-status">Conversion Status</div>,
}));

test('renders StandUp Voice heading', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /standup voice/i });
  expect(heading).toBeInTheDocument();
});

test('renders description text', () => {
  render(<App />);
  const description = screen.getByText(/text-to-speech for comedy material testing/i);
  expect(description).toBeInTheDocument();
});

test('renders text input section', () => {
  render(<App />);
  const sectionHeading = screen.getByRole('heading', { name: /enter your comedy material/i });
  expect(sectionHeading).toBeInTheDocument();
});

test('renders TextInput component', () => {
  render(<App />);
  const textarea = screen.getByRole('textbox');
  expect(textarea).toBeInTheDocument();
});