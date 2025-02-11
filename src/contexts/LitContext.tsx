import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import type { ILitNodeClient } from '@lit-protocol/types';
import { useAuthContext } from './AuthContext';
import { LIT_NETWORKS } from '@lit-protocol/constants';

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
  const { isConnected: isWalletConnected } = useAuthContext();

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

      if (!clientRef.current.ready) {
        await clientRef.current.connect();
      }

      setIsConnected(true);
      setIsInitialized(true);
      console.log('Connected to Lit Protocol');
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
    } else if (!isWalletConnected && isConnected) {
      // Disconnect logic
    }
  }, [isWalletConnected, isConnected]);

  return (
    <LitContext.Provider
      value={{
        client: clientRef.current,
        isConnected,
        isInitialized,
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