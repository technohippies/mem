import type { Deck, Flashcard } from '@/types/models';
import type { FSRSOutput } from '../fsrs';
import type { StorageInterface } from './interface';
import { db, CONTEXT_ID, DECK_MODEL, FLASHCARD_MODEL, PROGRESS_MODEL, orbisToAppDeck, orbisToAppFlashcard, type OrbisDeck, type OrbisFlashcard } from '@/db/orbis';

// Singleton instance to track storage session
let storageSession: Promise<void> | null = null;

export async function initStorageSession() {
  if (!storageSession) {
    storageSession = (async () => {
      try {
        console.log('Initializing Orbis storage session...');
        
        // Wait a bit for the connection to be fully established
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the current user's DID from the auth result
        const details = await db.getConnectedUser();
        console.log('Got user details:', details);
        
        if (!details) {
          throw new Error('No authenticated user found');
        }

        // Get the user's DID from the details object
        const did = details.user?.did;
        if (!did) {
          throw new Error('No DID found in auth result');
        }
        console.log('Current user DID:', did);

        // Create a test write to initialize the session
        console.log('Performing test write to Orbis...');
        const result = await db
          .insert(PROGRESS_MODEL)
          .value({
            flashcard_id: 'test',
            reps: 0,
            lapses: 0,
            stability: 0,
            difficulty: 0,
            last_review: new Date().toISOString(),
            next_review: new Date().toISOString(),
            correct_reps: 0,
            last_interval: 0,
            retrievability: 0
          })
          .context(CONTEXT_ID)
          .run();

        console.log('Test write successful:', result);
        console.log('Orbis storage session initialized successfully');
      } catch (error) {
        console.error('Failed to initialize storage session:', error);
        storageSession = null; // Reset so we can try again
        throw error;
      }
    })();
  }
  return storageSession;
}

export async function clearStorageSession() {
  console.log('Clearing Orbis storage session...');
  try {
    await db.disconnectUser();
    storageSession = null;
    console.log('Orbis storage session cleared successfully');
  } catch (error) {
    console.error('Failed to clear storage session:', error);
    throw error;
  }
}

// Helper function to get user's DID
async function getUserDID(): Promise<string> {
  const details = await db.getConnectedUser();
  if (!details) {
    throw new Error('No authenticated user found');
  }
  
  const did = (details as any).id;
  if (!did) {
    throw new Error('No DID found in auth result');
  }
  
  return did;
}

export class OrbisStorage implements StorageInterface {
    async getDeckBySlug(slug: string): Promise<Deck | null> {
        console.log('Looking for deck with stream_id:', slug);
        const { rows } = await db
            .select()
            .from(DECK_MODEL)
            .where({ stream_id: slug })
            .context(CONTEXT_ID)
            .run();

        if (rows.length === 0) return null;
        return orbisToAppDeck(rows[0] as OrbisDeck);
    }

    async getDeckByStreamId(streamId: string): Promise<Deck | null> {
        return this.getDeckBySlug(streamId); // They're the same in our implementation
    }

    async getAllDecks(): Promise<Deck[]> {
        const { rows } = await db
            .select()
            .from(DECK_MODEL)
            .where({ is_public: true })
            .context(CONTEXT_ID)
            .run();

        return rows.map(row => orbisToAppDeck(row as OrbisDeck));
    }

    async getAdminDecks(): Promise<Deck[]> {
        const { rows } = await db
            .select()
            .from(DECK_MODEL)
            .where({ 
                is_public: true,
                controller: import.meta.env.VITE_ORBIS_ENVIRONMENT_ID 
            })
            .context(CONTEXT_ID)
            .run();

        return rows.map(row => orbisToAppDeck(row as OrbisDeck));
    }

    async getUserDecks(userId: string): Promise<Deck[]> {
        const { rows } = await db
            .select()
            .from(DECK_MODEL)
            .where({ controller: userId })
            .context(CONTEXT_ID)
            .run();

        return rows.map(row => orbisToAppDeck(row as OrbisDeck));
    }

    // These methods are no-ops in Orbis as ownership is handled by the controller field
    async addDeckToUser(): Promise<void> {
        return Promise.resolve();
    }

    async removeDeckFromUser(): Promise<void> {
        return Promise.resolve();
    }

    async getCardsForDeck(deckId: string): Promise<Flashcard[]> {
        console.log('Getting cards for deck:', deckId);
        const { rows } = await db
            .select()
            .from(FLASHCARD_MODEL)
            .where({ deck_id: deckId })
            .orderBy(['sort_order', 'asc'])
            .context(CONTEXT_ID)
            .run();

        return rows.map(row => orbisToAppFlashcard(row as OrbisFlashcard));
    }

    async getDueCards(deckId: string, userId: string, maxNewCards: number = 20): Promise<Flashcard[]> {
        // For now, we'll just return all cards for the deck
        // In a future version, we can store progress in a separate Orbis model
        const cards = await this.getCardsForDeck(deckId);
        return cards.slice(0, maxNewCards);
    }

    async updateCardProgress(cardId: string, userId: string, fsrsData: FSRSOutput): Promise<void> {
        // For now, we'll store progress in local storage
        // In a future version, we can create a separate Orbis model for progress
        const key = `progress:${userId}:${cardId}`;
        localStorage.setItem(key, JSON.stringify({
            ...fsrsData,
            next_review: new Date(Date.now() + fsrsData.interval * 24 * 60 * 60 * 1000).toISOString()
        }));
    }

    async getUserStreak(userId: string): Promise<number> {
        // For now, return 0 as we're not tracking streaks yet
        // In a future version, we can create a separate Orbis model for streaks
        return 0;
    }

    async getDueCardCounts(userId: string): Promise<{ [deckId: string]: number }> {
        // For now, return empty object as we're not tracking due cards yet
        // In a future version, we can calculate this from the progress model
        return {};
    }

    async sync(): Promise<void> {
        // No need to sync as Orbis handles this
        return Promise.resolve();
    }
} 