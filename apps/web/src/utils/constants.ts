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

/**
 * Default comedy material for quick testing
 * Users can select from these pre-written jokes
 */
export const DEFAULT_JOKES = [
  {
    id: 'singapore-kopi',
    title: 'Singapore Kopi Inflation',
    content: `You all know kopi prices keep going up. Last time Kopi-O one dollar, now two dollars. I ask the auntie, "Why so expensive?" She say, "Inflation." I say, "Auntie, I just want coffee, not a balloon!"`
  },
  {
    id: 'mrt-hide-seek',
    title: 'MRT Hide and Seek',
    content: `Why MRT never play hide and seek? Because confirm will get track!`
  },
  {
    id: 'hdb-corridor',
    title: 'HDB Corridor Length',
    content: `Why HDB corridor always so long? So aunties got enough runway to gossip while walking!`
  },
  {
    id: 'void-deck-romance',
    title: 'Void Deck Romance',
    content: `Why void deck so romantic? Because every wedding and funeral also must pass by… true love and life together!`
  },
  {
    id: 'erp-magician',
    title: 'ERP Gantry Magic',
    content: `Why ERP gantry like magician? Because every time you pass by… your money disappear!`
  },
  {
    id: 'kopi-o-levels',
    title: 'Kopi O-Levels',
    content: `Why did the cup of kopi go to school?\n\nBecause it wanted to get kopi-O-levels. Confirm top of the class lah!`
  }
] as const;