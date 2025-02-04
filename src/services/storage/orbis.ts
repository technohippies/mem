import type { Deck, Flashcard } from '@/types/models';
import type { FSRSOutput } from '../fsrs';
import type { StorageInterface } from './interface';
import { db, CONTEXT_ID, DECK_MODEL, FLASHCARD_MODEL, orbisToAppDeck, orbisToAppFlashcard, type OrbisDeck, type OrbisFlashcard } from '@/db/orbis';

export class OrbisStorage implements StorageInterface {
    async getDeckBySlug(slug: string): Promise<Deck | null> {
        console.log('Looking for deck with stream_id:', slug);
        const { rows } = await db
            .select()
            .from(DECK_MODEL)
            .where({ stream_id: slug })
            .context(CONTEXT_ID)
            .run();

        if (rows.length === 0) return null;
        return orbisToAppDeck(rows[0] as OrbisDeck);
    }

    async getAllDecks(): Promise<Deck[]> {
        const { rows } = await db
            .select()
            .from(DECK_MODEL)
            .where({ is_public: true })
            .context(CONTEXT_ID)
            .run();

        return rows.map(row => orbisToAppDeck(row as OrbisDeck));
    }

    async getAdminDecks(): Promise<Deck[]> {
        const { rows } = await db
            .select()
            .from(DECK_MODEL)
            .where({ 
                is_public: true,
                controller: import.meta.env.VITE_ORBIS_ENVIRONMENT_ID 
            })
            .context(CONTEXT_ID)
            .run();

        return rows.map(row => orbisToAppDeck(row as OrbisDeck));
    }

    async getUserDecks(userId: string): Promise<Deck[]> {
        const { rows } = await db
            .select()
            .from(DECK_MODEL)
            .where({ controller: userId })
            .context(CONTEXT_ID)
            .run();

        return rows.map(row => orbisToAppDeck(row as OrbisDeck));
    }

    async addDeckToUser(userId: string, deckId: string): Promise<void> {
        // In Orbis, this would be handled by the controller field
        // No need for a separate user_decks table
        return Promise.resolve();
    }

    async removeDeckFromUser(userId: string, deckId: string): Promise<void> {
        // In Orbis, deck ownership is handled by the controller field
        // No need for a separate user_decks table
        return Promise.resolve();
    }

    async getCardsForDeck(deckId: string): Promise<Flashcard[]> {
        console.log('Getting cards for deck:', deckId);
        const { rows } = await db
            .select()
            .from(FLASHCARD_MODEL)
            .where({ deck_id: deckId })
            .orderBy(['sort_order', 'asc'])
            .context(CONTEXT_ID)
            .run();

        return rows.map(row => orbisToAppFlashcard(row as OrbisFlashcard));
    }

    async getDueCards(deckId: string, userId: string, maxNewCards: number = 20): Promise<Flashcard[]> {
        // For now, we'll just return all cards for the deck
        // In a future version, we can store progress in a separate Orbis model
        const cards = await this.getCardsForDeck(deckId);
        return cards.slice(0, maxNewCards);
    }

    async updateCardProgress(cardId: string, userId: string, fsrsData: FSRSOutput): Promise<void> {
        // For now, we'll store progress in local storage
        // In a future version, we can create a separate Orbis model for progress
        const key = `progress:${userId}:${cardId}`;
        localStorage.setItem(key, JSON.stringify({
            ...fsrsData,
            next_review: new Date(Date.now() + fsrsData.interval * 24 * 60 * 60 * 1000).toISOString()
        }));
    }

    async getUserStreak(userId: string): Promise<number> {
        // For now, return 0 as we're not tracking streaks yet
        // In a future version, we can create a separate Orbis model for streaks
        return 0;
    }

    async getDueCardCounts(userId: string): Promise<{ [deckId: string]: number }> {
        // For now, return empty object as we're not tracking due cards yet
        // In a future version, we can calculate this from the progress model
        return {};
    }

    async sync(): Promise<void> {
        // No need to sync as Orbis handles this
        return Promise.resolve();
    }
} 