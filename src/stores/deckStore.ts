import { create } from 'zustand'
import type { Deck, Flashcard } from '@/types/models'
import { IDBStorage } from '@/services/storage/idb'
import { TablelandClient } from '@/db/tableland'
import { tablelandToAppDeck, tablelandToAppFlashcard } from '@/types/tableland'
import { useTableland } from '@/contexts/TablelandContext'

export type LoadingState = 'initial' | 'loading' | 'ready' | 'error'

interface DeckState {
  // Core data
  deck: Deck | null
  cards: Flashcard[]
  
  // Loading states
  loadingState: LoadingState
  error: Error | null
  
  // Network & auth states
  isOffline: boolean
  isLoggedIn: boolean
  hasLocalData: boolean
  isPaidDeck: boolean
  hasPurchased: boolean
  isLitReady: boolean
  isTablelandReady: boolean
  
  // Actions
  loadDeck: (deckId: string, tablelandClient: TablelandClient) => Promise<void>
  checkLocalData: (deckId: string) => Promise<{ deck: Deck; cards: Flashcard[] } | null>
  initializeLit: () => Promise<void>
  purchaseDeck: (deckId: string) => Promise<void>
  refreshFromNetwork: (deckId: string, tablelandClient: TablelandClient) => Promise<void>
  setLitReady: (ready: boolean) => void
  setTablelandReady: (ready: boolean) => void
  clearError: () => void
}

export const useDeckStore = create<DeckState>((set, get) => ({
  // Initial state
  deck: null,
  cards: [],
  loadingState: 'initial',
  error: null,
  isOffline: !navigator.onLine,
  isLoggedIn: false,
  hasLocalData: false,
  isPaidDeck: false,
  hasPurchased: false,
  isLitReady: false,
  isTablelandReady: false,

  // Check local storage for deck data
  checkLocalData: async (deckId: string) => {
    try {
      const storage = await IDBStorage.getInstance()
      
      // Check for deck in IDB
      const decks = await storage.getAllDecks()
      const deck = decks.find(d => d.id === deckId)
      if (!deck) return null

      // If we found the deck, get its cards
      const cards = await storage.getCardsForDeck(deckId)
      if (cards.length === 0) return null

      return { deck, cards }
    } catch (error) {
      console.error('[DeckStore] Failed to check local data:', error)
      return null
    }
  },

  // Main loading function
  loadDeck: async (deckId: string, tablelandClient: TablelandClient) => {
    const { checkLocalData, refreshFromNetwork } = get()
    
    set({ loadingState: 'loading' })
    
    try {
      // First check local storage
      const localData = await checkLocalData(deckId)
      
      if (localData) {
        console.log('[DeckStore] Found local data:', {
          deck: localData.deck,
          cardCount: localData.cards.length
        })
        
        // Check purchase status for paid decks
        const isPaid = localData.deck.price > 0
        let hasPurchased = false
        
        if (isPaid) {
          console.log('[DeckStore] Checking purchase status for paid deck...')
          hasPurchased = await tablelandClient.hasPurchasedDeck(deckId)
          console.log('[DeckStore] Purchase status:', { hasPurchased })
        }
        
        // Set local data with purchase status
        set({ 
          deck: localData.deck,
          cards: localData.cards,
          hasLocalData: true,
          isPaidDeck: isPaid,
          hasPurchased,
          loadingState: 'ready'
        })

        // For paid decks, only refresh if Lit is ready
        if (isPaid) {
          const { isLitReady } = get()
          if (!isLitReady) {
            console.log('[DeckStore] Skipping network refresh - Lit not ready')
            return
          }
        }

        // If we're online, refresh in background
        if (navigator.onLine) {
          console.log('[DeckStore] Starting background refresh...')
          refreshFromNetwork(deckId, tablelandClient).catch(error => {
            console.error('[DeckStore] Background refresh failed:', error)
            // Don't set error state for background refresh failures
          })
        }
        return
      }

      // If no local data, load from network
      await refreshFromNetwork(deckId, tablelandClient)
      
    } catch (error) {
      console.error('[DeckStore] Failed to load deck:', error)
      set({ 
        error: error as Error,
        loadingState: 'error'
      })
    }
  },

  // Network refresh function
  refreshFromNetwork: async (deckId: string, tablelandClient: TablelandClient) => {
    try {
      console.log('[DeckStore] Refreshing from network:', deckId)
      
      // Load deck from Tableland
      const tablelandDeck = await tablelandClient.getDeck(parseInt(deckId))
      if (!tablelandDeck) {
        throw new Error('Deck not found')
      }

      // Check if paid and purchased
      const isPaid = tablelandDeck.price > 0
      const hasPurchased = isPaid ? 
        await tablelandClient.hasPurchasedDeck(deckId) : 
        false

      // Convert Tableland deck to app deck
      const deck = tablelandToAppDeck(tablelandDeck)

      // Update state with deck info
      set({
        deck,
        isPaidDeck: isPaid,
        hasPurchased,
        loadingState: 'ready'
      })

      // If it's a paid deck and not purchased, stop here
      if (isPaid && !hasPurchased) {
        return
      }

      // For paid decks, wait for Lit to be ready
      if (isPaid) {
        console.log('[DeckStore] Checking Lit readiness...')
        const { isLitReady } = get()
        
        if (!isLitReady) {
          console.error('[DeckStore] Lit Protocol not ready')
          set({ error: new Error('Encryption service not ready. Please try again.') })
          return
        }
      }

      // Load and store cards
      console.log('[DeckStore] Loading cards...')
      const tablelandCards = await tablelandClient.getFlashcards(parseInt(deckId))
      console.log('[DeckStore] Loaded cards:', tablelandCards.length)
      
      const cards = tablelandCards.map(tablelandToAppFlashcard)
      
      // Store everything locally
      const storage = await IDBStorage.getInstance()
      await storage.storeDeck(get().deck!)
      for (const card of cards) {
        await storage.storeCard(card)
      }

      set({ 
        cards,
        hasLocalData: true
      })

    } catch (error) {
      console.error('[DeckStore] Network refresh failed:', error)
      set({ 
        error: error as Error,
        loadingState: 'error'
      })
    }
  },

  // Lit Protocol state management
  setLitReady: (ready: boolean) => set({ isLitReady: ready }),
  
  // Tableland state management
  setTablelandReady: (ready: boolean) => set({ isTablelandReady: ready }),

  // Purchase flow
  purchaseDeck: async (deckId: string) => {
    set({ loadingState: 'loading' });
    
    try {
      const tableland = useTableland();
      await tableland.purchaseDeck(deckId, 0, ''); // Price and creator address will come from the deck query
      
      set({ 
        loadingState: 'ready',
        hasPurchased: true 
      });
      
      console.log('[DeckStore] Purchase successful');
    } catch (error) {
      console.error('[DeckStore] Purchase failed:', error);
      set({ 
        error: error as Error,
        loadingState: 'error'
      });
      throw error;
    }
  },

  // Initialize Lit Protocol
  initializeLit: async () => {
    // This will be handled by LitContext
    throw new Error('Not implemented')
  },

  // Error handling
  clearError: () => set({ error: null })
})) 