import { useParams, useNavigate } from 'react-router-dom';
import { useStudySession } from '@/hooks/useStudySession';
import { Button } from '@/components/ui/button/Button';
import { StudyCard } from '@/components/core/StudyCard';
import { useEffect, useState } from 'react';
import { db, CONTEXT_ID, DECK_MODEL, FLASHCARD_MODEL, orbisToAppDeck, orbisToAppFlashcard, type OrbisDeck, type OrbisFlashcard } from '@/db/orbis';
import type { Deck, Flashcard } from '@/types/models';
import { IDBStorage } from '@/services/storage/idb';
import { useToast } from '@/components/ui/toast/useToast';
import { getProgressFromOrbis, pushProgressToOrbis } from '@/services/sync';
import type { FSRSOutput } from '@/services/fsrs';

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

export function StudyPage() {
  const { stream_id } = useParams<{ stream_id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deckId, setDeckId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const userId = 'test-user';
  const { toast } = useToast();

  // Only initialize study session when we have a deckId AND cards are stored
  const { 
    state: { cards, currentIndex, completed, progress },
    gradeCard,
    reset
  } = useStudySession(isInitialized ? (deckId || '') : '', userId);

  // Load deck and initialize study
  useEffect(() => {
    const loadDeck = async () => {
      if (!stream_id) {
        setError('No deck ID provided');
        setLoading(false);
        return;
      }

      setError(null);
      try {
        const storage = await IDBStorage.getInstance(userId);
        
        // First try to get from IDB
        let deck = await storage.getDeckByStreamId(stream_id);
        
        if (!deck) {
          // If not in IDB, fetch from API and store it
          console.log('Fetching deck from API');
          deck = await getDeckByStreamId(stream_id);
          await storage.storeDeck(deck);
          console.log('Stored deck in IDB');
        }
        console.log('Using deck:', deck);
        setDeckId(deck.id);

        // Get existing cards in IDB
        const existingCards = await storage.getCardsForDeck(deck.id);
        if (existingCards.length === 0) {
          console.log('No cards in IDB, fetching from API');
          // Fetch cards from API if none exist
          const cards = await getFlashcards(stream_id);
          console.log('Got cards from API:', cards.length, 'cards');
          
          // Store each card
          console.log('Storing cards in IDB...');
          await Promise.all(cards.map(card => storage.storeCard(card)));
          console.log('Finished storing cards in IDB');
        } else {
          console.log('Found existing cards in IDB:', existingCards.length, 'cards');
        }

        // Mark as initialized only after all cards are stored
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to load deck:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadDeck();
  }, [stream_id, userId]);

  if (loading || !isInitialized) {
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
        <Button variant="ghost" onClick={() => navigate(`/decks/${stream_id}`)}>
          Back to Deck
        </Button>
      </div>
    );
  }

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

        <div className="flex flex-col gap-4 w-full max-w-md">
          <Button 
            onClick={async () => {
              if (!deckId) return;
              try {
                const storage = await IDBStorage.getInstance(userId);
                
                // Get all progress from IDB
                const cards = await storage.getCardsForDeck(deckId);
                const progressPromises = cards.map(async card => {
                  const progress = await storage.getCardProgress(card.id, userId);
                  return progress ? { ...progress, card_id: card.id } : null;
                });
                
                const progress = (await Promise.all(progressPromises)).filter((p): p is FSRSOutput & { card_id: string } => p !== null);
                
                // Push to Orbis
                await pushProgressToOrbis(userId, deckId, progress);
                
                toast({
                  title: "Progress synced!",
                  description: "Your progress has been saved to the cloud.",
                });
              } catch (error) {
                console.error('Failed to sync:', error);
                toast({
                  title: "Sync failed",
                  description: "Failed to sync progress to cloud. Your progress is still saved locally.",
                  variant: "destructive"
                });
              }
            }}
          >
            Sync Progress to Cloud
          </Button>
          
          <Button onClick={() => navigate(`/decks/${stream_id}`)}>
            Back to Deck
          </Button>
          
          <Button variant="outline" onClick={reset}>
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
        <Button onClick={() => navigate(`/decks/${stream_id}`)}>
          Back to Deck
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-center max-w-2xl mx-auto gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/decks/${stream_id}`)}
          >
            ← Back to Deck
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (!stream_id || !deckId) return;
                try {
                  const storage = await IDBStorage.getInstance(userId);
                  
                  // Get all cards and progress from Orbis
                  const cards = await getFlashcards(stream_id);
                  const orbisProgress = await getProgressFromOrbis(userId, deckId);
                  
                  // Store in IDB
                  await storage.clearProgress(deckId);
                  await Promise.all([
                    ...cards.map(card => storage.storeCard(card)),
                    ...orbisProgress.map(p => storage.updateCardProgress(p.card_id, userId, p))
                  ]);
                  
                  toast({
                    title: "Restored from Cloud",
                    description: "Successfully loaded latest data from cloud.",
                  });
                  
                  // Reload the study session
                  window.location.reload();
                } catch (error) {
                  console.error('Failed to restore from cloud:', error);
                  toast({
                    title: "Restore Failed",
                    description: "Failed to load data from cloud.",
                    variant: "destructive"
                  });
                }
              }}
            >
              Restore from Cloud
            </Button>
            
            <Button
              variant="outline"
              onClick={async () => {
                if (!stream_id || !deckId) return;
                try {
                  const storage = await IDBStorage.getInstance(userId);
                  
                  // Get all progress from IDB
                  const cards = await storage.getCardsForDeck(deckId);
                  const progressPromises = cards.map(async card => {
                    const progress = await storage.getCardProgress(card.id, userId);
                    return progress ? { ...progress, card_id: card.id } : null;
                  });
                  
                  const progress = (await Promise.all(progressPromises)).filter((p): p is FSRSOutput & { card_id: string } => p !== null);
                  
                  // Push to Orbis
                  await pushProgressToOrbis(userId, deckId, progress);
                  
                  toast({
                    title: "Synced to Cloud",
                    description: "Successfully saved progress to cloud.",
                  });
                } catch (error) {
                  console.error('Failed to sync to cloud:', error);
                  toast({
                    title: "Sync Failed",
                    description: "Failed to save progress to cloud.",
                    variant: "destructive"
                  });
                }
              }}
            >
              Save to Cloud
            </Button>
          </div>
          
          <div className="text-sm text-gray-500">
            {currentCard ? `${progress.reviewed + 1} / ${progress.reviewed + progress.remaining + 1}` : ''}
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <StudyCard
            key={currentCard.id}
            front={
              <div className="flex flex-col gap-4 items-center">
                {currentCard.front_image_cid && (
                  <img 
                    src={currentCard.front_image_cid} 
                    alt="Front" 
                    className="w-48 h-48 rounded-lg object-cover"
                  />
                )}
                <p className="text-xl">{currentCard.front}</p>
                {currentCard.audio_tts_cid && (
                  <audio controls src={currentCard.audio_tts_cid} className="mt-4" />
                )}
              </div>
            }
            back={
              <div className="flex flex-col gap-4 items-center">
                {currentCard.back_image_cid && (
                  <img 
                    src={currentCard.back_image_cid} 
                    alt="Back" 
                    className="w-48 h-48 rounded-lg object-cover"
                  />
                )}
                <p className="text-xl">{currentCard.back}</p>
              </div>
            }
            onAgain={() => gradeCard(1)}
            onGood={() => gradeCard(3)}
          />
        </div>
      </div>
    </div>
  );
} 