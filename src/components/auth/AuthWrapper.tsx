import React, { useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';

// Add routes that require Ceramic auth ONLY for syncing
const SYNC_REQUIRED_ROUTES = [
  '/study/',
  '/deck/',
];

export const AuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isConnected, isInitializing } = useAuthContext();
  const location = useLocation();
  const appKit = useAppKit();
  const { isConnected: isWalletConnected, address } = useAppKitAccount();

  const requiresSync = SYNC_REQUIRED_ROUTES.some(route => 
    location.pathname.includes(route)
  );

  // Log state changes
  useEffect(() => {
    console.log('[AuthWrapper] State changed:', {
      isConnected,
      isInitializing,
      pathname: location.pathname,
      requiresSync,
      appKitMethods: Object.keys(appKit || {}),
      appKitOpen: typeof appKit?.open,
      walletConnected: isWalletConnected,
      walletAddress: address,
    });
  }, [isConnected, isInitializing, location.pathname, requiresSync, appKit, isWalletConnected, address]);

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