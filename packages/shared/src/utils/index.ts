// Shared utility functions
export const validateTextLength = (text: string, maxLength = 2000): boolean => {
  return text.length <= maxLength && text.trim().length > 0;
};

export const generateId = (): string => {
  return crypto.randomUUID();
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
};