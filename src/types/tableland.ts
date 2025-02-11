import type { Deck } from './models';
import { Flashcard } from '@/types/models';

export interface TablelandDeck {
  id: string;
  name: string;
  description: string;
  creator: string;
  price: number;
  category: string;
  language: string;
  img_cid: string;
  flashcards_cid: string;
  encryption_key: string;
  access_conditions: string;
}

export interface TablelandFlashcard {
  id: number;
  deck_id: number;
  front_text: string | null;
  back_text: string | null;
  sort_order: number;
  audio_tts_cid: string | null;
  back_image_cid: string | null;
  front_image_cid: string | null;
  front_language: string;
  back_language: string;
  notes: string | null;
  // Encrypted fields
  front_text_encrypted: string | null;
  back_text_encrypted: string | null;
  notes_encrypted: string | null;
  // Encryption keys
  front_text_key: string | null;
  back_text_key: string | null;
  notes_key: string | null;
  // Encrypted media
  audio_tts_cid_encrypted: string | null;
  front_image_cid_encrypted: string | null;
  back_image_cid_encrypted: string | null;
  audio_tts_key: string | null;
  front_image_cid_key: string | null;
  back_image_cid_key: string | null;
}

// Mapping functions to convert between Tableland and App models
export const tablelandToAppDeck = (deck: TablelandDeck): Deck => ({
  id: deck.id.toString(),
  name: deck.name,
  description: deck.description || undefined,
  image_hash: deck.img_cid || undefined,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_public: deck.price === 0,
  category: deck.category,
  language: deck.language,
  price: deck.price,
  creator: deck.creator,
  // Additional required fields with default values
  slug: deck.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  tags: '',
  is_admin: false,
  stream_id: deck.flashcards_cid,
  // Optional fields
  image_url: undefined,
  forked_from: undefined,
  last_sync: undefined
});

export const tablelandToAppFlashcard = (card: any): Flashcard => {
  return {
    id: card.id.toString(),
    deck_id: card.deck_id.toString(),
    front: card.front || card.front_text || '',
    back: card.back || card.back_text || '',
    front_language: card.front_language || 'eng',
    back_language: card.back_language || 'eng',
    sort_order: card.sort_order || 0,
    audio_tts_cid: card.audio_tts_cid || card.audio_tts_cid_encrypted || null,
    front_image_cid: card.front_image_cid || card.front_image_cid_encrypted || null,
    back_image_cid: card.back_image_cid || card.back_image_cid_encrypted || null,
    notes: card.notes || card.notes_encrypted || null,
    // Store encryption keys if present
    front_text_key: card.front_text_key || null,
    back_text_key: card.back_text_key || null,
    audio_tts_key: card.audio_tts_key || null,
    front_image_key: card.front_image_cid_key || null,
    back_image_key: card.back_image_cid_key || null,
    notes_key: card.notes_key || null,
    // Add required timestamp fields
    created_at: card.created_at || new Date().toISOString(),
    updated_at: card.updated_at || new Date().toISOString(),
  };
}; 