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
    name: 'Anki Farcaster',
    description: 'Spaced repetition learning with Farcaster',
    url: window.location.origin,
    icons: []
  },
  features: {
    analytics: true
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