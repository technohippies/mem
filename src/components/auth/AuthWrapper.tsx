import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { Button } from '@/components/ui/button/Button';
import { OrbisEVMAuth } from "@useorbis/db-sdk/auth";
import { db } from '@/db/orbis';

// Add routes that require Ceramic auth ONLY for syncing
const SYNC_REQUIRED_ROUTES = [
  '/study/',
  '/deck/',
];

export const AuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitializing, isCeramicConnected } = useAuth();
  const location = useLocation();
  const appKit = useAppKit();
  const { isConnected, address } = useAppKitAccount();

  const requiresSync = SYNC_REQUIRED_ROUTES.some(route => 
    location.pathname.includes(route)
  );

  // Log state changes
  useEffect(() => {
    console.log('[AuthWrapper] State changed:', {
      isAuthenticated,
      isInitializing,
      isCeramicConnected,
      pathname: location.pathname,
      requiresSync,
      appKitMethods: Object.keys(appKit || {}),
      appKitOpen: typeof appKit?.open,
      walletConnected: isConnected,
      walletAddress: address,
    });
  }, [isAuthenticated, isInitializing, isCeramicConnected, location.pathname, requiresSync, appKit, isConnected, address]);

  const handleConnect = async (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('[AuthWrapper] Connect button clicked');
    
    if (!appKit?.open) {
      console.error('[AuthWrapper] AppKit open method not available!');
      return;
    }

    try {
      console.log('[AuthWrapper] Opening AppKit...');
      await appKit.open();
      console.log('[AuthWrapper] AppKit opened successfully');
    } catch (error) {
      console.error('[AuthWrapper] Failed to open AppKit:', error);
    }
  };

  const handleCeramicConnect = async (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('[AuthWrapper] Ceramic connect button clicked');

    try {
      if (!window.ethereum) {
        throw new Error('No Ethereum provider found');
      }

      console.log('[AuthWrapper] Creating Orbis auth instance...');
      const auth = new OrbisEVMAuth(window.ethereum);
      
      console.log('[AuthWrapper] Connecting to Orbis...');
      const result = await db.connectUser({ auth });
      console.log('[AuthWrapper] Orbis connection result:', result);

      const isConnected = await db.isUserConnected();
      if (!isConnected) {
        throw new Error('Failed to connect to Orbis after auth');
      }

      console.log('[AuthWrapper] Successfully connected to Ceramic');
    } catch (error) {
      console.error('[AuthWrapper] Failed to connect to Ceramic:', error);
    }
  };

  if (isInitializing) {
    console.log('[AuthWrapper] Still initializing...');
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center mt-32">
          <div className="animate-pulse text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  // Always render children - auth is only needed for syncing
  return <>{children}</>;
}; 