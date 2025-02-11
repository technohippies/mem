import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button/Button';
import { Loader } from '@/components/ui/loader/Loader';
import { CaretLeft, Play } from '@phosphor-icons/react';
import { IconButton } from '@/components/ui/button/IconButton';
import { useTableland } from '@/contexts/TablelandContext';
import { useToast } from '@/components/ui/toast/useToast';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useDeckStore } from '@/stores/deckStore';

export const DeckPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { client: tablelandClient, isInitialized: isTablelandInitialized, isLitInitialized } = useTableland();
  const { isConnected: isWalletConnected, address } = useAppKitAccount();
  const appKit = useAppKit();

  // Get state from store
  const { 
    deck, 
    cards, 
    loadingState,
    error,
    isPaidDeck,
    hasPurchased,
    isLitReady,
    loadDeck,
    purchaseDeck,
    setLitReady,
    setTablelandReady
  } = useDeckStore();

  // Track if we've loaded with Lit to prevent cycles
  const hasLoadedWithLit = useRef(false);

  // Add debug logging
  useEffect(() => {
    console.log('[DeckPage] Render state:', {
      hasDeck: !!deck,
      cardCount: cards.length,
      loadingState,
      error,
      isPaidDeck,
      hasPurchased,
      isLitReady,
      hasLoadedWithLit: hasLoadedWithLit.current,
      shouldShowCards: !isPaidDeck || (isPaidDeck && hasPurchased)
    });
  }, [deck, cards, loadingState, error, isPaidDeck, hasPurchased, isLitReady]);

  // Update Lit and Tableland ready states
  useEffect(() => {
    setLitReady(isLitInitialized);
    
    // Only trigger reload for paid decks when Lit becomes ready and we haven't loaded yet
    if (isLitInitialized && isPaidDeck && hasPurchased && tablelandClient && !hasLoadedWithLit.current) {
      console.log('[DeckPage] Lit ready, refreshing paid deck from network...');
      hasLoadedWithLit.current = true;
      loadDeck(id!, tablelandClient);
    }
  }, [isLitInitialized, setLitReady, isPaidDeck, hasPurchased, id, tablelandClient, loadDeck]);

  useEffect(() => {
    setTablelandReady(isTablelandInitialized);
  }, [isTablelandInitialized, setTablelandReady]);

  // Load deck when component mounts
  useEffect(() => {
    if (id && isTablelandInitialized && !hasLoadedWithLit.current) {
      loadDeck(id, tablelandClient);
    }
  }, [id, isTablelandInitialized, tablelandClient, loadDeck]);

  // Show loading state
  if (loadingState === 'loading' || !isTablelandInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader size={48} />
          {!isTablelandInitialized && (
            <p className="text-neutral-400">Connecting to network...</p>
          )}
          {isTablelandInitialized && deck && deck.price > 0 && hasPurchased && !isLitInitialized && (
            <p className="text-neutral-400">Please connect your wallet to view deck content</p>
          )}
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !deck) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500">{error?.message || 'Deck not found'}</p>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    );
  }

  // Handle purchase
  const handlePurchase = async () => {
    if (!isWalletConnected || !address) {
      try {
        await appKit?.open();
        return;
      } catch (error) {
        console.error('[DeckPage] Failed to connect wallet:', error);
        toast({
          title: "Error",
          description: "Failed to connect wallet",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      if (!deck?.id) throw new Error('No deck ID');
      await purchaseDeck(deck.id);
      // After successful purchase, reload the page to show the flashcards
      window.location.reload();
    } catch (error) {
      console.error('Purchase failed:', error);
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "Failed to purchase deck",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-neutral-900/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/60">
        <IconButton
          icon={<CaretLeft size={24} weight="regular" />}
          label="Go back to home"
          onClick={() => navigate('/')}
          className="-ml-2"
        />
        {deck.stream_id && (
          <p className="text-sm text-neutral-500">
            Synced: {deck.last_sync ? (() => {
              const syncDate = new Date(deck.last_sync);
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              
              if (syncDate >= today) {
                return syncDate.toLocaleString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                });
              } else if (syncDate >= yesterday) {
                return `Yesterday ${syncDate.toLocaleString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}`;
              } else {
                return syncDate.toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric'
                });
              }
            })() : 'Never'}
          </p>
        )}
      </div>

      {/* Main Content Container */}
      <div className="max-w-3xl mx-auto w-full px-4">
        {/* Deck Info */}
        <div className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">{deck.name}</h1>
            <p className="text-neutral-400">{deck.description}</p>
          </div>

          {/* Only show stats for free decks */}
          {!isPaidDeck && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-neutral-800/50 rounded-lg p-4 flex flex-col">
                <span className="text-neutral-500 text-sm">New</span>
                <span className="text-2xl font-bold mt-1">{cards.length}</span>
              </div>
              <div className="bg-neutral-800/50 rounded-lg p-4 flex flex-col">
                <span className="text-neutral-500 text-sm">Review</span>
                <span className="text-2xl font-bold mt-1">0</span>
              </div>
              <div className="bg-neutral-800/50 rounded-lg p-4 flex flex-col">
                <span className="text-neutral-500 text-sm">Due</span>
                <span className="text-2xl font-bold mt-1">0</span>
              </div>
            </div>
          )}
        </div>

        {/* Cards List */}
        <div className="flex-1 mt-8">
          <h2 className="text-xl font-semibold mb-4">Cards ({cards.length})</h2>
          {(!isPaidDeck || (isPaidDeck && hasPurchased)) ? (
            <div className="flex flex-col gap-2">
              {cards.map((card, index) => (
                <div 
                  key={`${card.id || 'card'}-${index}`}
                  className="px-4 py-3 bg-neutral-800/50 rounded-lg flex gap-4 min-h-[3.5rem]"
                >
                  {card.front_image_cid && (
                    <img 
                      src={`https://public.w3ipfs.storage/ipfs/${card.front_image_cid}`}
                      alt="Front" 
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  )}

                  <div className="flex-1 flex flex-col justify-center">
                    <p className="font-medium leading-snug line-clamp-1">{card.front}</p>
                    <p className="text-neutral-400 leading-snug line-clamp-1">{card.back}</p>
                  </div>

                  {card.audio_tts_cid && (
                    <button 
                      className="pr-4 hover:text-neutral-200 transition-colors self-center flex-shrink-0"
                      onClick={() => {
                        if (card.audio_tts_cid) {
                          const audio = new Audio(`https://public.w3ipfs.storage/ipfs/${card.audio_tts_cid}`);
                          audio.play();
                        }
                      }}
                      title="Play audio"
                    >
                      <Play size={20} weight="fill" className="text-neutral-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-neutral-400 py-8">
              Purchase this deck to access the flashcards
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="sticky bottom-0 p-4 bg-neutral-900 border-t border-neutral-800">
        <div className="max-w-3xl mx-auto w-full px-4">
          {isPaidDeck && !hasPurchased ? (
            <Button 
              variant="secondary"
              className="w-full py-6 bg-blue-500 hover:bg-blue-600 text-white"
              onClick={handlePurchase}
            >
              Purchase ({deck.price} ETH)
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="w-full py-6 bg-blue-500 hover:bg-blue-600 text-white"
              onClick={() => navigate(`/study/${deck.id}`)}
            >
              Study
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}; 