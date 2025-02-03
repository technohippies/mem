// User types
export interface User {
  id: string;          // Farcaster FID or Silk address
  authMethod: 'farcaster' | 'silk';
  displayName?: string;
  createdAt: Date;
  lastStudied?: Date;
  currentStreak: number;
  longestStreak: number;
}

// Deck types
export interface Deck {
  id: string;
  name: string;
  description: string;
  creator: User;
  isPublic: boolean;
  tags: string[];
  price?: string;      // For premium decks
  cardCount: number;
  createdAt: Date;
  updatedAt: Date;
  encrypted?: boolean; // Whether deck is encrypted with Lit
}

// Flashcard types
export interface FlashCard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  // FSRS algorithm data
  difficulty: number;
  stability: number;
  retrievability: number;
  lastReviewed?: Date;
  nextReview?: Date;
  createdAt: Date;
  updatedAt: Date;
  encrypted?: boolean;
}

// Study session types
export interface StudySession {
  id: string;
  userId: string;
  deckId: string;
  date: Date;
  cardsStudied: number;
  duration: number;   // in seconds
  performance: number; // average score/performance
}

// Study states
export type StudyState = 'front' | 'back' | 'rating';

// Card rating based on FSRS
export type CardRating = 1 | 2 | 3 | 4; 