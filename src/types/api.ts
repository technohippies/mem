import type { User, Deck, FlashCard, StudySession } from './models';

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Auth responses
export interface AuthResponse {
  user: User;
  token: string;
}

// Deck responses
export interface DeckListResponse {
  decks: Deck[];
  totalCount: number;
  hasMore: boolean;
}

export interface DeckResponse {
  deck: Deck;
  cards: FlashCard[];
}

// Study responses
export interface StudySessionResponse {
  session: StudySession;
  nextCard?: FlashCard;
  progress: {
    cardsLeft: number;
    totalCards: number;
    correctCount: number;
  };
}

// API Request types
export interface CreateDeckRequest {
  name: string;
  description: string;
  isPublic: boolean;
  tags: string[];
  price?: string;
  encrypted?: boolean;
}

export interface UpdateDeckRequest extends Partial<CreateDeckRequest> {
  id: string;
}

export interface CreateCardRequest {
  deckId: string;
  front: string;
  back: string;
  encrypted?: boolean;
}

export interface UpdateCardRequest extends Partial<CreateCardRequest> {
  id: string;
}

export interface StudySessionRequest {
  deckId: string;
  cardId: string;
  rating: number;
  timeSpent: number; // Time spent on this card in seconds
} 