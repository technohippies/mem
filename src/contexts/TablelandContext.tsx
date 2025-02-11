import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { Database, Validator } from '@tableland/sdk';
import { ethers } from 'ethers';
import type { Eip1193Provider } from 'ethers';
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { TablelandClient } from '@/db/tableland';
import { useLit } from './LitContext';
import { useAppKitAccount } from '@reown/appkit/react';

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
  const { isConnected: isWalletConnected } = useAppKitAccount();
  const previousLitClientRef = useRef<typeof litClient | null>(null);
  const initializationAttemptRef = useRef(0);

  // Initialize Tableland connection
  useEffect(() => {
    const initTableland = async () => {
      try {
        console.log('[TablelandContext] Initializing Tableland...');
        // Initialize without requiring wallet connection
        const database = new Database();
        client.initializeDatabase(database);
        setIsInitialized(true);
        console.log('[TablelandContext] Tableland initialized successfully');

        // Only attempt wallet connection if connected
        if (isWalletConnected) {
          try {
            await client.connect();
            console.log('[TablelandContext] Wallet connected to Tableland');
          } catch (error) {
            console.error('[TablelandContext] Failed to connect wallet to Tableland:', error);
          }
        }
      } catch (error) {
        console.error('[TablelandContext] Failed to initialize Tableland:', error);
        setIsInitialized(false);
      }
    };

    if (!isInitialized) {
      initTableland();
    }
  }, [isWalletConnected, isInitialized, client]);

  // Handle Lit Protocol initialization and cleanup
  useEffect(() => {
    let mounted = true;

    const initLit = async () => {
      // Skip if already initialized or connecting
      if (isLitInitialized || isLitConnecting) {
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

        // If we have a client and it's ready, just mark as initialized
        if (litClient?.ready) {
          console.log('[TablelandContext] Lit client already ready');
          if (mounted) {
            client.setLitClient(litClient);
            setIsLitInitialized(true);
          }
          return;
        }

        // Skip if no client
        if (!litClient) {
          console.log('[TablelandContext] No Lit client available');
          return;
        }

        console.log('[TablelandContext] Initializing Lit client...');
        
        // Wait for client to be ready
        let attempts = 0;
        const maxAttempts = 10;
        while (!litClient.ready && attempts < maxAttempts) {
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
  }, [litClient, isLitConnected, isLitInitialized]);

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