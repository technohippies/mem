import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { Database, Validator } from '@tableland/sdk';
import { ethers } from 'ethers';
import type { Eip1193Provider } from 'ethers';
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { TablelandClient } from '@/db/tableland';
import { useLit } from './LitContext';

interface TablelandContextType {
  client: TablelandClient;
  isInitialized: boolean;
  isLitInitialized: boolean;
  isLitConnecting: boolean;
  purchaseDeck: (deckId: string, price: number, creatorAddress: string) => Promise<void>;
}

const TablelandContext = createContext<TablelandContextType | null>(null);

export const useTableland = () => {
  const context = useContext(TablelandContext);
  if (!context) {
    throw new Error('useTableland must be used within a TablelandProvider');
  }
  return context;
};

interface TablelandProviderProps {
  children: ReactNode;
}

export const TablelandProvider = ({ children }: TablelandProviderProps) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLitInitialized, setIsLitInitialized] = useState(false);
  const [isLitConnecting, setIsLitConnecting] = useState(false);
  const client = useRef(new TablelandClient()).current;
  const { client: litClient, isConnected: isLitConnected } = useLit();
  const previousLitClientRef = useRef<typeof litClient | null>(null);
  const initializationAttemptRef = useRef(0);

  // Initialize Tableland connection
  useEffect(() => {
    const initTableland = async () => {
      try {
        console.log('[TablelandContext] Initializing Tableland...');
        await client.connect();
        setIsInitialized(true);
        console.log('[TablelandContext] Tableland initialized successfully');
      } catch (error) {
        console.error('[TablelandContext] Failed to initialize Tableland:', error);
        setIsInitialized(false);
      }
    };

    if (!isInitialized) {
      initTableland();
    }
  }, []);

  // Handle Lit Protocol initialization and cleanup
  useEffect(() => {
    let mounted = true;

    const initLit = async () => {
      // Prevent multiple simultaneous initialization attempts
      if (isLitConnecting) {
        return;
      }

      try {
        setIsLitConnecting(true);
        console.log('[TablelandContext] Lit Protocol status:', {
          hasClient: !!litClient,
          isConnected: isLitConnected,
          isReady: litClient?.ready,
          previousClient: !!previousLitClientRef.current,
          attempt: initializationAttemptRef.current
        });

        // If we're disconnected, clean up and try to reconnect
        if (!isLitConnected) {
          if (previousLitClientRef.current) {
            console.log('[TablelandContext] Cleaning up previous Lit client...');
            try {
              await previousLitClientRef.current.disconnect();
              LitJsSdk.disconnectWeb3();
            } catch (e) {
              console.warn('[TablelandContext] Error during Lit disconnect:', e);
            }
          }
          previousLitClientRef.current = null;
          if (mounted) {
            setIsLitInitialized(false);
            client.setLitClient(null);
          }
          
          // Only attempt reconnection a limited number of times
          if (initializationAttemptRef.current < 3) {
            initializationAttemptRef.current++;
            console.log('[TablelandContext] Attempting reconnection...');
            return;
          } else {
            console.log('[TablelandContext] Max reconnection attempts reached');
            return;
          }
        }

        // Reset attempt counter on successful connection
        initializationAttemptRef.current = 0;

        // Skip if no client or already initialized with this client
        if (!litClient || litClient === previousLitClientRef.current) {
          return;
        }

        console.log('[TablelandContext] New Lit client detected, initializing...');
        
        // Wait for client to be ready
        let attempts = 0;
        while (!litClient.ready && attempts < 5) {
          console.log('[TablelandContext] Waiting for Lit client to be ready...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }

        if (!litClient.ready) {
          console.error('[TablelandContext] Lit client failed to become ready');
          return;
        }

        // Update refs and state
        previousLitClientRef.current = litClient;
        if (mounted) {
          client.setLitClient(litClient);
          setIsLitInitialized(true);
          console.log('[TablelandContext] Lit Protocol integration initialized successfully');
        }
      } catch (error) {
        console.error('[TablelandContext] Failed to initialize Lit Protocol:', error);
        if (mounted) {
          setIsLitInitialized(false);
          client.setLitClient(null);
        }
      } finally {
        if (mounted) {
          setIsLitConnecting(false);
        }
      }
    };

    initLit();

    return () => {
      mounted = false;
    };
  }, [litClient, isLitConnected]);

  const purchaseDeck = async (deckId: string, price: number, creatorAddress: string) => {
    if (!isInitialized) {
      throw new Error('TablelandClient not initialized');
    }

    try {
      // 1. Get signer and connect to Tableland
      const provider = new ethers.BrowserProvider(window.ethereum as unknown as Eip1193Provider);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // 2. Send payment to creator
      const tx = await signer.sendTransaction({
        to: creatorAddress,
        value: ethers.parseEther((price/10000).toString())
      });
      await tx.wait();

      console.log('[TablelandContext] Purchase successful');
    } catch (error) {
      console.error('[TablelandContext] Purchase failed:', error);
      throw error;
    }
  };

  return (
    <TablelandContext.Provider value={{ 
      client, 
      isInitialized, 
      isLitInitialized,
      isLitConnecting,
      purchaseDeck 
    }}>
      {children}
    </TablelandContext.Provider>
  );
}; 