import { useParams, useNavigate } from 'react-router-dom';
import { useStudySession } from '@/hooks/useStudySession';
import { Button } from '@/components/ui/button/Button';
import { FlashCard } from '@/components/ui/flashcard/FlashCard';
import { PouchStorage } from '@/services/storage/pouch';
import { useEffect, useState, useMemo } from 'react';
import type { Deck, Flashcard } from '@/types/models';

// TODO: Move to a shared utility
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

const getFlashcards = async (slug: string): Promise<Flashcard[]> => {
  console.log('Fetching cards:', `http://localhost:3001/api/decks/${slug}/cards`);
  const response = await fetch(`http://localhost:3001/api/decks/${slug}/cards`);
  if (!response.ok) {
    console.error('Failed to fetch cards:', response.status, response.statusText);
    const text = await response.text();
    console.error('Response body:', text);
    throw new Error('Failed to fetch cards');
  }
  return response.json();
};

export const StudyPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deckId, setDeckId] = useState('');
  const userId = 'test-user';
  
  // Initialize storage once
  const storage = useMemo(() => new PouchStorage(userId), [userId]);
  const studySession = useStudySession(deckId, userId);

  // Load deck and initialize study
  useEffect(() => {
    const loadDeck = async () => {
      if (!slug) return;
      setError(null);
      try {
        // First try to get from PouchDB
        let deck = await storage.getDeckBySlug(slug);
        
        if (!deck) {
          // If not in PouchDB, fetch from API and store it
          console.log('Fetching deck from API');
          deck = await getDeckBySlug(slug);
          await storage.storeDeck(deck);
          console.log('Stored deck in PouchDB');
        }
        console.log('Using deck:', deck);
        setDeckId(deck.id);

        // Get existing cards in PouchDB
        const existingCards = await storage.getCardsForDeck(deck.id);
        if (existingCards.length === 0) {
          console.log('No cards in PouchDB, fetching from API');
          // Fetch cards from API if none exist
          const cards = await getFlashcards(slug);
          console.log('Got cards from API:', cards.length, 'cards');
          
          // Store each card
          console.log('Storing cards in PouchDB...');
          for (const card of cards) {
            await storage.storeCard(card);
          }
          console.log('All cards stored in PouchDB');
        } else {
          console.log('Found existing cards in PouchDB:', existingCards.length, 'cards');
        }
      } catch (error) {
        console.error('Failed to load deck:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadDeck();
  }, [slug, storage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading deck...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-4">
        <p className="text-red-500">Error: {error}</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
        <Button variant="ghost" onClick={() => navigate(`/decks/${slug}`)}>
          Back to Deck
        </Button>
      </div>
    );
  }

  const { 
    state: { cards, currentIndex, showAnswer, completed, progress },
    showAnswer: handleShowAnswer,
    gradeCard,
    reset
  } = studySession;

  const currentCard = cards[currentIndex];

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Session Complete!</h1>
          <div className="flex flex-col gap-2">
            <p>Cards reviewed: {progress.reviewed}</p>
            <p>Correct: {progress.correct}</p>
            <p>Accuracy: {Math.round((progress.correct / progress.reviewed) * 100)}%</p>
          </div>
        </div>

        <div className="flex gap-4">
          <Button onClick={() => navigate(`/decks/${slug}`)}>
            Back to Deck
          </Button>
          <Button onClick={reset}>
            Study More
          </Button>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-lg mb-4">No cards due for review!</p>
        <Button onClick={() => navigate(`/decks/${slug}`)}>
          Back to Deck
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/decks/${slug}`)}
          >
            ← Back to Deck
          </Button>
          <div className="text-sm text-gray-500">
            {progress.reviewed + 1} / {progress.reviewed + progress.remaining + 1}
          </div>
        </div>

        <FlashCard
          frontContent={currentCard.front}
          backContent={currentCard.back}
          isFlipped={showAnswer}
          onAnimationComplete={handleShowAnswer}
        />
      </div>
    </div>
  );
}; 