import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button/Button';
import { db, CONTEXT_ID, DECK_MODEL, FLASHCARD_MODEL, orbisToAppDeck, orbisToAppFlashcard, type OrbisDeck, type OrbisFlashcard } from '@/db/orbis';
import type { Deck, Flashcard } from '@/types/models';
import { IDBStorage } from '@/services/storage/idb';
import { Loader } from '@/components/ui/loader/Loader';
import { CaretLeft } from '@phosphor-icons/react';
import { IconButton } from '@/components/ui/button/IconButton';

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
  const [hasUnfinishedSession, setHasUnfinishedSession] = useState(false);
  const [cardStats, setCardStats] = useState({
    newCount: 0,
    reviewCount: 0,
    dueCount: 0,
  });

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

        // Calculate card stats
        const cardProgressPromises = cardsData.map(card => storage.getCardProgress(card.id, 'user'));
        const cardProgresses = await Promise.all(cardProgressPromises);
        
        console.log('--- Card Stats Calculation ---');
        console.log('Total cards:', cardsData.length);
        
        // Get cards studied today
        const studiedToday = await storage.getCardsStudiedToday('user', stream_id);
        console.log('Cards studied today:', studiedToday);
        
        // In a regular study session, all cards are new cards (we don't mix new and review cards)
        // So if we've studied 20 cards today, they were all new cards
        const newCardsStudiedToday = studiedToday.length;

        // Calculate stats
        const newCards = cardsData.filter(card => {
          const progress = cardProgresses[cardsData.indexOf(card)];
          const isStudiedToday = studiedToday.includes(card.id);
          return !progress && !isStudiedToday;
        });
        
        const reviewCards = cardsData.filter(card => 
          studiedToday.includes(card.id)
        );
        
        const dueCards = cardsData.filter(card => {
          const progress = cardProgresses[cardsData.indexOf(card)];
          const isStudiedToday = studiedToday.includes(card.id);
          return progress && !isStudiedToday && progress.review_date && new Date(progress.review_date) <= new Date();
        });

        // Check for unfinished session
        const lastStudiedIndex = await storage.getLastStudiedIndex('user', stream_id);
        const hasUnfinished = lastStudiedIndex > 0 && 
          newCardsStudiedToday < 20 &&  // If we've hit our daily limit, we're not "unfinished"
          (newCards.length > 0 || dueCards.length > 0);  // And we have cards to study

        console.log('Session state:', {
          lastStudiedIndex,
          newCardsStudiedToday,
          hasNewCards: newCards.length > 0,
          hasDueCards: dueCards.length > 0,
          hasUnfinished,
          hasStudiedToday
        });

        setHasUnfinishedSession(hasUnfinished);

        console.log('Stats breakdown:', {
          total: cardsData.length,
          new: `${newCards.length} (never studied cards)`,
          review: `${reviewCards.length} (studied today)`,
          due: `${dueCards.length} (cards due for review)`,
          studiedToday: studiedToday.length,
          newCardsStudiedToday,
          lastStudiedIndex,
          hasUnfinished,
          buttonText: hasUnfinished ? 'Continue Studying' : hasStudiedToday ? 'Study Again' : 'Study'
        });
        
        setCardStats({
          newCount: newCards.length,
          reviewCount: reviewCards.length,
          dueCount: dueCards.length,
        });
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
      {/* Header */}
      <div className="p-4 bg-neutral-900/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/60">
        <div className="flex justify-between items-center">
          <IconButton
            icon={<CaretLeft size={24} weight="regular" />}
            label="Go back to home"
            onClick={() => navigate('/')}
            className="-ml-2"
          />
        </div>
      </div>

      {/* Deck Info */}
      <div className="flex flex-col gap-1 p-4">
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

          </div>
        </div>

        {/* Card Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-neutral-800/50 rounded-lg p-4 flex flex-col">
            <span className="text-neutral-500 text-sm">New</span>
            <span className="text-2xl font-bold mt-1">{cardStats.newCount}</span>
          </div>
          <div className="bg-neutral-800/50 rounded-lg p-4 flex flex-col">
            <span className="text-neutral-500 text-sm">Review</span>
            <span className="text-2xl font-bold mt-1">{cardStats.reviewCount}</span>
          </div>
          <div className="bg-neutral-800/50 rounded-lg p-4 flex flex-col">
            <span className="text-neutral-500 text-sm">Due</span>
            <span className="text-2xl font-bold mt-1">{cardStats.dueCount}</span>
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
              className="p-4 bg-neutral-800/50 rounded-lg flex flex-col gap-1"
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
          onClick={async () => {
            if (deck) {
              // Store deck in IndexedDB before navigating
              const storage = await IDBStorage.getInstance();
              console.log('[DeckPage] Storing deck before study:', deck);
              await storage.storeDeck(deck);
            }
            navigate(`/study/${deck.id}${hasStudiedToday ? '?mode=extra' : ''}`);
          }}
        >
          {hasUnfinishedSession ? 'Continue Studying' : hasStudiedToday ? 'Study Again' : 'Study'}
        </Button>
      </div>
    </div>
  );
}; 