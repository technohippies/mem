import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button/Button';
import type { Deck, Flashcard } from '@/types/models';
import { IDBStorage } from '@/services/storage/idb';
import { Loader } from '@/components/ui/loader/Loader';
import { CaretLeft, Play } from '@phosphor-icons/react';
import { IconButton } from '@/components/ui/button/IconButton';
import { useTableland } from '@/contexts/TablelandContext';
import { tablelandToAppDeck, tablelandToAppFlashcard } from '@/types/tableland';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';

const getDeckByStreamId = async (streamId: string, tablelandClient: any): Promise<Deck> => {
  console.log('[DeckPage] Fetching deck:', streamId);
  
  // First try to get deck from IDB
  const storage = await IDBStorage.getInstance();
  const decks = await storage.getAllDecks();
  const localDeck = decks.find(d => d.id === streamId);
  
  if (localDeck) {
    console.log('[DeckPage] Found deck in IDB:', localDeck);
    return localDeck;
  }
  
  // If not in IDB, fetch from Tableland
  console.log('[DeckPage] Deck not found in IDB, fetching from Tableland');
  try {
    const tablelandDeck = await tablelandClient.getDeck(parseInt(streamId));
    if (!tablelandDeck) {
      throw new Error('Deck not found');
    }

    const deck = tablelandToAppDeck(tablelandDeck);
    console.log('[DeckPage] Fetched deck from Tableland:', deck);
    
    return deck;
  } catch (error) {
    console.error('[DeckPage] Failed to fetch from Tableland:', error);
    // If we're offline and don't have the deck, we can't proceed
    throw new Error('Deck not found and offline');
  }
};

const getFlashcards = async (deckId: string, tablelandClient: any): Promise<Flashcard[]> => {
  console.log('[DeckPage] Fetching cards for deck:', deckId);
  
  try {
    // Always try Tableland first to ensure we have the latest data
    console.log('[DeckPage] Fetching from Tableland...');
    const tablelandCards = await tablelandClient.getFlashcards(parseInt(deckId));
    console.log('[DeckPage] Raw Tableland cards:', JSON.stringify(tablelandCards, null, 2));
    
    if (!Array.isArray(tablelandCards) || tablelandCards.length === 0) {
      throw new Error('No cards found in Tableland');
    }

    // Convert to app format
    const cards = tablelandCards.map((card, index) => {
      const mappedCard = tablelandToAppFlashcard({
        ...card,
        id: card.id || index + 1, // Ensure we have an ID
        deck_id: parseInt(deckId) // Ensure we have the correct deck ID
      });
      console.log(`[DeckPage] Mapped card ${index + 1}/${tablelandCards.length}:`, mappedCard);
      return mappedCard;
    });
    
    // Store in IDB for offline access
    const storage = await IDBStorage.getInstance();
    console.log('[DeckPage] Storing cards in IDB:', cards.length);
    
    // Store each card individually and wait for all operations to complete
    const storePromises = cards.map(async (card: Flashcard) => {
      try {
        console.log(`[DeckPage] Storing card ${card.id} in IDB`);
        await storage.storeCard(card);
        console.log(`[DeckPage] Successfully stored card ${card.id}`);
      } catch (err) {
        console.error(`[DeckPage] Failed to store card ${card.id}:`, err);
      }
    });
    
    await Promise.all(storePromises);
    console.log('[DeckPage] All cards stored in IDB');
    
    // Verify storage
    const storedCards = await storage.getCardsForDeck(deckId);
    console.log('[DeckPage] Verified stored cards:', storedCards.length);
    
    return cards;
  } catch (error) {
    console.error('[DeckPage] Failed to fetch from Tableland:', error);
    
    // If Tableland fetch fails, try to get from IDB
    const storage = await IDBStorage.getInstance();
    const localCards = await storage.getCardsForDeck(deckId);
    
    if (localCards.length > 0) {
      console.log('[DeckPage] Using cards from IDB:', localCards.length);
      return localCards;
    }
    
    console.warn('[DeckPage] No cards found in IDB either');
    return [];
  }
};

// Add helper function for IPFS URL conversion
const getIpfsUrl = (cid: string) => {
  if (!cid) return '';
  return `https://public.w3ipfs.storage/ipfs/${cid}`;
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
  const { client: tablelandClient } = useTableland();

  useEffect(() => {
    const loadDeck = async () => {
      try {
        if (!stream_id) throw new Error('No deck stream_id provided');
        const deckData = await getDeckByStreamId(stream_id, tablelandClient);
        console.log('[DeckPage] Loaded deck data:', deckData);
        console.log('[DeckPage] Sync status:', {
          last_sync: deckData.last_sync,
          formatted: deckData.last_sync 
            ? (() => {
                const syncDate = new Date(deckData.last_sync);
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
              })()
            : 'Never'
        });
        setDeck(deckData);
        const cardsData = await getFlashcards(stream_id, tablelandClient);
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
  }, [stream_id, tablelandClient]);

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
        <div className="flex-1 mt-8">
          <h2 className="text-xl font-semibold mb-4">Cards ({cards.length})</h2>
          <div className="flex flex-col gap-2">
            {loading ? (
              // Skeleton loading state
              Array.from({ length: 3 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="p-4 bg-neutral-800/50 rounded-lg flex gap-4 min-h-[4rem]">
                  <div className="flex-1 flex flex-col justify-center gap-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))
            ) : (
              cards.map((card, index) => (
                <div 
                  key={`${card.id || 'card'}-${index}`}
                  className="px-4 py-3 bg-neutral-800/50 rounded-lg flex gap-4 min-h-[3.5rem]"
                >
                  {/* Image (only if exists) */}
                  {card.front_image_cid && (
                    <img 
                      src={getIpfsUrl(card.front_image_cid)} 
                      alt="Front" 
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  )}

                  {/* Text Content */}
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="font-medium leading-snug line-clamp-1">{card.front}</p>
                    <p className="text-neutral-400 leading-snug line-clamp-1">{card.back}</p>
                  </div>

                  {/* Audio Button */}
                  {card.audio_tts_cid && (
                    <button 
                      className="pr-4 hover:text-neutral-200 transition-colors self-center flex-shrink-0"
                      onClick={() => {
                        if (card.audio_tts_cid) {
                          const audio = new Audio(getIpfsUrl(card.audio_tts_cid));
                          audio.play();
                        }
                      }}
                      title="Play audio"
                    >
                      <Play size={20} weight="fill" className="text-neutral-400" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Study Button */}
      <div className="sticky bottom-0 p-4 bg-neutral-900 border-t border-neutral-800">
        <div className="max-w-3xl mx-auto w-full px-4">
          <Button 
            variant="secondary"
            className="w-full py-6 bg-blue-500 hover:bg-blue-600 text-white"
            onClick={async () => {
              if (!deck || cards.length === 0) {
                console.warn('[DeckPage] Cannot start study: no deck or cards');
                return;
              }

              try {
                const storage = await IDBStorage.getInstance();
                console.log('[DeckPage] Preparing to store deck and cards:', {
                  deckId: deck.id,
                  cardCount: cards.length
                });
                
                // Store deck
                await storage.storeDeck(deck);
                console.log('[DeckPage] Deck stored successfully');
                
                // Store cards with verification
                console.log('[DeckPage] Storing cards:', cards);
                for (const card of cards) {
                  const cardToStore = {
                    ...card,
                    id: card.id.toString(),
                    deck_id: deck.id.toString()
                  };
                  await storage.storeCard(cardToStore);
                  console.log(`[DeckPage] Stored card: ${cardToStore.id}`);
                }
                
                // Verify storage
                const storedCards = await storage.getCardsForDeck(deck.id);
                console.log('[DeckPage] Verified stored cards:', {
                  expected: cards.length,
                  actual: storedCards.length
                });
                
                if (storedCards.length !== cards.length) {
                  throw new Error(`Storage verification failed: expected ${cards.length} cards but found ${storedCards.length}`);
                }
                
                console.log('[DeckPage] Successfully stored deck and cards in IDB');
                navigate(`/study/${deck.id}${hasStudiedToday ? '?mode=extra' : ''}`);
              } catch (error) {
                console.error('[DeckPage] Failed to store deck/cards:', error);
                // TODO: Show error toast to user
              }
            }}
          >
            {hasUnfinishedSession ? 'Continue Studying' : hasStudiedToday ? 'Study Again' : 'Study'}
          </Button>
        </div>
      </div>
    </div>
  );
}; 