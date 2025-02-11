import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button/Button';
import type { Deck } from '@/types/models';
import { IDBStorage } from '@/services/storage/idb';
import { Loader } from '@/components/ui/loader/Loader';
import { Badge } from '@/components/ui/badge/Badge';
import { CloudSlash } from '@phosphor-icons/react';
import { useTableland } from '@/contexts/TablelandContext';
import { tablelandToAppDeck, type TablelandDeck } from '@/types/tableland';

const getAvailableDecks = async (tablelandClient: { getAllDecks: () => Promise<TablelandDeck[]> }): Promise<Deck[]> => {
  console.log('Fetching decks from Tableland...');
  try {
    const tablelandDecks = await tablelandClient.getAllDecks();
    console.log('Got decks from Tableland:', tablelandDecks);
    return tablelandDecks.map(tablelandToAppDeck);
  } catch (error) {
    console.error('Failed to fetch decks from Tableland:', error);
    if (!navigator.onLine) {
      return []; // Return empty array when offline
    }
    throw error; // Re-throw if online (might be a different error)
  }
};

const DeckCard = ({ deck }: { deck: Deck }) => {
  return (
    <Link 
      to={`/decks/${deck.id}`}
      className="relative flex flex-col justify-between p-4 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 transition-colors cursor-pointer"
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-lg">{deck.name}</h3>
          <span className="text-sm text-neutral-400">
            {deck.price > 0 ? `${deck.price/10000} ETH` : 'Free'}
          </span>
        </div>
        <p className="text-sm text-neutral-400 mb-4">{deck.description}</p>
      </div>
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <span>{deck.category}</span>
        <span>{deck.language.toUpperCase()}</span>
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
  const { client: tablelandClient } = useTableland();

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
        // Get available decks from Tableland
        const tablelandDecks = await getAvailableDecks(tablelandClient);
        
        // Create map of user decks for filtering
        const localDeckMap = new Map(userDecks.map(deck => [deck.id, deck]));
        
        // Filter out decks that exist in user's collection
        const newAvailableDecks = tablelandDecks.filter(deck => !localDeckMap.has(deck.id));
        
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
  }, [initialized, userDecks, tablelandClient]);

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
              <DeckCard key={deck.id} deck={deck} />
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
              <DeckCard key={deck.id} deck={deck} />
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