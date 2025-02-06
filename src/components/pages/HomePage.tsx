import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button/Button';
import { db, CONTEXT_ID, DECK_MODEL, orbisToAppDeck, type OrbisDeck } from '@/db/orbis';
import type { Deck } from '@/types/models';
import { IDBStorage } from '@/services/storage/idb';
import { Loader } from '@/components/ui/loader/Loader';
import { Badge } from '@/components/ui/badge/Badge';
import { CloudSlash } from '@phosphor-icons/react';

const getAvailableDecks = async (): Promise<Deck[]> => {
  console.log('Fetching decks from OrbisDB...');
  try {
    const { rows } = await db
      .select()
      .from(DECK_MODEL)
      .where({ is_public: true })
      .context(CONTEXT_ID)
      .run();

    console.log('Got decks from OrbisDB:', rows);
    return rows.map(row => orbisToAppDeck(row as OrbisDeck));
  } catch (error) {
    console.error('Failed to fetch decks from OrbisDB:', error);
    if (!navigator.onLine) {
      return []; // Return empty array when offline
    }
    throw error; // Re-throw if online (might be a different error)
  }
};

const DeckCard = ({ deck, compact = false }: { deck: Deck; compact?: boolean }) => {
  const [cardStats, setCardStats] = useState({
    newCount: 0,
    reviewCount: 0,
    dueCount: 0,
  });

  useEffect(() => {
    const loadCardStats = async () => {
      // Only load stats for user's decks (compact=true)
      if (!compact) return;
      
      try {
        const storage = await IDBStorage.getInstance();
        const cards = await storage.getCardsForDeck(deck.id);
        const cardProgressPromises = cards.map(card => storage.getCardProgress(card.id, 'user'));
        const cardProgresses = await Promise.all(cardProgressPromises);
        const studiedToday = await storage.getCardsStudiedToday('user', deck.id);
        
        const newCards = cards.filter((_, index) => !cardProgresses[index]);
        const reviewCards = cards.filter(card => 
          studiedToday.includes(card.id)
        );
        const dueCards = cards.filter((card, index) => {
          const progress = cardProgresses[index];
          const isStudiedToday = studiedToday.includes(card.id);
          return progress && !isStudiedToday && progress.review_date && new Date(progress.review_date) <= new Date();
        });

        setCardStats({
          newCount: newCards.length,
          reviewCount: reviewCards.length,
          dueCount: dueCards.length,
        });
      } catch (err) {
        console.error('Failed to load card stats:', err);
      }
    };

    loadCardStats();
  }, [deck.id, compact]);

  return (
    <Link 
      key={deck.id} 
      to={`/decks/${deck.id}`}
      className="w-full"
    >
      <div className="w-full p-4 rounded-lg bg-neutral-600/40 hover:bg-neutral-500/40 border border-neutral-600 hover:border-neutral-500 shadow-sm hover:shadow-md transition-all flex gap-4 items-start cursor-pointer">
        {deck.image_hash && (
          <img 
            src={deck.image_hash} 
            alt={deck.name}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 flex flex-col gap-2 text-left">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-neutral-200">{deck.name}</span>
            {compact && (
              <div className="flex gap-2 text-sm items-center">
                <span className="text-blue-400">{cardStats.newCount}</span>
                <span className="text-neutral-400">{cardStats.reviewCount}</span>
                <span className="text-red-400">{cardStats.dueCount}</span>
              </div>
            )}
          </div>
          {!compact && deck.description && (
            <span className="text-sm text-neutral-400">{deck.description}</span>
          )}
        </div>
      </div>
    </Link>
  );
};

export const HomePage = () => {
  const [userDecks, setUserDecks] = useState<Deck[]>([]);
  const [availableDecks, setAvailableDecks] = useState<Deck[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Load user's local decks immediately
  useEffect(() => {
    const loadUserDecks = async () => {
      try {
        const storage = await IDBStorage.getInstance();
        const localDecks = await storage.getAllDecks();
        setUserDecks(localDecks);
        setInitialized(true);
        console.log('Local decks loaded:', localDecks.length);
      } catch (err) {
        console.error('Error loading local decks:', err);
        setInitialized(true);
      }
    };

    loadUserDecks();
  }, []);

  // Load available decks only after user decks are loaded
  useEffect(() => {
    if (!initialized) return;

    const loadAvailableDecks = async () => {
      setLoadingAvailable(true);
      setError(null);
      try {
        // Get available decks from Ceramic
        const ceramicDecks = await getAvailableDecks();
        
        // Create map of user decks for filtering
        const localDeckMap = new Map(userDecks.map(deck => [deck.id, deck]));
        
        // Filter out decks that exist in user's collection
        const newAvailableDecks = ceramicDecks.filter(deck => !localDeckMap.has(deck.id));
        
        setAvailableDecks(newAvailableDecks);
      } catch (err) {
        console.error('Error loading available decks:', err);
        if (navigator.onLine) {
          setError('Failed to load available decks');
        }
      } finally {
        setLoadingAvailable(false);
      }
    };

    loadAvailableDecks();
  }, [initialized, userDecks]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (initialized) {
        setLoadingAvailable(true); // This will trigger the other effect to reload
      }
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [initialized]);

  return (
    <div className="flex flex-col gap-8 p-4">
      {/* User's Decks - Always show immediately */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Your Decks</h2>
        {userDecks.length === 0 ? (
          <p className="text-neutral-400">You haven't added any decks yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {userDecks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} compact={true} />
            ))}
          </div>
        )}
      </section>

      {/* Available Decks - Show loader only for this section */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          Trending Decks
          {isOffline && (
            <Badge variant="secondary" className="gap-1">
              <CloudSlash weight="fill" size={14} />
              Offline
            </Badge>
          )}
        </h2>
        {loadingAvailable ? (
          <div className="flex items-center justify-center py-8">
            <Loader size={32} />
          </div>
        ) : error ? (
          <div className="text-neutral-400">
            <div className="flex items-center gap-2">
              <span>Failed to load available decks.</span>
              <Button onClick={() => setLoadingAvailable(true)} variant="ghost" size="sm">
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {availableDecks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} compact={false} />
            ))}
            {availableDecks.length === 0 && isOffline && (
              <p className="text-neutral-400">Connect to the internet to browse available decks.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}; 