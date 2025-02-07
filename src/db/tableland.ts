import { Database } from '@tableland/sdk';
import type { TablelandDeck, TablelandFlashcard } from '@/types/tableland';

// Table names - these are unique to your deployment
export const DECKS_TABLE = 'decks_84532_92';
export const FLASHCARDS_TABLE = 'flashcards_84532_93';

export class TablelandClient {
  private db: Database;

  constructor() {
    // Initialize in read-only mode - no signer needed
    this.db = new Database();
  }

  async getDeck(id: number): Promise<TablelandDeck | null> {
    const { results } = await this.db
      .prepare(`SELECT * FROM ${DECKS_TABLE} WHERE id = ?`)
      .bind(id)
      .all();
    
    const deck = results[0];
    if (!deck) return null;

    return {
      id: Number(deck.id),
      name: String(deck.name),
      description: deck.description ? String(deck.description) : null,
      creator: String(deck.creator),
      price: Number(deck.price),
      category: String(deck.category),
      language: String(deck.language),
      img_cid: deck.img_cid ? String(deck.img_cid) : null
    };
  }

  async getFlashcards(deckId: number): Promise<TablelandFlashcard[]> {
    const { results } = await this.db
      .prepare(`SELECT * FROM ${FLASHCARDS_TABLE} WHERE deck_id = ? ORDER BY sort_order ASC`)
      .bind(deckId)
      .all();
    
    return results.map(card => ({
      id: Number(card.id),
      deck_id: Number(card.deck_id),
      front_text: String(card.front_text),
      back_text: String(card.back_text),
      sort_order: Number(card.sort_order),
      audio_tts_cid: card.audio_tts_cid ? String(card.audio_tts_cid) : null,
      back_image_cid: card.back_image_cid ? String(card.back_image_cid) : null,
      front_image_cid: card.front_image_cid ? String(card.front_image_cid) : null,
      front_language: String(card.front_language),
      back_language: String(card.back_language),
      notes: card.notes ? String(card.notes) : null
    }));
  }

  async getPublicDecks(): Promise<TablelandDeck[]> {
    const { results } = await this.db
      .prepare(`SELECT * FROM ${DECKS_TABLE} WHERE price = 0`)
      .all();
    
    return results.map(deck => ({
      id: Number(deck.id),
      name: String(deck.name),
      description: deck.description ? String(deck.description) : null,
      creator: String(deck.creator),
      price: Number(deck.price),
      category: String(deck.category),
      language: String(deck.language),
      img_cid: deck.img_cid ? String(deck.img_cid) : null
    }));
  }

  async getDecksByCreator(creator: string): Promise<TablelandDeck[]> {
    const { results } = await this.db
      .prepare(`SELECT * FROM ${DECKS_TABLE} WHERE creator = ?`)
      .bind(creator)
      .all();
    
    return results.map(deck => ({
      id: Number(deck.id),
      name: String(deck.name),
      description: deck.description ? String(deck.description) : null,
      creator: String(deck.creator),
      price: Number(deck.price),
      category: String(deck.category),
      language: String(deck.language),
      img_cid: deck.img_cid ? String(deck.img_cid) : null
    }));
  }
} 