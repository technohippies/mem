import { useState, useEffect, useCallback } from 'react';
import { IDBStorage } from '@/services/storage/idb';
import type { AuthState } from '@/types/auth';
import { db, initStorageSession } from '@/db/orbis';
import { OrbisEVMAuth } from "@useorbis/db-sdk/auth";
import type { IEVMProvider } from "@useorbis/db-sdk";

const AUTH_KEY = 'auth_state';

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isInitializing: true,
    isConnected: false,
    isCeramicConnected: false,
    userAddress: null
  });

  // Initialize auth state from storage
  useEffect(() => {
    let mounted = true;
    
    async function init() {
      try {
        const storage = await IDBStorage.getInstance();
        const persisted = await storage.getAuthState(AUTH_KEY);
        
        if (mounted && persisted) {
          console.log('[useAuth] Found persisted auth state:', persisted);
          
          setState(current => ({
            ...current,
            isInitializing: false,
            userAddress: persisted.address,
            isConnected: true
          }));

          if (persisted.address) {
            try {
              const isConnected = await db.isUserConnected();
              if (mounted && isConnected) {
                console.log('[useAuth] Found existing Ceramic connection');
                setState(current => ({
                  ...current,
                  isCeramicConnected: true
                }));
              }
            } catch (error) {
              console.error('[useAuth] Error checking Ceramic connection:', error);
            }
          }
        } else {
          console.log('[useAuth] No persisted auth state found');
          if (mounted) {
            setState(current => ({ ...current, isInitializing: false }));
          }
        }
      } catch (error) {
        console.error('[useAuth] Auth initialization failed:', error);
        if (mounted) {
          setState(current => ({ ...current, isInitializing: false }));
        }
      }
    }

    init();
    return () => { mounted = false; };
  }, []);

  // Persist auth state changes
  useEffect(() => {
    if (state.isInitializing) return;

    const persist = async () => {
      try {
        const storage = await IDBStorage.getInstance();
        if (state.isConnected && state.userAddress) {
          console.log('Persisting auth state:', { address: state.userAddress });
          await storage.setAuthState(AUTH_KEY, {
            address: state.userAddress,
            lastAuthenticated: new Date().toISOString()
          });
        } else if (!state.isConnected) {
          console.log('Clearing persisted auth state');
          await storage.clearAuthState(AUTH_KEY);
        }
      } catch (error) {
        console.error('Failed to persist auth state:', error);
      }
    };

    persist();
  }, [state.isConnected, state.userAddress, state.isInitializing]);

  const connect = useCallback(async (address: string) => {
    setState(current => ({
      ...current,
      isConnected: true,
      userAddress: address
    }));
  }, []);

  const connectCeramic = useCallback(async () => {
    console.log('[useAuth] connectCeramic called');
    console.log('[useAuth] Current state:', {
      userAddress: state.userAddress,
      hasEthereum: !!window.ethereum
    });

    if (!window.ethereum || !state.userAddress) {
      console.log('[useAuth] No ethereum or user address available');
      throw new Error('No wallet connection available');
    }

    try {
      console.log('[useAuth] Creating OrbisEVMAuth instance...');
      const provider = window.ethereum as unknown as IEVMProvider;
      const auth = new OrbisEVMAuth(provider);
      
      console.log('[useAuth] Connecting to Orbis...');
      const authResult = await db.connectUser({ auth });
      
      console.log('[useAuth] Checking connection status...');
      const isConnected = await db.isUserConnected();
      
      if (isConnected) {
        console.log('[useAuth] Successfully connected, initializing storage session...');
        await initStorageSession(authResult);
        
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
      console.error('[useAuth] Ceramic connection error:', error);
      throw error;
    }
  }, [state.userAddress]);

  const disconnect = useCallback(async () => {
    setState(current => ({
      ...current,
      isConnected: false,
      isCeramicConnected: false,
      userAddress: null
    }));
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    connectCeramic
  };
} 