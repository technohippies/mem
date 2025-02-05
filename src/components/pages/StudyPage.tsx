import { useParams, useNavigate } from 'react-router-dom';
import { StudyCard } from '@/components/core/StudyCard';
import { useStudySession } from '@/hooks/useStudySession';
import { IDBStorage } from '@/services/storage/idb';
import { useState, useEffect } from 'react';
import { db, CONTEXT_ID, FLASHCARD_MODEL, orbisToAppFlashcard, type OrbisFlashcard, PROGRESS_MODEL } from '@/db/orbis';
import { Button } from '@/components/ui/button/Button';
import { useToast } from '@/components/ui/toast/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { AuthWrapper } from '@/components/auth/AuthWrapper';
import { OrbisEVMAuth } from "@useorbis/db-sdk/auth";
import { Loader } from '@/components/ui/loader/Loader';

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
  } = useStudySession(stream_id || '', isInitialized);
  const { toast } = useToast();
  const { isAuthenticated, isCeramicConnected, userAddress } = useAuth();
  const appKit = useAppKit();
  const { isConnected } = useAppKitAccount();

  // Initialize cards in storage
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 200;

    const initCards = async () => {
      if (!stream_id) return;

      try {
        // Wait a bit to ensure storage is ready
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        
        const storage = await IDBStorage.getInstance();
        if (!mounted) return;

        // Check if we have cards in storage
        const existingCards = await storage.getCardsForDeck(stream_id);
        if (!mounted) return;

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
          if (!mounted) return;
          
          console.log('Cards stored successfully');
          await reloadSession();
        } else {
          console.log(`Found ${existingCards.length} cards in storage`);
        }

        if (mounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize cards:', error);
        if (error instanceof Error && error.name === 'InvalidStateError' && retryCount < MAX_RETRIES) {
          // If database is closing, retry after a delay
          retryCount++;
          console.log(`Retrying initialization (attempt ${retryCount}/${MAX_RETRIES})...`);
          setTimeout(initCards, RETRY_DELAY);
          return;
        }
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Failed to load cards');
        }
      }
    };

    initCards();
    return () => { mounted = false; };
  }, [stream_id]);

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
      console.log('Syncing progress for cards:', cards);

      // Get existing progress from Orbis
      const { rows: existingProgress } = await db
        .select()
        .from(PROGRESS_MODEL)
        .where({ deck_id: stream_id })
        .context(CONTEXT_ID)
        .run();

      console.log('Existing progress in Orbis:', existingProgress);

      // Get local progress
      const progressPromises = cards.map(async card => {
        const progress = await storage.getCardProgress(card.id, 'user');
        if (!progress) return null;

        // Handle dates safely
        const last_review = typeof progress.review_date === 'string'
          ? progress.review_date
          : new Date().toISOString();
        
        const next_review = typeof progress.next_review === 'string'
          ? progress.next_review
          : new Date().toISOString();

        // Format progress data according to Orbis schema
        // Only include fields that are in the model schema
        return {
          reps: progress.reps,
          lapses: progress.lapses,
          stability: progress.stability,
          difficulty: progress.difficulty,
          last_review: last_review,
          next_review: next_review,
          correct_reps: progress.reps - progress.lapses,  // Calculate correct reps
          flashcard_id: card.id,
          last_interval: progress.interval,
          retrievability: progress.retrievability
        };
      });
      
      const progressToSync = (await Promise.all(progressPromises))
        .filter((p): p is NonNullable<typeof p> => p !== null);

      console.log('Local progress to sync:', progressToSync);

      // First, handle updates for existing entries
      const updatesPromises = progressToSync
        .filter(progress => existingProgress.find(p => p.flashcard_id === progress.flashcard_id))
        .map(async progress => {
          const existingEntry = existingProgress.find(p => p.flashcard_id === progress.flashcard_id);
          if (!existingEntry) return; // TypeScript safety

          console.log('Updating existing progress for card:', progress.flashcard_id);
          return db
            .update(existingEntry.stream_id)
            .set(progress)
            .run();
        });

      // Wait for all updates to complete
      await Promise.all(updatesPromises);

      // Then bulk insert new entries
      const newEntries = progressToSync
        .filter(progress => !existingProgress.find(p => p.flashcard_id === progress.flashcard_id));

      if (newEntries.length > 0) {
        console.log('Bulk inserting progress for', newEntries.length, 'cards');
        const { success, errors } = await db
          .insertBulk(PROGRESS_MODEL)
          .values(newEntries)
          .context(CONTEXT_ID)
          .run();

        if (errors.length) {
          console.error('Errors occurred during bulk insert:', errors);
          toast({
            title: "Warning",
            description: `${success.length} entries succeeded, ${errors.length} failed`,
            variant: "destructive"
          });
        } else {
          console.log('Bulk insert successful for all entries');
        }
      }
      
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

  // Check completion first
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
        
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {!isConnected ? (
            <Button 
              variant="outline"
              onClick={() => appKit?.open()}
            >
              Connect Wallet
            </Button>
          ) : !isCeramicConnected ? (
            <Button 
              variant="outline"
              onClick={async () => {
                try {
                  if (!window.ethereum || !userAddress) {
                    toast({
                      title: "Error",
                      description: "Please connect your wallet first",
                      variant: "destructive"
                    });
                    return;
                  }

                  // Show loading state
                  toast({
                    title: "Connecting",
                    description: "Initializing Ceramic connection...",
                  });

                  // Wait for wallet connection to stabilize
                  await new Promise(resolve => setTimeout(resolve, 1000));

                  console.log('Initializing Ceramic connection with address:', userAddress);
                  const auth = new OrbisEVMAuth(window.ethereum as any);
                  console.log('Created Orbis auth instance');
                  
                  const result = await db.connectUser({ auth });
                  console.log('Ceramic connection result:', result);
                  
                  if (result) {
                    // Check if we're actually connected
                    const isConnected = await db.isUserConnected();
                    console.log('Connection check result:', isConnected);
                    
                    if (isConnected) {
                      toast({
                        title: "Success",
                        description: "Connected to Ceramic network. Refreshing page..."
                      });
                      // Wait a bit to show the success message before refresh
                      await new Promise(resolve => setTimeout(resolve, 1500));
                      window.location.reload();
                    } else {
                      throw new Error('Failed to verify Ceramic connection');
                    }
                  } else {
                    throw new Error('Failed to connect to Ceramic');
                  }
                } catch (error) {
                  console.error('Failed to connect to Ceramic:', error);
                  toast({
                    title: "Error",
                    description: error instanceof Error ? error.message : "Failed to connect to Ceramic network. Please try again.",
                    variant: "destructive"
                  });
                }
              }}
            >
              Connect to Ceramic
            </Button>
          ) : (
            <Button 
              variant="outline"
              onClick={handleSync}
            >
              Save Progress to Cloud
            </Button>
          )}
          
          <Button onClick={onRestart}>
            {isExtraStudy ? 'Study Again' : 'Extra Study'}
          </Button>
        </div>
      </div>
    );
  }

  // Then show loading spinner for initialization and loading states
  if (!isInitialized || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  // Finally check for no cards (but not when session is complete)
  if (!currentCard && !isComplete) {
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
        <div className="flex-1 p-4 bg-neutral-900">
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