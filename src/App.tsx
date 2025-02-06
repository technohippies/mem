import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppContent from './AppContent';
import { createAppKit, useAppKitProvider } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, optimism } from '@reown/appkit/networks';
import { AuthProvider } from './contexts/AuthContext';

// Initialize AppKit
createAppKit({
  adapters: [
    new WagmiAdapter({
      networks: [mainnet, optimism],
      projectId: 'anki-farcaster'
    })
  ],
  projectId: 'anki-farcaster',
  networks: [mainnet, optimism],
  metadata: {
    name: 'Mem',
    description: 'Spaced repetition learning with Farcaster',
    url: window.location.origin,
    icons: []
  },
  // Featured wallets (MetaMask and Trust Wallet)
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    'joyid', // JoyID
  ],
  // Enable WalletConnect QR code
  enableWalletConnect: true,
  // Show all wallets button only on mobile
  allWallets: 'ONLY_MOBILE',
  // Customize connection methods order
  features: {
    analytics: true,
    connectMethodsOrder: ['wallet', 'social'],
    // Disable onramp and swaps since we don't need them
    onramp: false,
    swaps: false
  }
});

const App: React.FC = () => {
  useAppKitProvider('eip155');

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App; 