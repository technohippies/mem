import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { createConfig, http, WagmiProvider } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Initialize wagmi config
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

const metadata = {
  name: 'Anki Farcaster',
  description: 'Spaced repetition learning on Farcaster',
  url: 'https://anki.farcaster.xyz', // TODO: Update with actual URL
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  },
  ssr: false
});

createWeb3Modal({
  wagmiConfig: config,
  projectId,
  themeMode: 'light',
  themeVariables: {
    '--w3m-font-family': 'Inter, sans-serif',
    '--w3m-accent': '#3b82f6'
  }
});

// Create a client
const queryClient = new QueryClient();

interface AuthContextType {
  isConnected: boolean;
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isConnected: false,
  address: null,
  connect: async () => {},
  disconnect: async () => {}
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  // TODO: Add connection state management
  const connect = async () => {
    // This will be handled by Web3Modal
  };

  const disconnect = async () => {
    // This will be handled by Web3Modal
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={{ isConnected, address, connect, disconnect }}>
          {children}
        </AuthContext.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 