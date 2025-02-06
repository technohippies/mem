import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button/Button';
import { db, CONTEXT_ID, DECK_MODEL, orbisToAppDeck, type OrbisDeck } from '@/db/orbis';
import type { Deck } from '@/types/models';
import { IDBStorage } from '@/services/storage/idb';
import { Loader } from '@/components/ui/loader/Loader';
import { Badge } from '@/components/ui/badge/Badge';
import { Tag, Translate } from '@phosphor-icons/react';

const getAvailableDecks = async (): Promise<Deck[]> => {
  console.log('Fetching decks from OrbisDB...');
  const { rows } = await db
    .select()
    .from(DECK_MODEL)
    .where({ is_public: true })
    .context(CONTEXT_ID)
    .run();

  console.log('Got decks from OrbisDB:', rows);
  return rows.map(row => orbisToAppDeck(row as OrbisDeck));
};

const DeckCard = ({ deck, compact = false }: { deck: Deck; compact?: boolean }) => {
  const [cardStats, setCardStats] = useState({
    newCount: 0,
    reviewCount: 0,
    dueCount: 0,
  });

  useEffect(() => {
    const loadCardStats = async () => {
      // Only load stats for user's decks (compact=true)
      if (!compact) return;
      
      try {
        const storage = await IDBStorage.getInstance();
        const cards = await storage.getCardsForDeck(deck.id);
        const cardProgressPromises = cards.map(card => storage.getCardProgress(card.id, 'user'));
        const cardProgresses = await Promise.all(cardProgressPromises);
        const studiedToday = await storage.getCardsStudiedToday('user', deck.id);
        
        const newCards = cards.filter((_, index) => !cardProgresses[index]);
        const reviewCards = cards.filter(card => 
          studiedToday.includes(card.id)
        );
        const dueCards = cards.filter((card, index) => {
          const progress = cardProgresses[index];
          const isStudiedToday = studiedToday.includes(card.id);
          return progress && !isStudiedToday && progress.review_date && new Date(progress.review_date) <= new Date();
        });

        setCardStats({
          newCount: newCards.length,
          reviewCount: reviewCards.length,
          dueCount: dueCards.length,
        });
      } catch (err) {
        console.error('Failed to load card stats:', err);
      }
    };

    loadCardStats();
  }, [deck.id, compact]);

  return (
    <Link 
      key={deck.id} 
      to={`/decks/${deck.id}`}
      className="w-full"
    >
      <div className="w-full p-4 rounded-lg bg-neutral-600/40 hover:bg-neutral-500/40 border border-neutral-600 hover:border-neutral-500 shadow-sm hover:shadow-md transition-all flex gap-4 items-start cursor-pointer">
        {deck.image_hash && (
          <img 
            src={deck.image_hash} 
            alt={deck.name}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 flex flex-col gap-2 text-left">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-neutral-200">{deck.name}</span>
            {compact && (
              <div className="flex gap-2 text-sm items-center">
                <span className="text-blue-400">{cardStats.newCount}</span>
                <span className="text-neutral-400">{cardStats.reviewCount}</span>
                <span className="text-red-400">{cardStats.dueCount}</span>
              </div>
            )}
          </div>
          {!compact && deck.description && (
            <span className="text-sm text-neutral-400">{deck.description}</span>
          )}
          {!compact && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <Tag weight="fill" size={14} />
                {deck.category}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Translate weight="fill" size={14} />
                {deck.language}
              </Badge>
              {deck.price > 0 && (
                <Badge variant="default" className="text-green-400">
                  ${deck.price}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export const HomePage = () => {
  const [userDecks, setUserDecks] = useState<Deck[]>([]);
  const [availableDecks, setAvailableDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDecks = async () => {
      try {
        // First, get all decks from IndexedDB (our source of truth)
        const storage = await IDBStorage.getInstance();
        const localDecks = await storage.getAllDecks();
        const localDeckMap = new Map(localDecks.map(deck => [deck.id, deck]));
        setUserDecks(localDecks);

        // Then get all available decks from Ceramic
        const ceramicDecks = await getAvailableDecks();
        
        // Filter out decks that exist in IndexedDB
        const newAvailableDecks = ceramicDecks.filter(deck => !localDeckMap.has(deck.id));
        setAvailableDecks(newAvailableDecks);

        console.log('Local decks:', localDecks.length);
        console.log('New available decks:', newAvailableDecks.length);
      } catch (err) {
        setError('Failed to load decks');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadDecks();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4">
      {/* User's Decks */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Your Decks</h2>
        {userDecks.length === 0 ? (
          <p className="text-neutral-400">You haven't added any decks yet. Browse the available decks below to get started!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {userDecks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} compact={true} />
            ))}
          </div>
        )}
      </section>

      {/* Available Decks */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Available Decks</h2>
        <div className="flex flex-col gap-2">
          {availableDecks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} compact={false} />
          ))}
        </div>
      </section>
    </div>
  );
}; 