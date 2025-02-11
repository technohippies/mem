import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { useAuthContext } from './AuthContext';

interface LitContextType {
  client: LitNodeClient | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const LitContext = createContext<LitContextType | null>(null);

export const useLit = () => {
  const context = useContext(LitContext);
  if (!context) {
    throw new Error('useLit must be used within a LitProvider');
  }
  return context;
};

export const LitProvider = ({ children }: { children: ReactNode }) => {
  const [client, setClient] = useState<LitNodeClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isConnected: isWalletConnected } = useAuthContext();

  const connect = async () => {
    try {
      if (!client) {
        const newClient = new LitNodeClient({
          litNetwork: "datil-test",
          debug: true,
        });
        await newClient.connect();
        setClient(newClient);
        setIsConnected(true);
        console.log('Connected to Lit Protocol');
      }
    } catch (error) {
      console.error('Failed to connect to Lit Protocol:', error);
      setIsConnected(false);
      throw error;
    }
  };

  const disconnect = async () => {
    try {
      if (client) {
        await client.disconnect();
        setClient(null);
        setIsConnected(false);
        console.log('Disconnected from Lit Protocol');
      }
    } catch (error) {
      console.error('Failed to disconnect from Lit Protocol:', error);
      throw error;
    }
  };

  // Connect/disconnect based on wallet connection
  useEffect(() => {
    if (isWalletConnected && !isConnected) {
      connect();
    } else if (!isWalletConnected && isConnected) {
      disconnect();
    }
  }, [isWalletConnected, isConnected]);

  return (
    <LitContext.Provider value={{ client, isConnected, connect, disconnect }}>
      {children}
    </LitContext.Provider>
  );
}; 