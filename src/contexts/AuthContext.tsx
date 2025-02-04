import { createContext, useContext, useState, useEffect } from 'react';
import { useAccount, useDisconnect, useConnect } from 'wagmi';
import { optimism } from 'wagmi/chains';
import { toast } from 'sonner';
import { db } from '@/db/orbis';
import { OrbisEVMAuth } from "@useorbis/db-sdk/auth";
import type { OrbisConnectResult } from "@useorbis/db-sdk";
import { initStorageSession, clearStorageSession } from '@/services/storage/orbis';
import { initDB } from '@/services/storage/idb';

type AuthType = 'farcaster' | 'silk' | null;

interface AuthContextType {
  isConnected: boolean;
  authType: AuthType;
  fid: number | null;
  silkAddress: string | null;
  connectWithFarcaster: () => Promise<void>;
  connectWithSilk: () => Promise<void>;
  disconnect: () => void;
}

declare global {
  interface Window {
    ethereum: any;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authType, setAuthType] = useState<AuthType>(null);
  const [fid, setFid] = useState<number | null>(null);
  
  // Use Wagmi hooks for wallet state
  const { address: silkAddress, isConnected } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const { connectAsync, connectors } = useConnect();

  // Initialize Orbis session when Silk wallet connects
  useEffect(() => {
    const initOrbisSession = async () => {
      if (isConnected && silkAddress && window.ethereum) {
        try {
          // Create Orbis auth instance
          const auth = new OrbisEVMAuth(window.ethereum);
          
          // Connect to Orbis
          const authResult = await db.connectUser({ auth });
          console.log('Orbis auth result:', authResult);
          
          if (authResult) {
            await initStorageSession();
            toast.success('Connected to Orbis storage');
          } else {
            console.error('Failed to connect to Orbis:', authResult);
            toast.error('Failed to connect to Orbis storage');
          }
        } catch (error) {
          console.error('Failed to initialize Orbis session:', error);
          toast.error('Failed to initialize storage session');
        }
      }
    };

    initOrbisSession();
  }, [isConnected, silkAddress]);

  // Load persisted auth state
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const db = await initDB();
        const authState = await db.get('auth', 'current');
        
        if (authState) {
          setAuthType(authState.type);
          setFid(authState.fid);
          
          // Re-initialize Orbis session if needed
          if (authState.type === 'silk' && silkAddress) {
            await initStorageSession();
          }
        }
      } catch (error) {
        console.error('Failed to load auth state:', error);
      }
    };

    loadAuthState();
  }, [silkAddress]);

  // Save auth state when it changes
  useEffect(() => {
    const saveAuthState = async () => {
      try {
        const db = await initDB();
        if (isConnected && silkAddress) {
          await db.put('auth', {
            type: 'silk',
            address: silkAddress,
            fid: null,
            timestamp: Date.now(),
          }, 'current');
        } else if (!isConnected && !silkAddress) {
          await db.delete('auth', 'current');
        }
      } catch (error) {
        console.error('Failed to save auth state:', error);
      }
    };

    saveAuthState();
  }, [isConnected, silkAddress]);

  const connectWithFarcaster = async () => {
    try {
      // TODO: Implement Farcaster sign-in
      setFid(1234); // Temporary mock FID
      
      // Initialize Orbis storage session
      await initStorageSession();
      
      setAuthType('farcaster');
      toast.success('Successfully connected with Farcaster');
    } catch (error) {
      console.error('Farcaster connection error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect with Farcaster');
    }
  };

  const connectWithSilk = async () => {
    try {
      const connector = connectors[0]; // Use the first connector (Silk)
      if (!connector) {
        throw new Error('No connector available');
      }

      // Connect using Wagmi
      await connectAsync({ 
        chainId: optimism.id,
        connector
      });
      
      setAuthType('silk');
      toast.success('Successfully connected with Silk');
    } catch (error) {
      console.error('Silk connection error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect with Silk');
    }
  };

  const disconnect = async () => {
    try {
      // Disconnect wallet
      await disconnectAsync();
      
      // Clear Orbis storage session
      await clearStorageSession();
      
      // Clear persisted auth state
      const db = await initDB();
      await db.delete('auth', 'current');
      
      setAuthType(null);
      setFid(null);
      toast.success('Disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast.error('Failed to disconnect properly');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isConnected: !!silkAddress,
        authType,
        fid,
        silkAddress: silkAddress?.toString() || null,
        connectWithFarcaster,
        connectWithSilk,
        disconnect,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}