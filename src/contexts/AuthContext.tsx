import { createContext, useContext, useState, useEffect } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { toast } from 'sonner';
import { db } from '@/db/orbis';
import { initStorageSession, clearStorageSession } from '@/services/storage/orbis';
import { IDBStorage } from '@/services/storage/idb';

interface AuthContextType {
  isAuthenticated: boolean;
  isInitializing: boolean;
  isCeramicConnected: boolean;
  userAddress: string | null;
  disconnect: () => Promise<void>;
}

const AUTH_KEY = 'auth-state';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCeramicConnected, setIsCeramicConnected] = useState(false);
  const appKitAccount = useAppKitAccount();
  const { address: userAddress, isConnected } = appKitAccount;

  // Log state changes
  useEffect(() => {
    console.log('[AuthContext] State changed:', {
      isInitializing,
      isCeramicConnected,
      userAddress,
      isConnected,
      appKitAccount: {
        ...appKitAccount,
        address: userAddress,
        isConnected,
      }
    });
  }, [isInitializing, isCeramicConnected, userAddress, isConnected, appKitAccount]);

  // Initialize Orbis session when wallet connects
  useEffect(() => {
    const initOrbisSession = async () => {
      if (!isConnected || !userAddress) {
        console.log('[AuthContext] No wallet connection, skipping Orbis init');
        setIsCeramicConnected(false);
        return;
      }

      try {
        console.log('[AuthContext] Checking Orbis connection...');
        
        // Only check if we're already connected, don't try to initialize
        const isAlreadyConnected = await db.isUserConnected();
        console.log('[AuthContext] Orbis connection check:', { isAlreadyConnected });
        
        if (isAlreadyConnected) {
          console.log('[AuthContext] Already connected to Orbis');
          setIsCeramicConnected(true);
        } else {
          setIsCeramicConnected(false);
        }
      } catch (error) {
        console.error('[AuthContext] Failed to check Orbis connection:', error);
        setIsCeramicConnected(false);
      } finally {
        setIsInitializing(false);
      }
    };

    console.log('[AuthContext] Wallet connection changed, checking connection...');
    initOrbisSession();
  }, [isConnected, userAddress]);

  // Load persisted auth state
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        console.log('Loading persisted auth state...');
        const storage = await IDBStorage.getInstance();
        const authState = await storage.getAuthState(AUTH_KEY);
        
        if (authState) {
          console.log('Found persisted auth state:', authState);
          
          // Only check connection status, don't initialize
          if (authState.address === userAddress) {
            const isConnected = await db.isUserConnected();
            setIsCeramicConnected(isConnected);
          }
        } else {
          console.log('No persisted auth state found');
        }
      } catch (error) {
        console.error('Failed to load auth state:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    loadAuthState();
  }, [userAddress]);

  // Save auth state when it changes
  useEffect(() => {
    const saveAuthState = async () => {
      try {
        console.log('Saving auth state...');
        const storage = await IDBStorage.getInstance();
        
        if (isConnected && userAddress) {
          const timestamp = Date.now();
          console.log('Saving auth state:', { address: userAddress, timestamp });
          await storage.setAuthState(AUTH_KEY, userAddress, timestamp);
          console.log('Auth state saved successfully');
        } else if (!isConnected && !userAddress) {
          console.log('Clearing auth state...');
          await storage.clearAuthState(AUTH_KEY);
          console.log('Auth state cleared successfully');
        }
      } catch (error) {
        console.error('Failed to save auth state:', error);
      }
    };

    saveAuthState();
  }, [isConnected, userAddress]);

  const disconnect = async () => {
    try {
      // Clear Orbis storage session
      await clearStorageSession();
      setIsCeramicConnected(false);
      
      // Clear persisted auth state
      const storage = await IDBStorage.getInstance();
      await storage.clearAuthState(AUTH_KEY);
      
      toast.success('Disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast.error('Failed to disconnect properly');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: isConnected && isCeramicConnected,
        isInitializing,
        isCeramicConnected,
        userAddress: userAddress?.toString() || null,
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