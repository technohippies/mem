import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { StudyCard } from '@/components/core/StudyCard';
import { useStudySession } from '@/hooks/useStudySession';
import { IDBStorage } from '@/services/storage/idb';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button/Button';
import { useToast } from '@/components/ui/toast/useToast';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { AuthWrapper } from '@/components/auth/AuthWrapper';
import { Loader } from '@/components/ui/loader/Loader';
import { CaretLeft, X } from '@phosphor-icons/react';
import { IconButton } from '@/components/ui/button/IconButton';
import { useTableland } from '@/contexts/TablelandContext';
import { tablelandToAppDeck, tablelandToAppFlashcard } from '@/types/tableland';
import { PROGRESS_MODEL, CONTEXT_ID } from '@/db/orbis';
import { db } from '@/db/orbis';

export const StudyPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  const [isConnectingCeramic, setIsConnectingCeramic] = useState(false);
  const { 
    currentCard, 
    showingCard, 
    isComplete, 
    isLoading,
    onGrade,
    reloadSession 
  } = useStudySession(id || '', isInitialized, searchParams.get('mode') === 'extra');
  const { toast } = useToast();
  const { isConnected, isCeramicConnected, userAddress, connectCeramic, connect } = useAuthContext();
  const appKit = useAppKit();
  const { isConnected: isWalletConnected, address } = useAppKitAccount();
  const { client: tablelandClient } = useTableland();

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
      if (!id) return;

      try {
        // Wait a bit to ensure storage is ready
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        
        const storage = await IDBStorage.getInstance();
        if (!mounted) return;

        // Check if we have cards in storage
        const existingCards = await storage.getCardsForDeck(id);
        if (!mounted) return;

        if (existingCards.length === 0) {
          // First, fetch and store the deck
          console.log('[StudyPage] Fetching deck from Tableland...');
          const tablelandDeck = await tablelandClient.getDeck(parseInt(id));
          if (!tablelandDeck) {
            throw new Error('Deck not found');
          }

          const deck = tablelandToAppDeck(tablelandDeck);
          await storage.storeDeck(deck);
          console.log('[StudyPage] Stored deck in IDB:', deck);

          // Then fetch and store cards
          console.log('[StudyPage] No cards in storage, fetching from Tableland...');
          const tablelandCards = await tablelandClient.getFlashcards(parseInt(id));
          const cardsToStore = tablelandCards.map(tablelandToAppFlashcard);
          
          console.log(`[StudyPage] Storing ${cardsToStore.length} cards in storage...`);
          await Promise.all(cardsToStore.map(card => storage.storeCard(card)));
          if (!mounted) return;
          
          console.log('[StudyPage] Cards stored successfully');
          await reloadSession();
        } else {
          console.log(`[StudyPage] Found ${existingCards.length} cards in storage`);
        }

        if (mounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('[StudyPage] Failed to initialize:', error);
        if (error instanceof Error && error.name === 'InvalidStateError' && retryCount < MAX_RETRIES) {
          // If database is closing, retry after a delay
          retryCount++;
          console.log(`[StudyPage] Retrying initialization (attempt ${retryCount}/${MAX_RETRIES})...`);
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
  }, [id, tablelandClient, reloadSession]);

  const handleCeramicConnect = async () => {
    if (!isWalletConnected || !address) {
      try {
        await appKit?.open();
        return;
      } catch (error) {
        console.error('[StudyPage] Failed to connect wallet:', error);
        toast({
          title: "Error",
          description: "Failed to connect wallet",
          variant: "destructive"
        });
        return;
      }
    }

    setIsConnectingCeramic(true);
    try {
      await connectCeramic();
      toast({
        title: "Success",
        description: "Connected to Ceramic network"
      });
    } catch (error) {
      console.error('[StudyPage] Failed to connect to Ceramic:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect to Ceramic network",
        variant: "destructive"
      });
    } finally {
      setIsConnectingCeramic(false);
    }
  };

  const handleSync = async () => {
    if (!id) {
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
        console.error('[StudyPage] Failed to open wallet:', error);
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
      const cards = await storage.getCardsForDeck(id);
      console.log('Syncing progress for cards:', cards);

      // Use the id directly as the deck_id
      const deckId = id;
      console.log('Using deck_id:', deckId);

      // Get existing progress from Orbis
      console.log('Querying Orbis with deck_id:', deckId);
      const whereClause = { deck_id: parseInt(deckId) };
      console.log('Using where clause:', whereClause);
      
      const query = db
        .select()
        .from(PROGRESS_MODEL)
        .where(whereClause)
        .context(CONTEXT_ID);

      console.log('Query built:', query.toString());
      const { rows: existingProgress } = await query.run();

      console.log('Existing progress in Orbis:', existingProgress);

      // Get local progress
      const progressPromises = cards.map(async card => {
        const progress = await storage.getCardProgress(card.id, 'user');
        if (!progress) {
          console.log('No progress found for card:', card.id);
          return null;
        }

        console.log('Progress found for card:', card.id, progress);

        // Handle dates safely
        const last_review = typeof progress.review_date === 'string'
          ? progress.review_date
          : new Date().toISOString();
        
        const next_review = typeof progress.next_review === 'string'
          ? progress.next_review
          : new Date().toISOString();

        // Format the progress data consistently for both updates and inserts
        return {
          deck_id: parseInt(deckId),
          flashcard_id: parseInt(card.id),
          reps: progress.reps,
          lapses: progress.lapses,
          stability: progress.stability,
          difficulty: progress.difficulty,
          last_review,
          next_review
        };
      });
      
      const progressToSync = (await Promise.all(progressPromises))
        .filter((p): p is NonNullable<typeof p> => p !== null);

      console.log('Local progress to sync:', progressToSync);

      // Process each progress entry
      for (const progress of progressToSync) {
        try {
          // Find existing entry for this card
          console.log('Looking for existing entry with:', {
            deck_id: progress.deck_id,
            flashcard_id: progress.flashcard_id,
            existingEntries: existingProgress.map(p => ({
              deck_id: p.deck_id,
              flashcard_id: p.flashcard_id,
              stream_id: p.stream_id
            }))
          });

          const existingEntry = existingProgress.find(
            p => Number(p.deck_id) === progress.deck_id && Number(p.flashcard_id) === progress.flashcard_id
          );

          if (existingEntry) {
            // Update existing entry
            console.log('Found existing entry:', {
              stream_id: existingEntry.stream_id,
              deck_id: existingEntry.deck_id,
              flashcard_id: existingEntry.flashcard_id
            });
            console.log('Updating with:', progress);
            
            await db
              .update(existingEntry.stream_id)
              .set(progress)
              .run();
          } else {
            // Insert new entry
            console.log('No existing entry found for:', {
              deck_id: progress.deck_id,
              flashcard_id: progress.flashcard_id
            });
            
            await db
              .insert(PROGRESS_MODEL)
              .value(progress)
              .context(CONTEXT_ID)
              .run();
          }
        } catch (error) {
          console.error('Failed to sync progress for card:', progress.flashcard_id, error);
        }
      }

      // Update last sync time
      await storage.updateDeckLastSync(id);
      
      toast({
        title: "Success",
        description: "Progress synced successfully",
      });
      setSyncComplete(true);
    } catch (error) {
      console.error('[StudyPage] Failed to sync:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync progress",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!id) {
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
      <div className="flex flex-col h-dvh">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-neutral-900/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/60">
          <IconButton
            icon={<X size={24} weight="regular" />}
            label="Close study session"
            onClick={() => navigate(-1)}
            className="-ml-2"
          />
        </div>

        {/* Main content */}
        <div className="flex-grow">
          <div className="flex flex-col items-center justify-center h-full p-4">
            <h1 className="text-2xl font-bold mb-12">Complete!</h1>
            
            {/* Save progress section */}
            <div className="w-full max-w-md space-y-2">
              <h2 className="font-semibold text-lg">⚠️ Don't Lose Your Progress</h2>
              <div className="space-y-3">
                <p className="text-neutral-300">Save your progress to web3 for free. This also adds to your Streak 🔥!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Button section - same structure as study card buttons */}
        <div className="sticky bottom-0 w-full p-4 bg-neutral-900 border-t border-neutral-800">
          <div className="w-full max-w-md mx-auto">
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
                className="w-full py-6 bg-blue-500 hover:bg-blue-600 text-white"
              >
                Connect Wallet
              </Button>
            ) : !isConnected ? (
              <Button
                variant="secondary"
                onClick={() => connect(address || '')}
                className="w-full py-6 bg-blue-500 hover:bg-blue-600 text-white"
              >
                Create Database
              </Button>
            ) : !isCeramicConnected ? (
              <Button 
                variant="secondary"
                onClick={handleCeramicConnect}
                disabled={isConnectingCeramic}
                className="w-full py-6 bg-blue-500 hover:bg-blue-600 text-white"
              >
                {isConnectingCeramic ? (
                  <Loader size={16} />
                ) : (
                  'Save'
                )}
              </Button>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <Button 
                  variant="secondary"
                  onClick={handleSync}
                  disabled={isSyncing || syncComplete}
                  className="w-full py-6 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {isSyncing ? (
                    <Loader size={16} />
                  ) : syncComplete ? (
                    'Synced'
                  ) : (
                    'Save to Web3'
                  )}
                </Button>
              </div>
            )}
          </div>
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