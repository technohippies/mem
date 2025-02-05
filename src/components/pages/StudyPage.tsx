import { useParams, useNavigate } from 'react-router-dom';
import { StudyCard } from '@/components/core/StudyCard';
import { useStudySession } from '@/hooks/useStudySession';
import { IDBStorage } from '@/services/storage/idb';
import { useState, useEffect } from 'react';
import { db, CONTEXT_ID, FLASHCARD_MODEL, orbisToAppFlashcard, type OrbisFlashcard } from '@/db/orbis';
import { Button } from '@/components/ui/button/Button';
import { useToast } from '@/components/ui/toast/useToast';
import { pushProgressToOrbis } from '@/services/sync';
import type { FSRSOutput } from '@/services/fsrs';
import { useAuth } from '@/contexts/AuthContext';
import { useAppKit } from '@reown/appkit/react';
import { AuthWrapper } from '@/components/auth/AuthWrapper';

export const StudyPage = () => {
  const { stream_id } = useParams<{ stream_id: string }>();
  const navigate = useNavigate();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { 
    currentCard, 
    showingCard, 
    isComplete, 
    isLoading,
    newCardsToday,
    reviewsToday,
    isExtraStudy,
    onGrade,
    onRestart,
    reloadSession 
  } = useStudySession(stream_id || '');
  const { toast } = useToast();
  const { isAuthenticated, userAddress } = useAuth();
  const appKit = useAppKit();

  // Initialize cards in storage
  useEffect(() => {
    const initCards = async () => {
      if (!stream_id) return;

      try {
        const storage = await IDBStorage.getInstance();
        
        // Check if we have cards in storage
        const existingCards = await storage.getCardsForDeck(stream_id);
        if (existingCards.length === 0) {
          // Fetch and store cards
          console.log('No cards in storage, fetching from API...');
          const { rows } = await db
            .select()
            .from(FLASHCARD_MODEL)
            .where({ deck_id: stream_id })
            .orderBy(['sort_order', 'asc'])
            .context(CONTEXT_ID)
            .run();

          const cardsToStore = rows.map(row => orbisToAppFlashcard(row as OrbisFlashcard));
          console.log(`Storing ${cardsToStore.length} cards in storage...`);
          await Promise.all(cardsToStore.map(card => storage.storeCard(card)));
          console.log('Cards stored successfully');

          // Reload study session after storing cards
          await reloadSession();
        } else {
          console.log(`Found ${existingCards.length} cards in storage`);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize cards:', error);
        setError(error instanceof Error ? error.message : 'Failed to load cards');
      }
    };

    initCards();
  }, [stream_id, reloadSession]);

  const handleSync = async () => {
    if (!stream_id) {
      toast({
        title: "Error",
        description: "No deck loaded",
        variant: "destructive"
      });
      return;
    }

    if (!isAuthenticated || !userAddress) {
      if (!appKit?.open) {
        toast({
          title: "Error",
          description: "Wallet connection not available",
          variant: "destructive"
        });
        return;
      }

      try {
        await appKit.open();
        return;
      } catch (error) {
        console.error('Failed to open wallet connection:', error);
        toast({
          title: "Error",
          description: "Failed to connect wallet",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      const storage = await IDBStorage.getInstance();
      const { rows } = await db
        .select()
        .from(FLASHCARD_MODEL)
        .where({ deck_id: stream_id })
        .orderBy(['sort_order', 'asc'])
        .context(CONTEXT_ID)
        .run();

      const cards = rows.map(row => orbisToAppFlashcard(row as OrbisFlashcard));
      const progressPromises = cards.map(async card => {
        const progress = await storage.getCardProgress(card.id, 'user');
        return progress ? { ...progress, card_id: card.id } : null;
      });
      
      const progressToSync = (await Promise.all(progressPromises))
        .filter((p): p is FSRSOutput & { card_id: string } => p !== null);

      await pushProgressToOrbis(userAddress, stream_id, progressToSync);
      
      toast({
        title: "Success",
        description: "Progress synced successfully",
      });
    } catch (error) {
      console.error('Failed to sync:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync progress",
        variant: "destructive"
      });
    }
  };

  if (!stream_id) {
    return <div>Invalid deck ID</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!isInitialized || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p>Loading cards...</p>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">
          {isExtraStudy ? 'Extra Study Complete!' : 'Daily Reviews Complete!'}
        </h1>
        <div className="text-center mb-4">
          <p>Today's progress:</p>
          <p className="text-sm text-gray-600">New cards: {newCardsToday}/20</p>
          <p className="text-sm text-gray-600">Reviews: {reviewsToday}</p>
        </div>
        <Button onClick={onRestart}>
          {isExtraStudy ? 'Study Again' : 'Extra Study'}
        </Button>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p>No cards due for review.</p>
      </div>
    );
  }

  return (
    <AuthWrapper>
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
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {isExtraStudy ? (
                  <p>Extra Study Mode</p>
                ) : (
                  <>
                    <p>New: {newCardsToday}/20</p>
                    <p>Reviews: {reviewsToday}</p>
                  </>
                )}
              </div>
              <Button
                variant="outline"
                onClick={handleSync}
              >
                {isAuthenticated ? 'Sync Progress' : 'Connect to Sync'}
              </Button>
            </div>
          </div>
        </div>

        {/* Study Area */}
        <div className="flex-1 p-4">
          <div className="max-w-2xl mx-auto">
            <StudyCard
              card={currentCard}
              onGrade={onGrade}
              visible={showingCard}
            />
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
};