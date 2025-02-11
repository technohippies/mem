import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import type { ILitNodeClient } from '@lit-protocol/types';
import { useAppKitAccount } from '@reown/appkit/react';

interface LitContextType {
  client: ILitNodeClient | null;
  isConnected: boolean;
  isInitialized: boolean;
  connect: () => Promise<void>;
}

const LitContext = createContext<LitContextType | null>(null);

export const LitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const clientRef = useRef<ILitNodeClient | null>(null);
  const connectingRef = useRef(false);
  const { isConnected: isWalletConnected } = useAppKitAccount();

  const initClient = async () => {
    if (connectingRef.current) {
      console.log('[LitContext] Already connecting, skipping initialization');
      return;
    }

    try {
      connectingRef.current = true;
      console.log('[LitContext] Initializing Lit Protocol client...');
      
      if (!clientRef.current) {
        clientRef.current = new LitNodeClient({
          alertWhenUnauthorized: false,
          debug: true,
          litNetwork: "datil-test"
        });
      }

      // Connect if not ready
      if (!clientRef.current.ready) {
        console.log('[LitContext] Connecting to Lit Protocol...');
        await clientRef.current.connect();
        
        // Wait for client to be ready
        let attempts = 0;
        const maxAttempts = 10;
        while (!clientRef.current.ready && attempts < maxAttempts) {
          console.log('[LitContext] Waiting for client to be ready...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }

        if (!clientRef.current.ready) {
          throw new Error('Lit client failed to become ready');
        }
      }

      setIsConnected(true);
      setIsInitialized(true);
      console.log('[LitContext] Connected and ready');
    } catch (error) {
      console.error('[LitContext] Failed to initialize Lit Protocol:', error);
      setIsConnected(false);
      setIsInitialized(false);
      clientRef.current = null;
    } finally {
      connectingRef.current = false;
    }
  };

  useEffect(() => {
    // Only initialize if we haven't already
    if (!isInitialized && !connectingRef.current) {
      initClient();
    }

    // Cleanup function
    return () => {
      // Don't disconnect on cleanup - this causes the loop
      console.log('[LitContext] Component unmounting, preserving connection');
    };
  }, [isInitialized]);

  const connect = async () => {
    if (connectingRef.current) {
      console.log('[LitContext] Already connecting, skipping connection request');
      return;
    }

    try {
      await initClient();
    } catch (error) {
      console.error('[LitContext] Connection failed:', error);
      throw error;
    }
  };

  // Connect/disconnect based on wallet connection
  useEffect(() => {
    if (isWalletConnected && !isConnected) {
      connect();
    }
  }, [isWalletConnected, isConnected]);

  return (
    <LitContext.Provider
      value={{
        client: clientRef.current?.ready ? clientRef.current : null,
        isConnected: isConnected && !!clientRef.current?.ready,
        isInitialized: isInitialized && !!clientRef.current?.ready,
        connect
      }}
    >
      {children}
    </LitContext.Provider>
  );
};

export const useLit = () => {
  const context = useContext(LitContext);
  if (!context) {
    throw new Error('useLit must be used within a LitProvider');
  }
  return context;
}; 