import type { Deck, Flashcard } from '@/types/models';
import type { FSRSOutput } from '../fsrs';

export interface StorageInterface {
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
  getDueCards(deckId: string, userId: string, maxNewCards?: number): Promise<Flashcard[]>;
  updateCardProgress(cardId: string, userId: string, fsrsData: FSRSOutput): Promise<void>;
  
  // User progress
  getUserStreak(userId: string): Promise<number>;
  getDueCardCounts(userId: string): Promise<{ [deckId: string]: number }>;
  
  // Sync operations
  sync(): Promise<void>;
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