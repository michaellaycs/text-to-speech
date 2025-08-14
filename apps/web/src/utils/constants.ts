/**
 * Text Input Validation Constants
 * These constants define the limits and thresholds for text input validation
 */

/**
 * Maximum allowed character length for text content
 * This limit ensures optimal performance and prevents excessive API usage
 */
export const MAX_CONTENT_LENGTH = 2000;

/**
 * Warning threshold as percentage of maximum length
 * Users will see a warning when approaching this percentage of the limit
 */
export const WARNING_THRESHOLD_PERCENTAGE = 0.9; // 90%

/**
 * Calculated warning threshold in characters
 * Warning is shown when text reaches this character count
 */
export const WARNING_THRESHOLD = Math.floor(MAX_CONTENT_LENGTH * WARNING_THRESHOLD_PERCENTAGE);

/**
 * Debounce delay for validation in milliseconds
 * Prevents excessive validation calls during rapid typing
 */
export const VALIDATION_DEBOUNCE_DELAY = 500;

/**
 * Minimum required text length (after trimming whitespace)
 */
export const MIN_CONTENT_LENGTH = 1;