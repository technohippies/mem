// User types
export interface User {
  id: string;
  fid: string; // Farcaster ID
  username: string;
  created_at: string;
  updated_at: string;
}

// Deck types
export interface Deck {
  id: string;
  name: string;
  description?: string;
  slug: string;
  image_hash?: string;
  image_url?: string;
  stream_id?: string;
  tags: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  category: string;
  language: string;
  price: number;
  is_public: boolean;
  forked_from?: string;
  last_sync?: string;
  creator: string; // Ethereum address of the deck creator
}

// Flashcard types
export interface Flashcard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  sort_order: number;
  audio_tts_cid: string | null;
  front_image_cid: string | null;
  back_image_cid: string | null;
  notes: string | null;
  front_language: string;
  back_language: string;
  // Encryption keys
  front_text_key: string | null;
  back_text_key: string | null;
  audio_tts_key: string | null;
  front_image_key: string | null;
  back_image_key: string | null;
  notes_key: string | null;
  created_at: string;
  updated_at: string;
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

export interface UserCardProgress {
  user_id: string;
  card_id: string;
  difficulty: number;
  stability: number;
  retrievability: number;
  reps: number;
  lapses: number;
  last_interval: number;
  next_review: string;
  review_date: string;
}

export interface UserDeck {
  user_id: string;
  deck_id: string;
  created_at: string;
} 