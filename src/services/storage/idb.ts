import type { Deck, Flashcard } from '@/types/models';
import type { FSRSOutput } from '@/services/fsrs';

// Database schema types
interface CardProgress {
  user_id: string;
  card_id: string;
  correct_reps: number;
  last_interval: number;
  retrievability: number;
  review_date: string;
}

interface StudySession {
  id: string; // Format: `${userId}-${deckId}-${date}`
  user_id: string;
  deck_id: string;
  date: string;
  cards_studied: string[]; // Array of card IDs studied today
  last_studied_index: number; // Index to resume from
}

interface AuthState {
  id: string;
  address: string;
  timestamp: number;
}

// Database structure
interface DBSchema {
  decks: {
    key: string; // stream_id
    value: {
      stream_id: string;
      controller: string;
      name: string;
      price: number;
      category: string;
      language: string;
      image_cid: string;
      is_public: boolean;
      description: string;
      forked_from: string;
    };
  };
  cards: {
    key: string; // stream_id
    value: {
      stream_id: string;
      controller: string;
      deck_id: string;
      language: string;
      back_text: string;
      front_text: string;
      sort_order: number;
      audio_tts_cid: string;
      back_image_cid: string;
      front_image_cid: string;
    };
  };
  progress: {
    key: string; // `${user_id}-${card_id}`
    value: CardProgress;
  };
  study_sessions: {
    key: string; // `${user_id}-${deck_id}-${date}`
    value: StudySession;
  };
  auth_state: {
    key: string;
    value: AuthState;
  };
}

// Storage interface that matches our previous SQL interface
export class IDBStorage {
  private static instance: IDBStorage | null = null;
  private db: IDBDatabase | null = null;

  private constructor() {}

  static async getInstance(): Promise<IDBStorage> {
    if (!this.instance) {
      const instance = new IDBStorage();
      await instance.init();
      this.instance = instance;
    }
    return this.instance;
  }

  private getSessionId(userId: string, deckId: string, date: string): string {
    return `${userId}-${deckId}-${date}`;
  }

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private async init() {
    return new Promise<void>((resolve, reject) => {
      console.log('[IDBStorage] Initializing database...');
      const request = indexedDB.open('anki-farcaster', 1);

      request.onerror = () => {
        console.error('[IDBStorage] Failed to open IndexedDB:', request.error);
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        console.log('[IDBStorage] Database opened successfully');
        this.db = request.result;
        
        // Log available object stores
        console.log('[IDBStorage] Available stores:', Array.from(this.db.objectStoreNames));
        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log('[IDBStorage] Database upgrade needed');
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores with indexes
        if (!db.objectStoreNames.contains('decks')) {
          console.log('[IDBStorage] Creating decks store');
          const decks = db.createObjectStore('decks', { keyPath: 'stream_id' });
          decks.createIndex('controller', 'controller', { unique: false });
          decks.createIndex('category', 'category', { unique: false });
          decks.createIndex('language', 'language', { unique: false });
        }

        if (!db.objectStoreNames.contains('cards')) {
          console.log('[IDBStorage] Creating cards store');
          const cards = db.createObjectStore('cards', { keyPath: 'stream_id' });
          cards.createIndex('deck_id', 'deck_id', { unique: false });
          cards.createIndex('sort_order', 'sort_order', { unique: false });
        }

        if (!db.objectStoreNames.contains('progress')) {
          console.log('[IDBStorage] Creating progress store');
          const progress = db.createObjectStore('progress', { keyPath: ['user_id', 'card_id'] });
          progress.createIndex('user_id', 'user_id', { unique: false });
          progress.createIndex('card_id', 'card_id', { unique: false });
          progress.createIndex('review_date', 'review_date', { unique: false });
        }

        if (!db.objectStoreNames.contains('study_sessions')) {
          console.log('[IDBStorage] Creating study_sessions store');
          const studySessions = db.createObjectStore('study_sessions', { keyPath: 'id' });
          studySessions.createIndex('user_id', 'user_id', { unique: false });
          studySessions.createIndex('deck_id', 'deck_id', { unique: false });
          studySessions.createIndex('date', 'date', { unique: false });
        }

        if (!db.objectStoreNames.contains('auth_state')) {
          console.log('[IDBStorage] Creating auth_state store');
          const authState = db.createObjectStore('auth_state', { keyPath: 'id' });
          authState.createIndex('address', 'address', { unique: false });
          authState.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Core deck operations
  async getDeckBySlug(slug: string): Promise<Deck | null> {
    // TODO: Implement this
    return null;
  }

  async getDeckByStreamId(streamId: string): Promise<Deck | null> {
    // TODO: Implement this
    return null;
  }

  async getAllDecks(): Promise<Deck[]> {
    if (!this.db) throw new Error('Database not initialized');
    console.log('[IDBStorage] Getting all decks...');
    console.log('[IDBStorage] Available stores:', Array.from(this.db.objectStoreNames));

    return new Promise((resolve, reject) => {
      try {
        console.log('[IDBStorage] Creating transaction...');
        const transaction = this.db!.transaction('decks', 'readonly');
        
        transaction.onerror = (event) => {
          console.error('[IDBStorage] Transaction error:', event);
        };

        transaction.oncomplete = () => {
          console.log('[IDBStorage] Transaction completed');
        };

        console.log('[IDBStorage] Getting store...');
        const store = transaction.objectStore('decks');
        console.log('[IDBStorage] Store accessed:', store.name);
        console.log('[IDBStorage] Store indexes:', Array.from(store.indexNames));

        console.log('[IDBStorage] Requesting all decks...');
        const request = store.getAll();

        request.onerror = () => {
          console.error('[IDBStorage] Failed to get decks from IndexedDB:', request.error);
          reject(new Error('Failed to get decks'));
        };

        request.onsuccess = () => {
          console.log('[IDBStorage] Raw decks from IndexedDB:', request.result);
          const decks = request.result.map(deck => {
            console.log('[IDBStorage] Processing deck:', deck);
            return {
              id: deck.stream_id,
              name: deck.name,
              description: deck.description,
              category: deck.category,
              language: deck.language,
              price: deck.price,
              image_hash: deck.image_cid,
              is_public: deck.is_public,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              forked_from: deck.forked_from,
              slug: deck.stream_id,
              tags: '',
              is_admin: false,
              stream_id: deck.stream_id
            } as Deck;
          });
          console.log('[IDBStorage] Processed decks:', decks);
          resolve(decks);
        };
      } catch (error) {
        console.error('[IDBStorage] Error in getAllDecks:', error);
        reject(error);
      }
    });
  }

  async getAdminDecks(): Promise<Deck[]> {
    // TODO: Implement this
    return [];
  }

  async getUserDecks(userId: string): Promise<Deck[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['study_sessions', 'decks'], 'readonly');
      const sessionsStore = transaction.objectStore('study_sessions');
      const decksStore = transaction.objectStore('decks');
      const sessionsIndex = sessionsStore.index('user_id');
      
      const request = sessionsIndex.getAll(userId);

      request.onerror = () => {
        reject(new Error('Failed to get user study sessions'));
      };

      request.onsuccess = async () => {
        const sessions = request.result;
        const uniqueDeckIds = [...new Set(sessions.map(s => s.deck_id))];
        
        // Fetch all unique decks
        const deckPromises = uniqueDeckIds.map(deckId => 
          new Promise<Deck>((resolve, reject) => {
            const deckRequest = decksStore.get(deckId);
            deckRequest.onerror = () => reject(new Error(`Failed to get deck ${deckId}`));
            deckRequest.onsuccess = () => {
              const deck = deckRequest.result;
              if (deck) {
                resolve({
                  id: deck.stream_id,
                  name: deck.name,
                  description: deck.description,
                  category: deck.category,
                  language: deck.language,
                  price: deck.price,
                  image_hash: deck.image_cid,
                  is_public: deck.is_public,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  forked_from: deck.forked_from
                });
              } else {
                reject(new Error(`Deck ${deckId} not found`));
              }
            };
          }).catch(err => {
            console.error(`Error fetching deck ${deckId}:`, err);
            return null;
          })
        );

        const decks = await Promise.all(deckPromises);
        resolve(decks.filter((d): d is Deck => d !== null));
      };
    });
  }

  // Card operations
  async getCardsForDeck(deckId: string): Promise<Flashcard[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('cards', 'readonly');
      const store = transaction.objectStore('cards');
      const index = store.index('deck_id');
      const request = index.getAll(deckId);

      request.onerror = () => {
        reject(new Error('Failed to get cards'));
      };

      request.onsuccess = () => {
        const cards = request.result.map(card => ({
          id: card.stream_id,
          deck_id: card.deck_id,
          front: card.front_text,
          back: card.back_text,
          front_image_cid: card.front_image_cid,
          back_image_cid: card.back_image_cid,
          audio_tts_cid: card.audio_tts_cid,
          sort_order: card.sort_order,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          language: card.language || 'en'
        } as Flashcard));
        resolve(cards);
      };
    });
  }

  async getCardsStudiedToday(userId: string, deckId: string): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    const sessionId = this.getSessionId(userId, deckId, this.getTodayString());

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('study_sessions', 'readonly');
      const store = transaction.objectStore('study_sessions');
      const request = store.get(sessionId);

      request.onerror = () => {
        reject(new Error('Failed to get study session'));
      };

      request.onsuccess = () => {
        const session = request.result;
        resolve(session?.cards_studied || []);
      };
    });
  }

  async hasStudiedToday(userId: string, deckId: string): Promise<boolean> {
    const studiedCards = await this.getCardsStudiedToday(userId, deckId);
    return studiedCards.length > 0;
  }

  async getDueCards(deckId: string, userId: string, limit: number): Promise<Flashcard[]> {
    if (!this.db) throw new Error('Database not initialized');

    // Get all cards for the deck
    const allCards = await this.getCardsForDeck(deckId);
    
    // Get cards studied today
    const studiedToday = await this.getCardsStudiedToday(userId, deckId);
    console.log('Cards studied today:', studiedToday);
    
    // Get all progress records for this user's cards
    const progressPromises = allCards.map(card => this.getCardProgress(card.id, userId));
    const progressRecords = await Promise.all(progressPromises);
    
    // Create a map of card progress
    const progressMap = new Map(
      progressRecords
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map(p => [p.card_id, p])
    );

    // Filter cards into new and review cards
    const { newCards, reviewCards } = allCards.reduce<{
      newCards: Flashcard[];
      reviewCards: Flashcard[];
    }>(
      (acc, card) => {
        // Skip cards studied today
        if (studiedToday.includes(card.id)) {
          console.log('Skipping card (studied today):', card.id);
          return acc;
        }

        const progress = progressMap.get(card.id);
        if (!progress) {
          // Card has never been studied
          console.log('New card:', card.id);
          acc.newCards.push(card);
        } else {
          // Card has been studied before
          console.log('Review card:', card.id);
          acc.reviewCards.push(card);
        }
        return acc;
      },
      { newCards: [], reviewCards: [] }
    );

    console.log('New cards available:', newCards.length);
    console.log('Review cards available:', reviewCards.length);

    // Sort new cards by sort_order
    newCards.sort((a, b) => a.sort_order - b.sort_order);

    // Take only the requested number of new cards
    const selectedNewCards = newCards.slice(0, limit);
    console.log('Selected new cards:', selectedNewCards.length);

    // Combine with review cards
    const dueCards = [...selectedNewCards, ...reviewCards];
    console.log('Total due cards:', dueCards.length);

    return dueCards;
  }

  async getAllDueCards(deckId: string, userId: string): Promise<Flashcard[]> {
    if (!this.db) throw new Error('Database not initialized');

    // For extra study, return all cards that have been studied today
    const studiedToday = await this.getCardsStudiedToday(userId, deckId);
    if (studiedToday.length === 0) return [];

    const allCards = await this.getCardsForDeck(deckId);
    return allCards.filter(card => studiedToday.includes(card.id));
  }

  // Progress tracking
  async getCardProgress(cardId: string, userId: string): Promise<FSRSOutput & { card_id: string } | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('progress', 'readonly');
      const store = transaction.objectStore('progress');
      const request = store.get([userId, cardId]);

      request.onerror = () => {
        reject(new Error('Failed to get card progress'));
      };

      request.onsuccess = () => {
        const progress = request.result;
        if (!progress) {
          resolve(null);
          return;
        }

        resolve({
          ...progress,
          card_id: cardId
        });
      };
    });
  }

  async updateCardProgress(
    cardId: string, 
    userId: string, 
    deckId: string,
    progress: FSRSOutput & { review_date: string }
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['progress', 'study_sessions'], 'readwrite');
      const progressStore = transaction.objectStore('progress');
      const sessionStore = transaction.objectStore('study_sessions');

      // Update progress
      const progressData = {
        user_id: userId,
        card_id: cardId,
        ...progress
      };

      const progressRequest = progressStore.put(progressData);

      progressRequest.onerror = () => {
        reject(new Error('Failed to update card progress'));
      };

      // Update study session
      const today = this.getTodayString();
      const sessionId = this.getSessionId(userId, deckId, today);

      const sessionRequest = sessionStore.get(sessionId);

      sessionRequest.onerror = () => {
        reject(new Error('Failed to get study session'));
      };

      sessionRequest.onsuccess = () => {
        const session = sessionRequest.result || {
          id: sessionId,
          user_id: userId,
          deck_id: deckId,
          date: today,
          cards_studied: [],
          last_studied_index: 0
        };

        if (!session.cards_studied.includes(cardId)) {
          session.cards_studied.push(cardId);
          console.log('Added card to studied list:', cardId);
          console.log('Updated study session:', session);
        }

        const updateRequest = sessionStore.put(session);

        updateRequest.onerror = () => {
          reject(new Error('Failed to update study session'));
        };

        updateRequest.onsuccess = () => {
          resolve();
        };
      };
    });
  }

  async getLastStudiedIndex(userId: string, deckId: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const sessionId = this.getSessionId(userId, deckId, this.getTodayString());

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('study_sessions', 'readonly');
      const store = transaction.objectStore('study_sessions');
      const request = store.get(sessionId);

      request.onerror = () => {
        reject(new Error('Failed to get study session'));
      };

      request.onsuccess = () => {
        const session = request.result;
        resolve(session?.last_studied_index || 0);
      };
    });
  }

  async setLastStudiedIndex(userId: string, deckId: string, index: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const sessionId = this.getSessionId(userId, deckId, this.getTodayString());

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('study_sessions', 'readwrite');
      const store = transaction.objectStore('study_sessions');
      const request = store.get(sessionId);

      request.onerror = () => {
        reject(new Error('Failed to get study session'));
      };

      request.onsuccess = () => {
        const session = request.result || {
          id: sessionId,
          user_id: userId,
          deck_id: deckId,
          date: this.getTodayString(),
          cards_studied: [],
          last_studied_index: 0
        };

        session.last_studied_index = index;
        console.log('Updating last studied index:', index);

        const updateRequest = store.put(session);

        updateRequest.onerror = () => {
          reject(new Error('Failed to update study session'));
        };

        updateRequest.onsuccess = () => {
          resolve();
        };
      };
    });
  }

  // Storage operations
  async storeDeck(deck: Deck): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log('[IDBStorage] Storing deck in IndexedDB:', deck);
    console.log('[IDBStorage] Available stores:', Array.from(this.db.objectStoreNames));

    return new Promise((resolve, reject) => {
      try {
        console.log('[IDBStorage] Creating transaction...');
        const transaction = this.db!.transaction('decks', 'readwrite');
        
        transaction.onerror = (event) => {
          console.error('[IDBStorage] Transaction error:', event);
        };

        transaction.oncomplete = () => {
          console.log('[IDBStorage] Transaction completed');
        };

        console.log('[IDBStorage] Getting store...');
        const store = transaction.objectStore('decks');
        console.log('[IDBStorage] Store accessed:', store.name);

        const deckData = {
          stream_id: deck.id,
          controller: '',
          name: deck.name,
          description: deck.description || '',
          category: deck.category,
          language: deck.language,
          price: deck.price,
          image_cid: deck.image_hash || '',
          is_public: deck.is_public,
          forked_from: deck.forked_from || ''
        };

        console.log('[IDBStorage] Deck data to store:', deckData);
        const request = store.put(deckData);

        request.onerror = () => {
          console.error('[IDBStorage] Failed to store deck:', request.error);
          reject(new Error('Failed to store deck'));
        };

        request.onsuccess = () => {
          console.log('[IDBStorage] Successfully stored deck:', deck.id);
          resolve();
        };
      } catch (error) {
        console.error('[IDBStorage] Error in storeDeck:', error);
        reject(error);
      }
    });
  }

  async storeCard(card: Flashcard): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('cards', 'readwrite');
      const store = transaction.objectStore('cards');

      const cardData = {
        stream_id: card.id,
        controller: '', // Not needed for offline storage
        deck_id: card.deck_id,
        language: card.language,
        front_text: card.front,
        back_text: card.back,
        sort_order: card.sort_order,
        audio_tts_cid: card.audio_tts_cid || '',
        back_image_cid: card.back_image_cid || '',
        front_image_cid: card.front_image_cid || ''
      };

      const request = store.put(cardData);

      request.onerror = () => {
        reject(new Error('Failed to store card'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  // Auth state
  async getAuthState(key: string): Promise<{ address: string; timestamp: number } | null> {
    // TODO: Implement this
    return null;
  }

  async setAuthState(key: string, address: string, timestamp: number): Promise<void> {
    // TODO: Implement this
  }

  async clearAuthState(key: string): Promise<void> {
    // TODO: Implement this
  }

  // User stats
  async getUserStreak(userId: string): Promise<number> {
    // TODO: Implement this
    return 0;
  }

  async getDueCardCounts(userId: string): Promise<{ [deckId: string]: number }> {
    // TODO: Implement this
    return {};
  }

  // Progress management
  async clearProgress(deckId: string): Promise<void> {
    // TODO: Implement this
  }
} 