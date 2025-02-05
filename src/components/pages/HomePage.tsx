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

const DeckCard = ({ deck }: { deck: Deck }) => (
  <Link 
    key={deck.id} 
    to={`/decks/${deck.id}`}
    className="w-full"
  >
    <div className="w-full p-4 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-colors bg-neutral-900/50 hover:bg-neutral-900 flex gap-4 items-start">
      {deck.image_hash && (
        <img 
          src={deck.image_hash} 
          alt={deck.name}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
        />
      )}
      <div className="flex flex-col gap-2 text-left">
        <span className="font-semibold text-neutral-200">{deck.name}</span>
        {deck.description && (
          <span className="text-sm text-neutral-400">{deck.description}</span>
        )}
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
      </div>
    </div>
  </Link>
);

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
        <h2 className="text-2xl font-bold mb-4">Your Study Decks</h2>
        {userDecks.length === 0 ? (
          <p className="text-neutral-400">You haven't added any decks yet. Browse the available decks below to get started!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {userDecks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} />
            ))}
          </div>
        )}
      </section>

      {/* Available Decks */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Available Decks</h2>
        <div className="flex flex-col gap-2">
          {availableDecks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </div>
      </section>
    </div>
  );
}; 