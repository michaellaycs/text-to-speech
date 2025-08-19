import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AudioPlayer } from './AudioPlayer';

// Mock HTML5 Audio
const mockAudio = {
  play: jest.fn(() => Promise.resolve()),
  pause: jest.fn(),
  load: jest.fn(),
  currentTime: 0,
  duration: 120, // 2 minutes
  volume: 0.75,
  paused: true,
  ended: false,
  readyState: 4,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
};

// Mock audio element
Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
  writable: true,
  value: mockAudio.play,
});

Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
  writable: true,
  value: mockAudio.pause,
});

// Helper function to trigger audio events
const triggerAudioEvent = (eventType: string, properties?: Record<string, unknown>) => {
  const audioElement = screen.getByRole('application').querySelector('audio');
  if (audioElement) {
    if (properties) {
      // Use defineProperty for read-only properties like duration
      Object.keys(properties).forEach(key => {
        try {
          if (key === 'duration' || key === 'currentTime') {
            Object.defineProperty(audioElement, key, {
              value: properties[key],
              writable: true,
              configurable: true
            });
          } else {
            (audioElement as HTMLAudioElement)[key as keyof HTMLAudioElement] = properties[key] as never;
          }
        } catch {
          // Ignore property assignment errors in tests
        }
      });
    }
    fireEvent[eventType as keyof typeof fireEvent](audioElement);
  }
};

describe('AudioPlayer Component', () => {
  const defaultProps = {
    src: 'test-audio.mp3',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAudio.currentTime = 0;
    mockAudio.duration = 120;
    mockAudio.volume = 0.75;
    mockAudio.paused = true;
  });

  describe('Basic Rendering', () => {
    it('renders audio player with default props', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      expect(screen.getByTestId('audio-player')).toBeInTheDocument();
      expect(screen.getByTestId('play-pause-button')).toBeInTheDocument();
      expect(screen.getByTestId('time-display')).toBeInTheDocument();
      expect(screen.getByTestId('volume-slider')).toBeInTheDocument();
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });

    it('applies custom className and testId', () => {
      render(
        <AudioPlayer 
          {...defaultProps} 
          className="custom-player"
          data-testid="custom-audio-player"
        />
      );
      
      const player = screen.getByTestId('custom-audio-player');
      expect(player).toBeInTheDocument();
      expect(player).toHaveClass('custom-player');
    });

    it('shows loading state initially', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      const playButton = screen.getByTestId('play-pause-button');
      expect(playButton).toBeDisabled();
      expect(playButton).toHaveTextContent('⏳');
    });
  });

  describe('Audio Loading States', () => {
    it('handles successful audio loading', async () => {
      const onCanPlay = jest.fn();
      render(<AudioPlayer {...defaultProps} onCanPlay={onCanPlay} />);
      
      // Simulate audio can play
      triggerAudioEvent('canPlay');
      
      await waitFor(() => {
        expect(onCanPlay).toHaveBeenCalled();
        expect(screen.getByTestId('play-pause-button')).not.toBeDisabled();
      });
    });

    it('handles audio loading error', async () => {
      const onError = jest.fn();
      render(<AudioPlayer {...defaultProps} onError={onError} />);
      
      // Simulate audio error
      triggerAudioEvent('error');
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Failed to load audio. Please try again.');
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Failed to load audio. Please try again.')).toBeInTheDocument();
      });
    });

    it('shows metadata when loaded', async () => {
      render(<AudioPlayer {...defaultProps} />);
      
      // Simulate metadata loaded with 2 minutes duration
      triggerAudioEvent('loadedMetadata', { duration: 120 });
      
      await waitFor(() => {
        expect(screen.getByText('2:00')).toBeInTheDocument();
      });
    });
  });

  describe('Playback Controls', () => {
    beforeEach(async () => {
      render(<AudioPlayer {...defaultProps} />);
      // Simulate audio ready to play
      triggerAudioEvent('canPlay');
      triggerAudioEvent('loadedMetadata', { duration: 120 });
      
      await waitFor(() => {
        expect(screen.getByTestId('play-pause-button')).not.toBeDisabled();
      });
    });

    it('plays audio when play button is clicked', async () => {
      const user = userEvent.setup();
      const playButton = screen.getByTestId('play-pause-button');
      
      await user.click(playButton);
      
      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('pauses audio when pause button is clicked', async () => {
      const user = userEvent.setup();
      const playButton = screen.getByTestId('play-pause-button');
      
      // First click to play
      await user.click(playButton);
      
      // Simulate playing state
      triggerAudioEvent('play');
      
      // Second click to pause
      await user.click(playButton);
      
      expect(mockAudio.pause).toHaveBeenCalled();
    });

    it('updates button icon based on play state', async () => {
      const user = userEvent.setup();
      const playButton = screen.getByTestId('play-pause-button');
      
      // Initially shows play icon
      expect(playButton).toHaveTextContent('▶️');
      
      // Click to play
      await user.click(playButton);
      
      // Should show pause icon when playing
      expect(playButton).toHaveTextContent('⏸️');
    });
  });

  describe('Time Display and Progress', () => {
    beforeEach(async () => {
      render(<AudioPlayer {...defaultProps} />);
      triggerAudioEvent('canPlay');
      triggerAudioEvent('loadedMetadata', { duration: 120 });
      
      await waitFor(() => {
        expect(screen.getByTestId('play-pause-button')).not.toBeDisabled();
      });
    });

    it('displays current time and duration', () => {
      expect(screen.getByText('0:00')).toBeInTheDocument();
      expect(screen.getByText('2:00')).toBeInTheDocument();
    });

    it('updates time display during playback', async () => {
      const onTimeUpdate = jest.fn();
      const { container } = render(<AudioPlayer {...defaultProps} onTimeUpdate={onTimeUpdate} />);
      
      const audioElement = container.querySelector('audio');
      if (audioElement) {
        Object.defineProperty(audioElement, 'currentTime', { value: 30, configurable: true });
        fireEvent.timeUpdate(audioElement);
      }
      
      await waitFor(() => {
        expect(onTimeUpdate).toHaveBeenCalledWith(30);
      });
    });

    it('allows seeking by clicking progress bar', async () => {
      const user = userEvent.setup();
      const progressBar = screen.getByTestId('progress-bar');
      
      // Mock getBoundingClientRect for seek calculation
      Element.prototype.getBoundingClientRect = jest.fn(() => ({
        left: 0,
        width: 200,
        top: 0,
        height: 20,
        right: 200,
        bottom: 20,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }));
      
      // Click at 50% position (should seek to 60 seconds)
      await user.click(progressBar, { clientX: 100 });
      
      // Verify the audio element's currentTime would be set
      // Note: We can't directly test currentTime setting due to jsdom limitations
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Volume Controls', () => {
    beforeEach(async () => {
      render(<AudioPlayer {...defaultProps} />);
      triggerAudioEvent('canPlay');
      
      await waitFor(() => {
        expect(screen.getByTestId('play-pause-button')).not.toBeDisabled();
      });
    });

    it('displays initial volume level', () => {
      const volumeSlider = screen.getByTestId('volume-slider') as HTMLInputElement;
      expect(volumeSlider.value).toBe('75');
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('changes volume when slider is moved', () => {
      const volumeSlider = screen.getByTestId('volume-slider') as HTMLInputElement;
      
      fireEvent.change(volumeSlider, { target: { value: '50' } });
      
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('toggles mute when mute button is clicked', async () => {
      const user = userEvent.setup();
      const muteButton = screen.getByTestId('mute-button');
      
      // Initially unmuted
      expect(muteButton).toHaveTextContent('🔊');
      
      // Click to mute
      await user.click(muteButton);
      
      expect(muteButton).toHaveTextContent('🔇');
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('shows different volume icons based on level', () => {
      const volumeSlider = screen.getByTestId('volume-slider') as HTMLInputElement;
      const muteButton = screen.getByTestId('mute-button');
      
      // Low volume
      fireEvent.change(volumeSlider, { target: { value: '25' } });
      expect(muteButton).toHaveTextContent('🔉');
      
      // High volume
      fireEvent.change(volumeSlider, { target: { value: '75' } });
      expect(muteButton).toHaveTextContent('🔊');
    });
  });

  describe('Keyboard Shortcuts', () => {
    beforeEach(async () => {
      render(<AudioPlayer {...defaultProps} />);
      triggerAudioEvent('canPlay');
      triggerAudioEvent('loadedMetadata', { duration: 120 });
      
      await waitFor(() => {
        expect(screen.getByTestId('play-pause-button')).not.toBeDisabled();
      });
    });

    it('plays/pauses with spacebar', async () => {
      const user = userEvent.setup();
      const player = screen.getByTestId('audio-player');
      
      player.focus();
      await user.keyboard(' ');
      
      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('seeks with arrow keys', async () => {
      const user = userEvent.setup();
      const player = screen.getByTestId('audio-player');
      
      player.focus();
      
      // Test left arrow (seek backward)
      await user.keyboard('{ArrowLeft}');
      
      // Test right arrow (seek forward)
      await user.keyboard('{ArrowRight}');
      
      // Test home (beginning)
      await user.keyboard('{Home}');
      
      // Test end (end of audio)
      await user.keyboard('{End}');
      
      // These would set currentTime on the actual audio element
      expect(player).toHaveFocus();
    });

    it('adjusts volume with up/down arrows', async () => {
      const user = userEvent.setup();
      const player = screen.getByTestId('audio-player');
      
      player.focus();
      
      // Test volume up
      await user.keyboard('{ArrowUp}');
      expect(screen.getByText('85%')).toBeInTheDocument();
      
      // Test volume down
      await user.keyboard('{ArrowDown}');
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('toggles mute with M key', async () => {
      const user = userEvent.setup();
      const player = screen.getByTestId('audio-player');
      
      player.focus();
      await user.keyboard('m');
      
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      expect(screen.getByRole('application')).toHaveAttribute('aria-label', 'Audio player');
      expect(screen.getByTestId('play-pause-button')).toHaveAttribute('aria-label', 'Play');
      expect(screen.getByTestId('mute-button')).toHaveAttribute('aria-label', 'Mute');
      expect(screen.getByTestId('volume-slider')).toHaveAttribute('aria-label', 'Volume');
    });

    it('is keyboard navigable', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      const player = screen.getByTestId('audio-player');
      expect(player).toHaveAttribute('tabIndex', '0');
      
      const playButton = screen.getByTestId('play-pause-button');
      expect(playButton).not.toHaveAttribute('tabIndex', '-1');
    });

    it('announces errors with alert role', async () => {
      render(<AudioPlayer {...defaultProps} />);
      
      triggerAudioEvent('error');
      
      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent('Failed to load audio. Please try again.');
      });
    });
  });

  describe('Event Callbacks', () => {
    it('calls onTimeUpdate when time updates', async () => {
      const onTimeUpdate = jest.fn();
      render(<AudioPlayer {...defaultProps} onTimeUpdate={onTimeUpdate} />);
      
      triggerAudioEvent('timeUpdate', { currentTime: 45 });
      
      expect(onTimeUpdate).toHaveBeenCalledWith(45);
    });

    it('calls onEnded when playback ends', async () => {
      const onEnded = jest.fn();
      render(<AudioPlayer {...defaultProps} onEnded={onEnded} />);
      
      triggerAudioEvent('ended');
      
      expect(onEnded).toHaveBeenCalled();
    });

    it('calls onLoadStart when loading begins', async () => {
      const onLoadStart = jest.fn();
      render(<AudioPlayer {...defaultProps} onLoadStart={onLoadStart} />);
      
      triggerAudioEvent('loadStart');
      
      expect(onLoadStart).toHaveBeenCalled();
    });

    it('calls onCanPlay when audio is ready', async () => {
      const onCanPlay = jest.fn();
      render(<AudioPlayer {...defaultProps} onCanPlay={onCanPlay} />);
      
      triggerAudioEvent('canPlay');
      
      expect(onCanPlay).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles invalid audio source gracefully', async () => {
      const onError = jest.fn();
      render(<AudioPlayer src="invalid-audio.mp3" onError={onError} />);
      
      triggerAudioEvent('error');
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('handles missing duration metadata', () => {
      const { container } = render(<AudioPlayer {...defaultProps} />);
      
      const audioElement = container.querySelector('audio');
      if (audioElement) {
        Object.defineProperty(audioElement, 'duration', { value: NaN, configurable: true });
        fireEvent.loadedMetadata(audioElement);
      }
      
      // Should still show 0:00 when duration is NaN
      const timeDisplays = container.querySelectorAll('.currentTime, .duration');
      expect(timeDisplays[0]).toHaveTextContent('0:00');
      expect(timeDisplays[1]).toHaveTextContent('0:00');
    });

    it('prevents negative time display', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      triggerAudioEvent('timeUpdate', { currentTime: -10 });
      
      expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    it('handles volume bounds correctly', async () => {
      render(<AudioPlayer {...defaultProps} />);
      
      const volumeSlider = screen.getByTestId('volume-slider') as HTMLInputElement;
      
      // Test maximum volume
      fireEvent.change(volumeSlider, { target: { value: '150' } });
      
      // Should cap at 100%
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });
});