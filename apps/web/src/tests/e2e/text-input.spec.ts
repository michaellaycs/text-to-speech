import { test, expect } from '@playwright/test';

test.describe('Text Input Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Page Rendering', () => {
    test('renders main page elements correctly', async ({ page }) => {
      // Check main heading
      await expect(page.getByRole('heading', { name: /standup voice/i })).toBeVisible();
      
      // Check subtitle
      await expect(page.getByText(/text-to-speech for comedy material testing/i)).toBeVisible();
      
      // Check section heading
      await expect(page.getByRole('heading', { name: /enter your comedy material/i })).toBeVisible();
      
      // Check description text
      await expect(page.getByText(/type or paste your jokes/i)).toBeVisible();
      
      // Check text input components
      await expect(page.getByRole('textbox')).toBeVisible();
      await expect(page.getByText('0/2000 characters')).toBeVisible();
      await expect(page.getByRole('button', { name: /convert text to speech/i })).toBeVisible();
    });

    test('has proper page title and meta information', async ({ page }) => {
      await expect(page).toHaveTitle(/standup voice|text-to-speech/i);
    });
  });

  test.describe('Text Input Functionality', () => {
    test('allows user to type text in textarea', async ({ page }) => {
      const textarea = page.getByRole('textbox');
      const testText = 'This is my comedy material for testing.';
      
      await textarea.fill(testText);
      await expect(textarea).toHaveValue(testText);
      
      // Check character count updates
      await expect(page.getByText(`${testText.length}/2000 characters`)).toBeVisible();
    });

    test('allows user to paste text', async ({ page }) => {
      const textarea = page.getByRole('textbox');
      const pasteText = 'Pasted comedy content\n\nWith multiple paragraphs\nand line breaks!';
      
      // Simulate paste operation
      await textarea.focus();
      await page.evaluate((text) => {
        navigator.clipboard.writeText(text);
      }, pasteText);
      await page.keyboard.press('Control+v');
      
      await expect(textarea).toHaveValue(pasteText);
    });

    test('preserves formatting with line breaks and paragraphs', async ({ page }) => {
      const textarea = page.getByRole('textbox');
      const formattedText = 'Joke line 1\n\nPunchline paragraph\n\nAnother joke here';
      
      await textarea.fill(formattedText);
      await expect(textarea).toHaveValue(formattedText);
    });

    test('handles special characters and emojis', async ({ page }) => {
      const textarea = page.getByRole('textbox');
      const specialText = 'Comedy with émojis 🎭 and special chars: !@#$%^&*()';
      
      await textarea.fill(specialText);
      await expect(textarea).toHaveValue(specialText);
    });
  });

  test.describe('Character Count and Validation', () => {
    test('shows real-time character count', async ({ page }) => {
      const textarea = page.getByRole('textbox');
      
      // Start typing
      await textarea.type('Hello');
      await expect(page.getByText('5/2000 characters')).toBeVisible();
      
      // Add more text
      await textarea.type(' world!');
      await expect(page.getByText('12/2000 characters')).toBeVisible();
    });

    test('shows warning when approaching character limit', async ({ page }) => {
      const textarea = page.getByRole('textbox');
      const nearLimitText = 'A'.repeat(1850); // 90% of 2000
      
      await textarea.fill(nearLimitText);
      
      // Wait for debounced validation
      await expect(page.getByText(/approaching character limit/i)).toBeVisible({ timeout: 1000 });
    });

    test('shows error when exceeding character limit', async ({ page }) => {
      const textarea = page.getByRole('textbox');
      const overLimitText = 'A'.repeat(2050);
      
      await textarea.fill(overLimitText);
      
      // Wait for debounced validation
      await expect(page.getByText(/text exceeds maximum length/i)).toBeVisible({ timeout: 1000 });
      
      // Check error styling
      await expect(page.getByRole('alert')).toBeVisible();
    });

    test('validates empty text', async ({ page }) => {
      const textarea = page.getByRole('textbox');
      
      // Type some text then clear it
      await textarea.fill('Some text');
      await textarea.fill('');
      
      // Wait for validation
      await expect(page.getByText(/please enter some text/i)).toBeVisible({ timeout: 1000 });
    });

    test('validates whitespace-only text', async ({ page }) => {
      const textarea = page.getByRole('textbox');
      
      await textarea.fill('   \n\n   ');
      
      // Wait for validation
      await expect(page.getByText(/please enter some text/i)).toBeVisible({ timeout: 1000 });
    });
  });

  test.describe('Convert to Speech Button', () => {
    test('button is disabled with empty text', async ({ page }) => {
      const button = page.getByRole('button', { name: /convert text to speech/i });
      await expect(button).toBeDisabled();
    });

    test('button is enabled with valid text', async ({ page }) => {
      const textarea = page.getByRole('textbox');
      const button = page.getByRole('button', { name: /convert text to speech/i });
      
      await textarea.fill('This is valid comedy material.');
      
      // Wait for debounced validation
      await page.waitForTimeout(600);
      
      await expect(button).toBeEnabled();
    });

    test('button is disabled with invalid text', async ({ page }) => {
      const textarea = page.getByRole('textbox');
      const button = page.getByRole('button', { name: /convert text to speech/i });
      
      // Fill with text over limit
      await textarea.fill('A'.repeat(2100));
      
      // Wait for validation
      await page.waitForTimeout(600);
      
      await expect(button).toBeDisabled();
    });

    test('button shows loading state when clicked', async ({ page }) => {
      const textarea = page.getByRole('textbox');
      const button = page.getByRole('button', { name: /convert text to speech/i });
      
      await textarea.fill('Test comedy material for conversion.');
      await page.waitForTimeout(600); // Wait for validation
      
      // Mock network delay for TTS conversion
      await page.route('/api/tts/convert', async (route) => {
        await page.waitForTimeout(100);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-audio-123',
            sourceTextId: 'text-123',
            filePath: '/tmp/audio/test.mp3',
            duration: 5.2,
            generatedAt: new Date().toISOString(),
            settings: { volume: 75, playbackSpeed: 1.0 },
            metadata: { fileSize: 1024, format: 'mp3', ttsService: 'WebSpeech' }
          })
        });
      });
      
      await button.click();
      await expect(page.getByText('Converting...')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('adapts to mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check that elements are still visible and accessible
      await expect(page.getByRole('textbox')).toBeVisible();
      await expect(page.getByText('0/2000 characters')).toBeVisible();
      await expect(page.getByRole('button', { name: /convert text to speech/i })).toBeVisible();
      
      // Test input functionality on mobile
      const textarea = page.getByRole('textbox');
      await textarea.fill('Mobile test text');
      await expect(textarea).toHaveValue('Mobile test text');
    });

    test('adapts to tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await expect(page.getByRole('textbox')).toBeVisible();
      
      const textarea = page.getByRole('textbox');
      await textarea.fill('Tablet test content');
      await expect(textarea).toHaveValue('Tablet test content');
    });

    test('works on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 });
      
      await expect(page.getByRole('textbox')).toBeVisible();
      
      const textarea = page.getByRole('textbox');
      await textarea.fill('Desktop test content');
      await expect(textarea).toHaveValue('Desktop test content');
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('allows tab navigation through interface', async ({ page }) => {
      // Start from textarea
      await page.getByRole('textbox').focus();
      await expect(page.getByRole('textbox')).toBeFocused();
      
      // Tab to convert button
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: /convert text to speech/i })).toBeFocused();
    });

    test('handles keyboard shortcuts in textarea', async ({ page }) => {
      const textarea = page.getByRole('textbox');
      
      await textarea.fill('Test content for selection');
      
      // Select all with Ctrl+A
      await textarea.focus();
      await page.keyboard.press('Control+a');
      
      // Type to replace selected text
      await textarea.type('Replaced content');
      await expect(textarea).toHaveValue('Replaced content');
    });

    test('handles tab insertion in textarea', async ({ page }) => {
      const textarea = page.getByRole('textbox');
      
      await textarea.fill('Before');
      
      // Move cursor and insert tab
      await textarea.focus();
      await page.keyboard.press('End');
      await page.keyboard.press('Tab');
      await textarea.type('After');
      
      await expect(textarea).toHaveValue('Before\tAfter');
    });
  });

  test.describe('Complete User Workflows', () => {
    test('complete text input to conversion workflow', async ({ page }) => {
      // Step 1: Enter text
      const textarea = page.getByRole('textbox');
      const testText = 'Here is my comedy material that I want to test.';
      
      await textarea.fill(testText);
      await expect(textarea).toHaveValue(testText);
      
      // Step 2: Verify character count
      await expect(page.getByText(`${testText.length}/2000 characters`)).toBeVisible();
      
      // Step 3: Wait for validation
      await page.waitForTimeout(600);
      
      // Step 4: Convert button should be enabled
      const convertButton = page.getByRole('button', { name: /convert text to speech/i });
      await expect(convertButton).toBeEnabled();
      
      // Step 5: Mock successful conversion
      await page.route('/api/tts/convert', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'audio-123',
            sourceTextId: 'text-123',
            filePath: '/tmp/audio/comedy.mp3',
            duration: 3.5,
            generatedAt: new Date().toISOString(),
            settings: { volume: 75, playbackSpeed: 1.0 },
            metadata: { fileSize: 2048, format: 'mp3', ttsService: 'WebSpeech' }
          })
        });
      });
      
      // Step 6: Click convert
      await convertButton.click();
      
      // Step 7: Should show loading state
      await expect(page.getByText('Converting...')).toBeVisible();
    });

    test('handles error scenarios gracefully', async ({ page }) => {
      const textarea = page.getByRole('textbox');
      
      // Test with over-limit text
      await textarea.fill('A'.repeat(2100));
      await page.waitForTimeout(600);
      
      // Should show error message
      await expect(page.getByText(/text exceeds maximum length/i)).toBeVisible();
      
      // Button should be disabled
      const button = page.getByRole('button', { name: /convert text to speech/i });
      await expect(button).toBeDisabled();
      
      // Fix the text
      await textarea.fill('Fixed text within limit');
      await page.waitForTimeout(600);
      
      // Error should disappear, button should be enabled
      await expect(page.getByText(/text exceeds maximum length/i)).not.toBeVisible();
      await expect(button).toBeEnabled();
    });

    test('preserves user input during session', async ({ page }) => {
      const textarea = page.getByRole('textbox');
      const testText = 'Persistent comedy content';
      
      // Enter text
      await textarea.fill(testText);
      
      // Simulate user interactions (focus/blur)
      await page.getByRole('button').focus();
      await textarea.focus();
      
      // Text should still be there
      await expect(textarea).toHaveValue(testText);
    });
  });

  test.describe('Accessibility', () => {
    test('has proper ARIA labels and roles', async ({ page }) => {
      // Check textarea has proper label
      await expect(page.getByRole('textbox', { name: /text input area/i })).toBeVisible();
      
      // Check button has proper label
      await expect(page.getByRole('button', { name: /convert text to speech/i })).toBeVisible();
      
      // Check error messages have alert role
      const textarea = page.getByRole('textbox');
      await textarea.fill('A'.repeat(2100));
      await page.waitForTimeout(600);
      
      await expect(page.getByRole('alert')).toBeVisible();
    });

    test('supports screen reader navigation', async ({ page }) => {
      // Check heading hierarchy
      const h1 = page.getByRole('heading', { level: 1 });
      const h2 = page.getByRole('heading', { level: 2 });
      
      await expect(h1).toBeVisible();
      await expect(h2).toBeVisible();
    });

    test('has proper focus indicators', async ({ page }) => {
      const textarea = page.getByRole('textbox');
      const button = page.getByRole('button', { name: /convert text to speech/i });
      
      // Check focus styles are visible
      await textarea.focus();
      await expect(textarea).toBeFocused();
      
      await button.focus();
      await expect(button).toBeFocused();
    });
  });
});