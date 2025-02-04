import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button/Button';
import { db, CONTEXT_ID, DECK_MODEL, orbisToAppDeck, type OrbisDeck } from '@/db/orbis';
import type { Deck } from '@/types/models';

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

export const HomePage = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDecks = async () => {
      try {
        const availableDecks = await getAvailableDecks();
        setDecks(availableDecks);
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
        <p>Loading decks...</p>
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

  if (decks.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-4">
        <h1 className="text-2xl font-bold">Welcome to Anki Farcaster!</h1>
        <p className="text-gray-600">
          Get started by adding some decks to study. Here are some recommended decks:
        </p>
        {/* TODO: Show featured/recommended decks here */}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-2xl font-bold">Your Study Decks</h1>
      <div className="flex flex-col gap-2">
        {decks.map((deck) => (
          <Link 
            key={deck.id} 
            to={`/decks/${deck.id}`}
            className="w-full"
          >
            <Button 
              variant="outline" 
              className="w-full justify-start p-4 h-auto flex gap-4 items-start"
            >
              {deck.image_hash && (
                <img 
                  src={deck.image_hash} 
                  alt={deck.name}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex flex-col gap-2 text-left">
                <span className="font-semibold">{deck.name}</span>
                {deck.description && (
                  <span className="text-sm text-gray-600">{deck.description}</span>
                )}
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 text-xs bg-gray-100 rounded-full">
                    {deck.category}
                  </span>
                  <span className="px-2 py-1 text-xs bg-gray-100 rounded-full">
                    {deck.language}
                  </span>
                  {deck.price > 0 && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                      ${deck.price}
                    </span>
                  )}
                </div>
              </div>
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}; 