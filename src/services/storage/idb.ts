import { openDB, type IDBPDatabase } from 'idb';
import type { Deck, Flashcard } from '@/types/models';
import type { FSRSOutput } from '../fsrs';
import type { StorageInterface } from './interface';

const DB_NAME = 'anki-farcaster-v1';
const DB_VERSION = 1;

interface IDBSchema {
  decks: {
    key: string;
    value: Deck;
    indexes: {
      'by-slug': string;
      'by-stream-id': string;
    };
  };
  cards: {
    key: string;
    value: Flashcard;
    indexes: {
      'by-deck': string;
      'by-sort-order': number;
    };
  };
  progress: {
    key: string; // userId:cardId
    value: FSRSOutput & {
      user_id: string;
      card_id: string;
      next_review: string;
      review_date: string;
    };
    indexes: {
      'by-user': string;
      'by-next-review': string;
    };
  };
}

// Singleton instance
let instance: IDBStorage | null = null;

export class IDBStorage implements StorageInterface {
  private db!: IDBPDatabase<IDBSchema>;
  private userId: string;
  private initialized: Promise<void>;

  private constructor(userId: string) {
    this.userId = userId;
    this.initialized = this.init();
  }

  static async getInstance(userId: string): Promise<IDBStorage> {
    if (!instance) {
      instance = new IDBStorage(userId);
      await instance.initialized;
    } else if (instance.userId !== userId) {
      await instance.db?.close();
      instance = new IDBStorage(userId);
      await instance.initialized;
    }
    return instance;
  }

  private async init() {
    try {
      console.log(`Initializing IndexedDB: ${DB_NAME} (v${DB_VERSION})`);
      this.db = await openDB<IDBSchema>(DB_NAME, DB_VERSION, {
        blocked() {
          console.warn('Database blocked: another version is open');
        },
        blocking() {
          console.warn('Database blocking: closing older version');
        },
        terminated() {
          console.error('Database terminated unexpectedly');
        },
        upgrade(db, oldVersion, newVersion) {
          console.log(`Upgrading database from v${oldVersion} to v${newVersion}`);
          
          // Create stores if they don't exist
          if (!db.objectStoreNames.contains('decks')) {
            console.log('Creating decks store...');
            const deckStore = db.createObjectStore('decks', { keyPath: 'id' });
            deckStore.createIndex('by-slug', 'slug');
            deckStore.createIndex('by-stream-id', 'stream_id');
          }

          if (!db.objectStoreNames.contains('cards')) {
            console.log('Creating cards store...');
            const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
            cardStore.createIndex('by-deck', 'deck_id');
            cardStore.createIndex('by-sort-order', 'sort_order');
          }

          if (!db.objectStoreNames.contains('progress')) {
            console.log('Creating progress store...');
            const progressStore = db.createObjectStore('progress', { 
              keyPath: ['user_id', 'card_id']
            });
            progressStore.createIndex('by-user', 'user_id');
            progressStore.createIndex('by-next-review', 'next_review');
          }
        }
      });

      // Verify stores were created
      const storeNames = Array.from(this.db.objectStoreNames);
      console.log('Available stores:', storeNames);
      
      console.log('IDB initialized successfully');
    } catch (error) {
      console.error('Failed to initialize IDB:', error);
      throw error;
    }
  }

  // Helper method to ensure DB is initialized
  private async ensureDB() {
    await this.initialized;
    if (!this.db) {
      throw new Error('Database not initialized');
    }
  }

  async getDeckBySlug(slug: string): Promise<Deck | null> {
    await this.ensureDB();
    return this.db.getFromIndex('decks', 'by-slug', slug);
  }

  async getAllDecks(): Promise<Deck[]> {
    await this.ensureDB();
    return this.db.getAll('decks');
  }

  async getAdminDecks(): Promise<Deck[]> {
    await this.ensureDB();
    const allDecks = await this.getAllDecks();
    return allDecks.filter(deck => deck.is_admin);
  }

  async getUserDecks(userId: string): Promise<Deck[]> {
    await this.ensureDB();
    return this.getAllDecks();
  }

  async addDeckToUser(userId: string, deckId: string): Promise<void> {
    await this.ensureDB();
    // No-op for now
  }

  async removeDeckFromUser(userId: string, deckId: string): Promise<void> {
    await this.ensureDB();
    // No-op for now
  }

  async getCardsForDeck(deckId: string): Promise<Flashcard[]> {
    await this.ensureDB();
    return this.db.getAllFromIndex('cards', 'by-deck', deckId);
  }

  async getDueCards(deckId: string, userId: string, maxNewCards: number = 20): Promise<Flashcard[]> {
    await this.ensureDB();
    console.log('Getting due cards for deck:', deckId, 'user:', userId);
    
    // Use a transaction to ensure consistency
    const tx = this.db.transaction(['cards', 'progress'], 'readwrite');
    try {
      const cards = await tx.objectStore('cards').index('by-deck').getAll(deckId);
      const progress = await tx.objectStore('progress').index('by-user').getAll(userId);
      
      console.log('Found total cards:', cards.length);
      console.log('Found progress records:', progress.length);

      const now = new Date().toISOString();
      const dueCards = [];
      const newCards = [];
      const cardsWithProgress = new Set(progress.map(p => p.card_id));

      // Separate cards into due and new
      for (const card of cards) {
        if (!cardsWithProgress.has(card.id)) {
          newCards.push(card);
        } else {
          const cardProgress = progress.find(p => p.card_id === card.id);
          if (cardProgress && cardProgress.next_review <= now) {
            dueCards.push(card);
          }
        }
      }

      console.log('Due cards:', dueCards.length);
      console.log('New cards available:', newCards.length);

      // For first-time study, initialize only maxNewCards
      if (dueCards.length === 0 && newCards.length > 0) {
        console.log('Initializing new cards for study');
        
        // Take new cards up to maxNewCards, sorted by sort_order
        const selectedNewCards = newCards
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .slice(0, maxNewCards);

        console.log('Selected new cards for initialization:', selectedNewCards.length);

        // Initialize progress for selected new cards in a single transaction
        const progressTx = this.db.transaction('progress', 'readwrite');
        try {
          await Promise.all(selectedNewCards.map(card => 
            progressTx.store.put({
              difficulty: 7.2102,
              stability: 0,
              retrievability: 0,
              reps: 0,
              lapses: 0,
              interval: 0,
              user_id: userId,
              card_id: card.id,
              next_review: new Date().toISOString(),
              review_date: new Date().toISOString()
            })
          ));
          await progressTx.done;
        } catch (error) {
          console.error('Failed to initialize progress:', error);
          throw error;
        }

        return selectedNewCards;
      }

      // For subsequent study sessions, add new cards if we have space
      const remainingSlots = Math.max(0, maxNewCards - dueCards.length);
      let additionalNewCards: Flashcard[] = [];
      
      if (remainingSlots > 0 && newCards.length > 0) {
        console.log(`Adding ${remainingSlots} new cards to study session`);
        additionalNewCards = newCards
          .filter(card => !cardsWithProgress.has(card.id))
          .sort(() => Math.random() - 0.5)
          .slice(0, remainingSlots);

        // Initialize progress for additional new cards in a single transaction
        if (additionalNewCards.length > 0) {
          const progressTx = this.db.transaction('progress', 'readwrite');
          try {
            await Promise.all(additionalNewCards.map(card => 
              progressTx.store.put({
                difficulty: 7.2102,
                stability: 0,
                retrievability: 0,
                reps: 0,
                lapses: 0,
                interval: 0,
                user_id: userId,
                card_id: card.id,
                next_review: new Date().toISOString(),
                review_date: new Date().toISOString()
              })
            ));
            await progressTx.done;
          } catch (error) {
            console.error('Failed to initialize progress:', error);
            throw error;
          }
        }
      }

      // Combine and sort by sort_order
      const allDueCards = [...dueCards, ...additionalNewCards]
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      console.log('Returning cards for study:', allDueCards.length);
      await tx.done;
      return allDueCards;
    } catch (error) {
      console.error('Failed to get due cards:', error);
      throw error;
    }
  }

  async getCardProgress(cardId: string, userId: string): Promise<FSRSOutput | null> {
    await this.ensureDB();
    return this.db.get('progress', [userId, cardId]);
  }

  async updateCardProgress(cardId: string, userId: string, fsrsData: FSRSOutput): Promise<void> {
    await this.ensureDB();
    const now = new Date().toISOString();
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + fsrsData.interval);

    await this.db.put('progress', {
      ...fsrsData,
      user_id: userId,
      card_id: cardId,
      next_review: nextReview.toISOString(),
      review_date: now
    });
  }

  async getUserStreak(userId: string): Promise<number> {
    await this.ensureDB();
    const progress = await this.db.getAllFromIndex('progress', 'by-user', userId);
    
    // Group by date and count consecutive days
    const dates = new Set(
      progress.map(p => p.review_date.split('T')[0])
    );

    let streak = 0;
    const today = new Date();
    let currentDate = new Date(today);
    currentDate.setHours(0, 0, 0, 0);

    while (dates.has(currentDate.toISOString().split('T')[0])) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }

  async getDueCardCounts(userId: string): Promise<{ [deckId: string]: number }> {
    await this.ensureDB();
    const now = new Date().toISOString();
    const tx = this.db.transaction(['progress', 'cards'], 'readonly');
    
    const progress = await tx.objectStore('progress')
      .index('by-user')
      .getAll(userId);
    
    const dueProgress = progress.filter(p => p.next_review <= now);
    const cardIds = dueProgress.map(p => p.card_id);
    
    const counts: { [deckId: string]: number } = {};
    for (const cardId of cardIds) {
      const card = await tx.objectStore('cards').get(cardId);
      if (card) {
        counts[card.deck_id] = (counts[card.deck_id] || 0) + 1;
      }
    }

    return counts;
  }

  async storeDeck(deck: Deck): Promise<void> {
    await this.ensureDB();
    await this.db.put('decks', deck);
    
    // Verify the deck was stored
    const stored = await this.db.get('decks', deck.id);
    console.log('Stored deck verified:', stored ? 'success' : 'failed');
  }

  async storeCard(card: Flashcard): Promise<void> {
    await this.ensureDB();
    await this.db.put('cards', card);
    
    // Verify the card was stored
    const stored = await this.db.get('cards', card.id);
    console.log('Stored card verified:', stored ? 'success' : 'failed');
  }

  async getDeckByStreamId(streamId: string): Promise<Deck | null> {
    await this.ensureDB();
    return this.db.getFromIndex('decks', 'by-stream-id', streamId);
  }

  async sync(): Promise<void> {
    // No-op - sync will be handled explicitly
  }

  async clearProgress(deckId: string): Promise<void> {
    await this.ensureDB();
    const cards = await this.getCardsForDeck(deckId);
    const tx = this.db.transaction('progress', 'readwrite');
    for (const card of cards) {
      await tx.store.delete([this.userId, card.id]);
    }
    await tx.done;
  }
} 