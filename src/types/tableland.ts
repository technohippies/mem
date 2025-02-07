import type { Deck } from './models';

export interface TablelandDeck {
  id: number;
  name: string;
  description: string | null;
  creator: string;
  price: number;
  category: string;
  language: string;
  img_cid: string | null;
}

export interface TablelandFlashcard {
  id: number;
  deck_id: number;
  front_text: string;
  back_text: string;
  sort_order: number;
  audio_tts_cid: string | null;
  back_image_cid: string | null;
  front_image_cid: string | null;
  front_language: string;
  back_language: string;
  notes: string | null;
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
  // Additional required fields with default values
  slug: deck.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  tags: '',
  is_admin: false,
  stream_id: deck.id.toString(),
  // Optional fields
  image_url: undefined,
  forked_from: undefined,
  last_sync: undefined
});

export const tablelandToAppFlashcard = (card: TablelandFlashcard) => {
  // Ensure we have valid IDs
  const id = Number.isInteger(card.id) ? card.id.toString() : 'invalid-id';
  const deck_id = Number.isInteger(card.deck_id) ? card.deck_id.toString() : 'invalid-deck-id';

  return {
    id,
    deck_id,
    front: card.front_text,
    back: card.back_text,
    sort_order: Number.isInteger(card.sort_order) ? card.sort_order : 0,
    audio_tts_cid: card.audio_tts_cid || '',
    front_image_cid: card.front_image_cid || '',
    back_image_cid: card.back_image_cid || '',
    front_language: card.front_language || 'en',
    back_language: card.back_language || 'en',
    notes: card.notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    language: card.front_language || 'en'
  };
}; 