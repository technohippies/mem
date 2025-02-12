import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppContent from './AppContent';
import { createAppKit, useAppKitProvider } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, optimism, baseSepolia } from '@reown/appkit/networks';
import { AuthProvider } from '@/contexts/AuthContext';
import { TablelandProvider } from '@/contexts/TablelandContext';
import { LitProvider } from '@/contexts/LitContext';

// Initialize AppKit
createAppKit({
  adapters: [
    new WagmiAdapter({
      networks: [mainnet, optimism, baseSepolia],
      projectId: 'anki-farcaster'
    })
  ],
  projectId: 'anki-farcaster',
  networks: [mainnet, optimism, baseSepolia],
  metadata: {
    name: 'Anki Farcaster',
    description: 'Decentralized flashcards on Base',
    url: window.location.origin,
    icons: ['https://anki.farcaster.xyz/icon.png']
  },
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    'joyid' // JoyID
  ],
  enableWalletConnect: true,
  allWallets: 'ONLY_MOBILE',
  features: {
    analytics: true,
    connectMethodsOrder: ['wallet', 'social'],
    onramp: false,
    swaps: false
  }
});

const App: React.FC = () => {
  useAppKitProvider('eip155');

  return (
    <BrowserRouter>
      <AuthProvider>
        <LitProvider>
          <TablelandProvider>
            <AppContent />
          </TablelandProvider>
        </LitProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App; 