import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button/Button';
import { db, CONTEXT_ID, DECK_MODEL, FLASHCARD_MODEL, orbisToAppDeck, orbisToAppFlashcard, type OrbisDeck, type OrbisFlashcard } from '@/db/orbis';
import type { Deck, Flashcard } from '@/types/models';
import { IDBStorage } from '@/services/storage/idb';
import { Loader } from '@/components/ui/loader/Loader';

const getDeckByStreamId = async (streamId: string): Promise<Deck> => {
  console.log('Fetching deck:', streamId);
  const { rows } = await db
    .select()
    .from(DECK_MODEL)
    .where({ stream_id: streamId })
    .context(CONTEXT_ID)
    .run();

  if (rows.length === 0) {
    throw new Error('Deck not found');
  }

  return orbisToAppDeck(rows[0] as OrbisDeck);
};

const getFlashcards = async (deckId: string): Promise<Flashcard[]> => {
  console.log('Fetching cards for deck:', deckId);
  const { rows } = await db
    .select()
    .from(FLASHCARD_MODEL)
    .where({ deck_id: deckId })
    .orderBy(['sort_order', 'asc'])
    .context(CONTEXT_ID)
    .run();

  console.log('Found cards:', rows.length);
  return rows.map(row => orbisToAppFlashcard(row as OrbisFlashcard));
};

export const DeckPage = () => {
  const { stream_id } = useParams<{ stream_id: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasStudiedToday, setHasStudiedToday] = useState(false);

  useEffect(() => {
    const loadDeck = async () => {
      try {
        if (!stream_id) throw new Error('No deck stream_id provided');
        const deckData = await getDeckByStreamId(stream_id);
        setDeck(deckData);
        const cardsData = await getFlashcards(stream_id);
        setCards(cardsData);

        // Check if user has studied today
        const storage = await IDBStorage.getInstance();
        const studied = await storage.hasStudiedToday('user', stream_id);
        setHasStudiedToday(studied);
      } catch (err) {
        setError('Failed to load deck');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadDeck();
  }, [stream_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size={48} />
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
          <div className="flex flex-col gap-2 text-left">
            <h1 className="text-2xl font-bold">{deck.name}</h1>
            {deck.description && (
              <p className="text-neutral-100">{deck.description}</p>
            )}
            <div className="flex flex-wrap gap-2 text-sm text-neutral-400">
              <span>Category: {deck.category}</span>
              <span>•</span>
              <span>Language: {deck.language}</span>
              {deck.price > 0 && (
                <>
                  <span>•</span>
                  <span className="text-green-600">${deck.price}</span>
                </>
              )}
            </div>
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
              className="p-4 border border-neutral-700 rounded-lg flex flex-col gap-1"
            >
              <div className="flex gap-4 items-center">
                {card.front_image_cid && (
                  <img 
                    src={card.front_image_cid} 
                    alt="Front" 
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <p className="font-medium">{card.front}</p>
                {card.audio_tts_cid && (
                  <audio controls src={card.audio_tts_cid} className="ml-auto h-8" />
                )}
              </div>
              <div className="flex gap-4 items-center text-neutral-400">
                {card.back_image_cid && (
                  <img 
                    src={card.back_image_cid} 
                    alt="Back" 
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <p>{card.back}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Study Button */}
      <div className="sticky bottom-0 p-4 bg-neutral-900 border-t border-neutral-800">
        <Button 
          variant="secondary"
          className="w-full py-6 bg-blue-500 hover:bg-blue-600 text-white"
          onClick={() => navigate(`/study/${deck.id}${hasStudiedToday ? '?mode=extra' : ''}`)}
        >
          {hasStudiedToday ? 'Study Again' : 'Study'}
        </Button>
      </div>
    </div>
  );
}; 