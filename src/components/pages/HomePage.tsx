import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button/Button';
import type { Deck } from '@/db';

// TODO: This will be replaced with Ceramic/Orbis integration
const getAvailableDecks = async (): Promise<Deck[]> => {
  console.log('Fetching decks from:', 'http://localhost:3001/api/decks');
  const response = await fetch('http://localhost:3001/api/decks');
  if (!response.ok) {
    console.error('Failed to fetch decks:', response.status, response.statusText);
    const text = await response.text();
    console.error('Response body:', text);
    throw new Error('Failed to fetch decks');
  }
  return response.json();
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
            to={`/decks/${deck.slug}`}
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
              <div className="flex flex-col gap-2">
                <span className="font-semibold">{deck.name}</span>
                {deck.description && (
                  <span className="text-sm text-gray-600">{deck.description}</span>
                )}
                {deck.tags && (
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(deck.tags).map((tag: string) => (
                      <span 
                        key={tag}
                        className="px-2 py-1 text-xs bg-gray-100 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}; 