import { dbAll, dbGet, dbRun } from '@/db';
import type { Deck, Flashcard } from '@/types/models';
import type { FSRSOutput } from '../fsrs';
import type { StorageInterface } from './interface';

export class SQLiteStorage implements StorageInterface {
  async getDeckBySlug(slug: string): Promise<Deck | null> {
    const result = await dbGet<Deck>('SELECT * FROM decks WHERE slug = ?', [slug]);
    return result || null;
  }

  async getAllDecks(): Promise<Deck[]> {
    return dbAll<Deck>('SELECT * FROM decks ORDER BY created_at DESC');
  }

  async getAdminDecks(): Promise<Deck[]> {
    return dbAll<Deck>('SELECT * FROM decks WHERE is_admin = 1 ORDER BY created_at DESC');
  }

  async getUserDecks(userId: string): Promise<Deck[]> {
    return dbAll<Deck>(`
      SELECT d.* FROM decks d
      JOIN user_decks ud ON d.id = ud.deck_id
      WHERE ud.user_id = ?
      ORDER BY d.created_at DESC
    `, [userId]);
  }

  async addDeckToUser(userId: string, deckId: string): Promise<void> {
    await dbRun(
      'INSERT INTO user_decks (user_id, deck_id) VALUES (?, ?)',
      [userId, deckId]
    );
  }

  async removeDeckFromUser(userId: string, deckId: string): Promise<void> {
    await dbRun(
      'DELETE FROM user_decks WHERE user_id = ? AND deck_id = ?',
      [userId, deckId]
    );
  }

  async getCardsForDeck(deckId: string): Promise<Flashcard[]> {
    return dbAll<Flashcard>(
      'SELECT * FROM flashcards WHERE deck_id = ? ORDER BY sort_order',
      [deckId]
    );
  }

  async getDueCards(deckId: string, userId: string, maxNewCards: number = 20): Promise<Flashcard[]> {
    // Get cards that are due for review
    const dueCards = await dbAll<Flashcard>(`
      SELECT f.* FROM flashcards f
      JOIN user_card_progress ucp ON f.id = ucp.card_id
      WHERE f.deck_id = ? 
      AND ucp.user_id = ?
      AND ucp.next_review <= datetime('now')
      ORDER BY ucp.next_review ASC
    `, [deckId, userId]);

    // Get new cards if we haven't reached the daily limit
    const newCards = await dbAll<Flashcard>(`
      SELECT f.* FROM flashcards f
      LEFT JOIN user_card_progress ucp ON f.id = ucp.card_id AND ucp.user_id = ?
      WHERE f.deck_id = ?
      AND ucp.card_id IS NULL
      ORDER BY f.sort_order
      LIMIT ?
    `, [userId, deckId, maxNewCards]);

    return [...dueCards, ...newCards];
  }

  async updateCardProgress(cardId: string, userId: string, fsrsData: FSRSOutput): Promise<void> {
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + fsrsData.interval);

    await dbRun(`
      INSERT OR REPLACE INTO user_card_progress (
        user_id, card_id, difficulty, stability, retrievability,
        reps, lapses, last_interval, next_review, review_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      userId,
      cardId,
      fsrsData.difficulty,
      fsrsData.stability,
      fsrsData.retrievability,
      fsrsData.reps,
      fsrsData.lapses,
      fsrsData.interval,
      nextReview.toISOString()
    ]);
  }

  async getUserStreak(userId: string): Promise<number> {
    const result = await dbGet<{ days: number }>(`
      SELECT COUNT(*) as days FROM (
        SELECT DATE(review_date) as day
        FROM user_card_progress
        WHERE user_id = ?
        GROUP BY DATE(review_date)
        ORDER BY day DESC
      ) days
      WHERE days.day >= DATE('now', '-30 days')
    `, [userId]);
    
    return result?.days || 0;
  }

  async getDueCardCounts(userId: string): Promise<{ [deckId: string]: number }> {
    interface CountResult {
      deck_id: string;
      count: number;
    }

    const counts = await dbAll<CountResult>(`
      SELECT f.deck_id, COUNT(*) as count
      FROM flashcards f
      JOIN user_card_progress ucp ON f.id = ucp.card_id
      WHERE ucp.user_id = ?
      AND ucp.next_review <= datetime('now')
      GROUP BY f.deck_id
    `, [userId]);

    return counts.reduce((acc: { [deckId: string]: number }, { deck_id, count }) => {
      acc[deck_id] = count;
      return acc;
    }, {});
  }

  async sync(): Promise<void> {
    // No-op for SQLite
    return Promise.resolve();
  }
} 