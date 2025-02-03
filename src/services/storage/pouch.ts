import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import type { Deck, Flashcard } from '@/types/models';
import type { FSRSOutput } from '../fsrs';
import { initializeCard } from '../fsrs';
import type { StorageInterface } from './interface';

// Enable find plugin for querying
PouchDB.plugin(PouchDBFind);

interface PouchDoc {
  _id: string;
  _rev?: string;
  type: 'deck' | 'card' | 'progress' | 'user_deck';
  data: any;
}

interface PouchError extends Error {
  name: string;
  status?: number;
  message: string;
}

export class PouchStorage implements StorageInterface {
  private db: PouchDB.Database;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.db = new PouchDB(`anki_${userId}`);
    this.setupIndexes();
  }

  private async setupIndexes() {
    // Create indexes for efficient querying
    await this.db.createIndex({
      index: { fields: ['type', 'data.user_id', 'data.next_review'] }
    });
    await this.db.createIndex({
      index: { fields: ['type', 'data.deck_id'] }
    });
    await this.db.createIndex({
      index: { fields: ['type', 'data.deck_id', 'data.sort_order'] }
    });
  }

  // Helper to convert PouchDB doc to our model
  private docToModel<T>(doc: PouchDoc): T {
    return {
      id: doc._id.split(':')[1],
      ...doc.data
    } as T;
  }

  async getDeckBySlug(slug: string): Promise<Deck | null> {
    console.log('Looking for deck with slug:', slug);
    const result = await this.db.find({
      selector: {
        type: 'deck',
        'data.slug': slug
      }
    });
    console.log('Found deck results:', result.docs);

    return result.docs[0] ? this.docToModel<Deck>(result.docs[0] as PouchDoc) : null;
  }

  async getAllDecks(): Promise<Deck[]> {
    const result = await this.db.find({
      selector: {
        type: 'deck'
      }
    });

    return result.docs.map(doc => this.docToModel<Deck>(doc as PouchDoc));
  }

  async getAdminDecks(): Promise<Deck[]> {
    const result = await this.db.find({
      selector: {
        type: 'deck',
        'data.is_admin': true
      }
    });

    return result.docs.map(doc => this.docToModel<Deck>(doc as PouchDoc));
  }

  async getUserDecks(userId: string): Promise<Deck[]> {
    // First get all user_deck records
    const userDecks = await this.db.find({
      selector: {
        type: 'user_deck',
        'data.user_id': userId
      }
    });

    // Then get the actual decks
    const deckIds = userDecks.docs.map(doc => (doc as PouchDoc).data.deck_id);
    const result = await this.db.find({
      selector: {
        type: 'deck',
        '_id': { $in: deckIds.map(id => `deck:${id}`) }
      }
    });

    return result.docs.map(doc => this.docToModel<Deck>(doc as PouchDoc));
  }

  async addDeckToUser(userId: string, deckId: string): Promise<void> {
    const id = `user_deck:${userId}:${deckId}`;
    await this.db.put({
      _id: id,
      type: 'user_deck',
      data: {
        user_id: userId,
        deck_id: deckId,
        created_at: new Date().toISOString()
      }
    });
  }

  async removeDeckFromUser(userId: string, deckId: string): Promise<void> {
    const id = `user_deck:${userId}:${deckId}`;
    try {
      const doc = await this.db.get(id);
      await this.db.remove(doc);
    } catch (error) {
      const e = error as PouchError;
      if (e.name !== 'not_found') throw e;
    }
  }

  async getCardsForDeck(deckId: string): Promise<Flashcard[]> {
    console.log('Getting cards for deck:', deckId);
    const result = await this.db.find({
      selector: {
        type: 'card',
        'data.deck_id': deckId
      }
    });
    console.log('Found cards:', result.docs);

    const cards = result.docs.map(doc => this.docToModel<Flashcard>(doc as PouchDoc));
    // Sort in memory if needed
    return cards.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  async getDueCards(deckId: string, userId: string, maxNewCards: number = 20): Promise<Flashcard[]> {
    console.log('getDueCards called with:', { deckId, userId, maxNewCards });
    
    // Get cards that are due for review
    const now = new Date().toISOString();
    console.log('Checking for due cards before:', now);
    
    const dueProgress = await this.db.find({
      selector: {
        type: 'progress',
        'data.user_id': userId,
        'data.next_review': { $lte: now }
      }
    });
    console.log('Found due progress records:', dueProgress.docs.length);

    const dueCardIds = dueProgress.docs.map(doc => (doc as PouchDoc).data.card_id);
    console.log('Due card IDs:', dueCardIds);

    // Get cards that have progress records and are due
    const dueCards = await this.db.find({
      selector: {
        type: 'card',
        'data.deck_id': deckId,
        '_id': { $in: dueCardIds.map(id => `card:${id}`) }
      }
    });
    console.log('Found due cards:', dueCards.docs.length);

    // Get cards that have no progress records (new cards)
    const allProgress = await this.db.find({
      selector: {
        type: 'progress',
        'data.user_id': userId
      }
    });
    console.log('Found total progress records:', allProgress.docs.length);

    const studiedCardIds = allProgress.docs.map(doc => (doc as PouchDoc).data.card_id);
    console.log('Already studied card IDs:', studiedCardIds);

    // Get all cards for this deck
    const allCards = await this.db.find({
      selector: {
        type: 'card',
        'data.deck_id': deckId
      }
    });
    console.log('Total cards in deck:', allCards.docs.length, allCards.docs);

    // Filter to get new cards (those without progress records)
    const newCards = allCards.docs.filter(doc => 
      !studiedCardIds.includes(doc._id.split(':')[1])
    ).slice(0, maxNewCards);
    console.log('Found new cards:', newCards.length, newCards);

    // Initialize new cards with default FSRS weights
    console.log('Initializing new cards with default weights');
    for (const card of newCards) {
      const cardId = card._id.split(':')[1];
      console.log('Initializing card:', cardId);
      await this.updateCardProgress(cardId, userId, initializeCard());
    }

    const allDueCards = [...dueCards.docs, ...newCards].map(doc => this.docToModel<Flashcard>(doc as PouchDoc));
    console.log('Returning total cards:', allDueCards.length, allDueCards);
    return allDueCards;
  }

  async getCardProgress(cardId: string, userId: string): Promise<FSRSOutput | null> {
    const id = `progress:${userId}:${cardId}`;
    try {
      const doc = await this.db.get(id);
      return this.docToModel<FSRSOutput>(doc as PouchDoc);
    } catch (error) {
      const e = error as PouchError;
      if (e.name === 'not_found') return null;
      throw e;
    }
  }

  async updateCardProgress(cardId: string, userId: string, fsrsData: FSRSOutput): Promise<void> {
    const id = `progress:${userId}:${cardId}`;
    const now = new Date().toISOString();
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + fsrsData.interval);

    try {
      const existing = await this.db.get(id);
      await this.db.put({
        ...existing,
        type: 'progress',
        data: {
          user_id: userId,
          card_id: cardId,
          ...fsrsData,
          next_review: nextReview.toISOString(),
          review_date: now
        }
      });
    } catch (error) {
      const e = error as PouchError;
      if (e.name === 'not_found') {
        await this.db.put({
          _id: id,
          type: 'progress',
          data: {
            user_id: userId,
            card_id: cardId,
            ...fsrsData,
            next_review: nextReview.toISOString(),
            review_date: now
          }
        });
      } else {
        throw e;
      }
    }
  }

  async getUserStreak(userId: string): Promise<number> {
    const result = await this.db.find({
      selector: {
        type: 'progress',
        'data.user_id': userId
      }
    });

    // Group by date and count consecutive days
    const dates = new Set(
      result.docs.map(doc => 
        new Date((doc as PouchDoc).data.review_date).toISOString().split('T')[0]
      )
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
    const now = new Date().toISOString();
    const result = await this.db.find({
      selector: {
        type: 'progress',
        'data.user_id': userId,
        'data.next_review': { $lte: now }
      }
    });

    const cardIds = result.docs.map(doc => (doc as PouchDoc).data.card_id);
    const cards = await this.db.find({
      selector: {
        type: 'card',
        '_id': { $in: cardIds.map(id => `card:${id}`) }
      }
    });

    const counts: { [deckId: string]: number } = {};
    cards.docs.forEach(doc => {
      const deckId = (doc as PouchDoc).data.deck_id;
      counts[deckId] = (counts[deckId] || 0) + 1;
    });

    return counts;
  }

  async sync(): Promise<void> {
    // This would sync with a remote CouchDB/PouchDB server
    // For now, it's a no-op
    return Promise.resolve();
  }

  // Additional methods for PouchDB setup
  async importDeck(deck: Deck, cards: Flashcard[]): Promise<void> {
    const batch = [
      {
        _id: `deck:${deck.id}`,
        type: 'deck',
        data: deck
      },
      ...cards.map(card => ({
        _id: `card:${card.id}`,
        type: 'card',
        data: card
      }))
    ];

    await this.db.bulkDocs(batch);
  }

  async clearDatabase(): Promise<void> {
    await this.db.destroy();
    this.db = new PouchDB(`anki_${this.userId}`);
    await this.setupIndexes();
  }

  async storeDeck(deck: Deck): Promise<void> {
    await this.db.put({
      _id: `deck:${deck.id}`,
      type: 'deck',
      data: deck
    });
  }

  async storeCard(card: Flashcard): Promise<void> {
    console.log('Storing card in PouchDB:', card);
    const doc = {
      _id: `card:${card.id}`,
      type: 'card',
      data: card
    };
    console.log('Card document:', doc);
    await this.db.put(doc);
    console.log('Card stored successfully');
  }
} 