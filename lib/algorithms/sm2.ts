/**
 * SM-2 (SuperMemo 2) Spaced Repetition Algorithm
 * Optimizes memory retention through calculated review intervals
 */

export interface SM2Result {
  interval: number; // Days until next review
  repetitions: number; // Number of successful reviews
  easeFactor: number; // Difficulty multiplier (1.3-2.5)
}

/**
 * Calculate next review based on SM-2 algorithm
 * @param quality - User rating (0-5): 0=total blackout, 5=perfect recall
 * @param repetitions - Current number of successful reviews
 * @param easeFactor - Current ease factor (1.3-2.5)
 * @param interval - Current interval in days
 */
export function calculateSM2(
  quality: number,
  repetitions: number,
  easeFactor: number,
  interval: number
): SM2Result {
  let newEaseFactor = easeFactor;
  let newRepetitions = repetitions;
  let newInterval = interval;

  // Quality must be 0-5
  const q = Math.max(0, Math.min(5, quality));

  // Failed recall (quality < 3)
  if (q < 3) {
    newRepetitions = 0;
    newInterval = 1; // Review again tomorrow
  } else {
    // Successful recall
    newRepetitions = repetitions + 1;

    // Calculate new interval
    if (newRepetitions === 1) {
      newInterval = 1; // First review: 1 day
    } else if (newRepetitions === 2) {
      newInterval = 6; // Second review: 6 days
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
  }

  // Update ease factor
  newEaseFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  // Clamp ease factor between 1.3 and 2.5
  newEaseFactor = Math.max(1.3, Math.min(2.5, newEaseFactor));

  return {
    interval: newInterval,
    repetitions: newRepetitions,
    easeFactor: newEaseFactor,
  };
}

/**
 * Determine if a card is due for review
 */
export function isCardDue(dueDate: Date): boolean {
  return new Date() >= dueDate;
}

/**
 * Get next review date
 */
export function getNextReviewDate(intervalDays: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + intervalDays);
  return date;
}

/**
 * Calculate retention rate for analytics
 */
export function calculateRetentionRate(
  correct: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}
