import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button/Button';
import type { Deck, Flashcard } from '@/db';

// TODO: This will be replaced with Ceramic/Orbis integration
const getDeckBySlug = async (slug: string): Promise<Deck> => {
  console.log('Fetching deck:', `http://localhost:3001/api/decks/${slug}`);
  const response = await fetch(`http://localhost:3001/api/decks/${slug}`);
  if (!response.ok) {
    console.error('Failed to fetch deck:', response.status, response.statusText);
    const text = await response.text();
    console.error('Response body:', text);
    throw new Error('Failed to fetch deck');
  }
  return response.json();
};

const getFlashcards = async (deckId: string): Promise<Flashcard[]> => {
  console.log('Fetching cards:', `http://localhost:3001/api/decks/${deckId}/cards`);
  const response = await fetch(`http://localhost:3001/api/decks/${deckId}/cards`);
  if (!response.ok) {
    console.error('Failed to fetch cards:', response.status, response.statusText);
    const text = await response.text();
    console.error('Response body:', text);
    throw new Error('Failed to fetch cards');
  }
  return response.json();
};

export const DeckPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDeck = async () => {
      try {
        if (!slug) throw new Error('No deck slug provided');
        const deckData = await getDeckBySlug(slug);
        setDeck(deckData);
        const cardsData = await getFlashcards(deckData.id);
        setCards(cardsData);
      } catch (err) {
        setError('Failed to load deck');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadDeck();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading deck...</p>
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500">{error || 'Deck not found'}</p>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    );
  }

  const handleStudy = () => {
    // TODO: Add deck to user's study list if not already added
    navigate(`/study/${deck.slug}`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Deck Info */}
      <div className="flex flex-col gap-4 p-4">
        <div className="flex gap-4 items-start">
          {deck.image_hash && (
            <img 
              src={deck.image_hash} 
              alt={deck.name}
              className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">{deck.name}</h1>
            {deck.description && (
              <p className="text-gray-600">{deck.description}</p>
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
        </div>
      </div>

      {/* Cards List */}
      <div className="flex-1 p-4">
        <h2 className="text-xl font-semibold mb-4">Cards ({cards.length})</h2>
        <div className="flex flex-col gap-2">
          {cards.map((card) => (
            <div 
              key={card.id}
              className="p-4 border rounded-lg"
            >
              <p className="font-medium">{card.front}</p>
              <p className="text-sm text-gray-600 mt-2">{card.back}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Study Button */}
      <div className="sticky bottom-0 p-4 bg-white border-t">
        <Button 
          className="w-full"
          onClick={handleStudy}
        >
          Start Studying
        </Button>
      </div>
    </div>
  );
}; 