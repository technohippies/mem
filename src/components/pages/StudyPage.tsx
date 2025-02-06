import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { StudyCard } from '@/components/core/StudyCard';
import { useStudySession } from '@/hooks/useStudySession';
import { IDBStorage } from '@/services/storage/idb';
import { useState, useEffect } from 'react';
import { db, CONTEXT_ID, FLASHCARD_MODEL, orbisToAppFlashcard, type OrbisFlashcard, PROGRESS_MODEL } from '@/db/orbis';
import { Button } from '@/components/ui/button/Button';
import { useToast } from '@/components/ui/toast/useToast';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { AuthWrapper } from '@/components/auth/AuthWrapper';
import { OrbisEVMAuth } from "@useorbis/db-sdk/auth";
import { Loader } from '@/components/ui/loader/Loader';
import { CaretLeft, X } from '@phosphor-icons/react';
import { IconButton } from '@/components/ui/button/IconButton';
import type { IEVMProvider } from "@useorbis/db-sdk";

export const StudyPage = () => {
  const { stream_id } = useParams<{ stream_id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  const { 
    currentCard, 
    showingCard, 
    isComplete, 
    isLoading,
    newCardsToday,
    reviewsToday,
    onGrade,
    reloadSession 
  } = useStudySession(stream_id || '', isInitialized, searchParams.get('mode') === 'extra');
  const { toast } = useToast();
  const { isConnected, isCeramicConnected, userAddress, connectCeramic, connect } = useAuthContext();
  const appKit = useAppKit();
  const { isConnected: isWalletConnected, address } = useAppKitAccount();

  // Effect to handle wallet connection state
  useEffect(() => {
    if (isWalletConnected && address && !isConnected) {
      console.log('[StudyPage] Wallet connected, setting address:', address);
      connect(address);
    }
  }, [isWalletConnected, address, isConnected, connect]);

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

    if (!isConnected || !userAddress) {
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

    setIsSyncing(true);
    setSyncComplete(false);

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
      setSyncComplete(true);
    } catch (error) {
      console.error('Failed to sync:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync progress",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!stream_id) {
    return <div>Invalid deck ID</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh gap-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <Loader size={48} />
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh gap-4 p-4 relative">
        <div className="absolute top-4 left-4">
          <IconButton
            icon={<X size={24} weight="regular" />}
            label="Close study session"
            onClick={() => navigate(-1)}
          />
        </div>
        <h1 className="text-2xl font-bold">Session Complete!</h1>
        <div className="flex flex-col items-center gap-2 text-neutral-400">
          <p>New cards: {newCardsToday}</p>
          <p>Reviews: {reviewsToday}</p>
        </div>
        <div className="flex flex-col w-full max-w-xs gap-2">
          {!isWalletConnected ? (
            <Button 
              variant="secondary"
              onClick={async () => {
                console.log('[StudyPage] Connect wallet button clicked');
                try {
                  await appKit?.open();
                } catch (error) {
                  console.error('[StudyPage] Failed to open wallet:', error);
                  toast({
                    title: "Error",
                    description: "Failed to connect wallet",
                    variant: "destructive"
                  });
                }
              }}
            >
              Connect Wallet
            </Button>
          ) : !isConnected ? (
            <Button
              variant="secondary"
              onClick={() => connect(address || '')}
            >
              Initialize Connection
            </Button>
          ) : !isCeramicConnected ? (
            <Button 
              variant="secondary"
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

                  const provider = window.ethereum as unknown as IEVMProvider;
                  const auth = new OrbisEVMAuth(provider);
                  const result = await db.connectUser({ auth });
                  
                  if (!result) {
                    throw new Error('Failed to connect to Ceramic');
                  }

                  // Check if we're actually connected
                  const isConnected = await db.isUserConnected();
                  if (!isConnected) {
                    throw new Error('Failed to verify Ceramic connection');
                  }

                  toast({
                    title: "Success",
                    description: "Connected to Ceramic network"
                  });

                  // Refresh the page to update state
                  window.location.reload();
                } catch (error) {
                  console.error('Failed to connect to Ceramic:', error);
                  toast({
                    title: "Error",
                    description: error instanceof Error ? error.message : "Failed to connect to Ceramic network",
                    variant: "destructive"
                  });
                }
              }}
            >
              Connect to Ceramic
            </Button>
          ) : (
            <Button 
              variant="secondary"
              onClick={handleSync}
              disabled={isSyncing || syncComplete}
            >
              {isSyncing ? (
                <Loader size={16} color="currentColor" />
              ) : syncComplete ? (
                <span>✓ Synced</span>
              ) : (
                'Save to Cloud'
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <AuthWrapper>
      <div className="flex flex-col h-dvh">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-neutral-900/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/60">
          <IconButton
            icon={<CaretLeft size={24} weight="regular" />}
            label="Go back to deck"
            onClick={() => navigate(-1)}
            className="-ml-2"
          />
          {isSyncing ? (
            <div className="flex items-center gap-2">
              <Loader size={16} />
              <span className="text-sm text-neutral-400">Syncing...</span>
            </div>
          ) : syncComplete ? (
            <span className="text-sm text-green-400">Synced!</span>
          ) : null}
        </div>

        {/* Study Card */}
        <div className="flex-grow">
          <StudyCard
            card={currentCard}
            onGrade={onGrade}
            visible={showingCard}
          />
        </div>
      </div>
    </AuthWrapper>
  );
};