import type { Deck, Flashcard } from '@/types/models';
import type { FSRSOutput } from '../fsrs';

export interface StorageInterface {
  readonly userId: string;
  readonly activeDeckId: string;

  // Deck operations
  getDeckBySlug(slug: string): Promise<Deck | null>;
  getDeckByStreamId(streamId: string): Promise<Deck | null>;
  getAllDecks(): Promise<Deck[]>;
  getAdminDecks(): Promise<Deck[]>;
  getUserDecks(userId: string): Promise<Deck[]>;
  addDeckToUser(userId: string, deckId: string): Promise<void>;
  removeDeckFromUser(userId: string, deckId: string): Promise<void>;
  
  // Card operations
  getCardsForDeck(deckId: string): Promise<Flashcard[]>;
  getCardsStudiedToday(deckId: string): Promise<string[]>;
  hasStudiedToday(deckId: string): Promise<boolean>;
  getDueCards(deckId: string, userId: string, limit: number): Promise<Flashcard[]>;
  getCardProgress(cardId: string, userId: string): Promise<FSRSOutput | null>;
  updateCardProgress(cardId: string, userId: string, progress: FSRSOutput & { review_date: string }): Promise<void>;
  storeDeck(deck: Deck): Promise<void>;
  storeCard(card: Flashcard): Promise<void>;
  
  // User progress
  getUserStreak(userId: string): Promise<number>;
  getDueCardCounts(userId: string): Promise<{ [deckId: string]: number }>;
  
  // Sync operations
  sync(): Promise<void>;
  clearProgress(deckId: string): Promise<void>;
  getAllDueCards(deckId: string, userId: string): Promise<Flashcard[]>;
}

// This will be used to get the current storage implementation
let currentStorage: StorageInterface;

export function setStorageImplementation(storage: StorageInterface) {
  currentStorage = storage;
}

export function getStorage(): StorageInterface {
  if (!currentStorage) {
    throw new Error('Storage implementation not set');
  }
  return currentStorage;
} 