import { db, CONTEXT_ID, PROGRESS_MODEL } from '@/db/orbis';
import { IDBStorage } from './storage/idb';
import type { FSRSOutput } from './fsrs';

interface ProgressRecord extends FSRSOutput {
  user_id: string;
  deck_id: string;
  card_id: string;
  next_review: string;
  review_date: string;
}

export async function syncProgress(userId: string, deckId: string): Promise<void> {
  const storage = await IDBStorage.getInstance();
  
  // Get all progress for this user and deck
  const cards = await storage.getCardsForDeck(deckId);
  const progressPromises = cards.map(card => storage.getCardProgress(card.id, userId));
  const allProgress = await Promise.all(progressPromises);
  
  // Filter out null progress and prepare for sync
  const progressToSync = allProgress
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map(progress => ({
      user_id: userId,
      deck_id: deckId,
      ...progress,
      synced_at: new Date().toISOString()
    }));

  if (progressToSync.length === 0) {
    return;
  }

  // Sync each record to Orbis individually
  for (const progress of progressToSync) {
    await db
      .insert(PROGRESS_MODEL)
      .value(progress)
      .context(CONTEXT_ID)
      .run();
  }
}

export async function getProgressFromOrbis(userId: string, deckId: string): Promise<ProgressRecord[]> {
  const { rows } = await db
    .select()
    .from(PROGRESS_MODEL)
    .where({ user_id: userId, deck_id: deckId })
    .context(CONTEXT_ID)
    .run();
    
  return rows.map(row => ({
    ...row,
    next_review: row.next_review,
    review_date: row.review_date
  })) as ProgressRecord[];
}

export async function pushProgressToOrbis(
  userId: string, 
  deckId: string, 
  progress: (FSRSOutput & { card_id: string })[]
) {
  // Insert each progress record individually since Orbis doesn't support bulk inserts
  for (const p of progress) {
    await db
      .insert(PROGRESS_MODEL)
      .value({
        user_id: userId,
        deck_id: deckId,
        ...p,
        synced_at: new Date().toISOString()
      })
      .context(CONTEXT_ID)
      .run();
  }
} 