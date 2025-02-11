import { createContext, useContext, useEffect, useState } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { IDBStorage } from '@/services/storage/idb';
import { db } from '@/db/orbis';
import { OrbisEVMAuth } from "@useorbis/db-sdk/auth";
import type { IEVMProvider } from "@useorbis/db-sdk";

const AUTH_KEY = 'auth_state';

interface AuthState {
  isConnected: boolean;
  userAddress: string | null;
  isInitializing: boolean;
  isCeramicConnected: boolean;
}

interface AuthContextValue extends AuthState {
  connect: (address?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  connectCeramic: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isConnected: false,
    userAddress: null,
    isInitializing: true,
    isCeramicConnected: false
  });

  const appKit = useAppKit();
  const { isConnected: isWalletConnected, address } = useAppKitAccount();

  // Initialize auth state from storage
  useEffect(() => {
    let mounted = true;
    
    async function init() {
      try {
        if (mounted) {
          setState(current => ({
            ...current,
            isInitializing: false,
            isConnected: isWalletConnected,
            userAddress: address?.toLowerCase() || null,
            isCeramicConnected: false // Reset on init
          }));
        }
      } catch (error) {
        console.error('[Auth] Initialization failed:', error);
        if (mounted) {
          setState(current => ({ 
            ...current, 
            isInitializing: false
          }));
        }
      }
    }

    init();
    return () => { mounted = false; };
  }, [isWalletConnected, address]);

  // Handle wallet connection changes
  useEffect(() => {
    if (state.isInitializing) return;

    setState(current => ({
      ...current,
      isConnected: isWalletConnected,
      userAddress: address?.toLowerCase() || null
    }));
  }, [isWalletConnected, address, state.isInitializing]);

  // Persist auth state changes
  useEffect(() => {
    if (state.isInitializing) return;

    const persist = async () => {
      try {
        const storage = await IDBStorage.getInstance();
        if (state.isConnected && state.userAddress) {
          await storage.setAuthState(AUTH_KEY, {
            address: state.userAddress,
            lastAuthenticated: new Date().toISOString()
          });
        } else {
          await storage.clearAuthState(AUTH_KEY);
        }
      } catch (error) {
        console.error('[Auth] Failed to persist state:', error);
      }
    };

    persist();
  }, [state.isConnected, state.userAddress, state.isInitializing]);

  const connect = async (address?: string) => {
    try {
      if (!isWalletConnected) {
        await appKit?.open();
      }
      
      if (address) {
        setState(current => ({
          ...current,
          isConnected: true,
          userAddress: address.toLowerCase()
        }));
      }
    } catch (error) {
      console.error('[Auth] Connection failed:', error);
      throw error;
    }
  };

  const connectCeramic = async () => {
    if (!window.ethereum || !state.userAddress) {
      throw new Error('No wallet connection available');
    }

    try {
      const provider = window.ethereum as unknown as IEVMProvider;
      const auth = new OrbisEVMAuth(provider);
      
      const authResult = await db.connectUser({ auth });
      const isConnected = await db.isUserConnected();
      
      if (isConnected) {
        // Store the DID in auth state
        const storage = await IDBStorage.getInstance();
        await storage.setAuthState(AUTH_KEY, {
          address: state.userAddress,
          did: authResult.user.did,
          lastAuthenticated: new Date().toISOString()
        });
        
        setState(current => ({
          ...current,
          isCeramicConnected: true
        }));
        return;
      }
      
      throw new Error('Failed to connect to Ceramic');
    } catch (error) {
      console.error('[Auth] Ceramic connection error:', error);
      throw error;
    }
  };

  const disconnect = async () => {
    try {
      // Clear storage
      const storage = await IDBStorage.getInstance();
      await storage.clearAuthState(AUTH_KEY);

      // Reset state
      setState({
        isConnected: false,
        userAddress: null,
        isInitializing: false,
        isCeramicConnected: false
      });
    } catch (error) {
      console.error('[Auth] Disconnect failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      connect,
      disconnect,
      connectCeramic
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}