import { getSupabaseServerClient } from '@/lib/db/supabase';

/**
 * SM-2 Algorithm for Spaced Repetition
 * Based on SuperMemo algorithm
 */

interface ReviewResult {
  flashcardId: string;
  quality: number; // 0-5 (0: complete blackout, 5: perfect response)
}

interface FlashcardState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueAt: Date;
}

/**
 * Calculate next review parameters using SM-2 algorithm
 */
export function calculateNextReview(
  currentState: FlashcardState,
  quality: number
): FlashcardState {
  let { easeFactor, intervalDays, repetitions } = currentState;
  
  // Update ease factor
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );
  
  // If quality < 3, reset repetitions and interval
  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
  }
  
  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + intervalDays);
  
  return {
    easeFactor,
    intervalDays,
    repetitions,
    dueAt,
  };
}

/**
 * Get due flashcards for user
 */
export async function getDueFlashcards(userId: string, limit = 20) {
  const db = getSupabaseServerClient();
  
  const { data, error } = await db
    .from('flashcards')
    .select('*')
    .eq('user_id', userId)
    .lte('due_at', new Date().toISOString())
    .order('due_at', { ascending: true })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

/**
 * Record review and update flashcard schedule
 */
export async function recordReview(result: ReviewResult, userId: string) {
  const db = getSupabaseServerClient();
  
  // Get current flashcard state
  const { data: flashcard, error: fetchError } = await db
    .from('flashcards')
    .select('*')
    .eq('id', result.flashcardId)
    .eq('user_id', userId)
    .single();
  
  if (fetchError || !flashcard) {
    throw new Error('Flashcard not found');
  }
  
  // Calculate next review
  const currentState: FlashcardState = {
    easeFactor: flashcard.ease_factor,
    intervalDays: flashcard.interval_days,
    repetitions: flashcard.repetitions,
    dueAt: new Date(flashcard.due_at),
  };
  
  const nextState = calculateNextReview(currentState, result.quality);
  
  // Update flashcard
  const { error: updateError } = await db
    .from('flashcards')
    .update({
      ease_factor: nextState.easeFactor,
      interval_days: nextState.intervalDays,
      repetitions: nextState.repetitions,
      due_at: nextState.dueAt.toISOString(),
      last_reviewed_at: new Date().toISOString(),
    })
    .eq('id', result.flashcardId)
    .eq('user_id', userId);
  
  if (updateError) throw updateError;
  
  return nextState;
}

/**
 * Create flashcards from content
 */
export async function createFlashcardsFromContent(
  userId: string,
  contentId: string,
  _contentType: 'article' | 'course' | 'entity'
) {
  const db = getSupabaseServerClient();
  
  // TODO: Use LLM to generate flashcards from content
  // For now, return empty array as placeholder
  
  const flashcards: Array<{ front: string; back: string }> = [];
  
  // Insert flashcards
  const now = new Date().toISOString();
  const records = flashcards.map((card) => ({
    user_id: userId,
    content_id: contentId,
    front: card.front,
    back: card.back,
    ease_factor: 2.5,
    interval_days: 0,
    repetitions: 0,
    due_at: now,
  }));
  
  const { data, error } = await db
    .from('flashcards')
    .insert(records)
    .select();
  
  if (error) throw error;
  return data;
}

/**
 * Get user's flashcard stats
 */
export async function getFlashcardStats(userId: string) {
  const db = getSupabaseServerClient();
  
  const [dueResult, totalResult, masteredResult] = await Promise.all([
    db.from('flashcards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('due_at', new Date().toISOString()),
    
    db.from('flashcards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    
    db.from('flashcards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('repetitions', 5)
      .gte('ease_factor', 2.5),
  ]);
  
  return {
    due: dueResult.count || 0,
    total: totalResult.count || 0,
    mastered: masteredResult.count || 0,
  };
}
