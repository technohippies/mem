import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from '@/components/pages/HomePage';
import { DeckPage } from '@/components/pages/DeckPage';
import { StudyPage } from '@/components/pages/StudyPage';
import { ConnectPage } from '@/components/pages/ConnectPage';
import { Toaster } from './components/ui/toast/Toaster';
import { AuthProvider } from './contexts/AuthContext';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { optimism } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/core/Header';
import { initSilk } from '@silk-wallet/silk-wallet-sdk';
import { createConnector } from 'wagmi';
import type { ProviderRpcError } from 'viem';
import { toast } from 'sonner';

const queryClient = new QueryClient();

// Initialize Silk with retry logic
const initializeSilk = async () => {
  const RETRY_ATTEMPTS = 3;
  const TIMEOUT_MS = 5000;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Silk initialization timed out')), TIMEOUT_MS);
      });

      const silkPromise = initSilk({
        config: {
          appName: 'Anki Farcaster',
          darkMode: true,
        }
      });

      const silk = await Promise.race([silkPromise, timeoutPromise]);
      console.log('Silk initialized successfully');
      return silk;
    } catch (error) {
      console.error(`Silk initialization attempt ${attempt} failed:`, error);
      if (attempt === RETRY_ATTEMPTS) {
        toast.error('Failed to initialize Silk wallet. Please refresh the page.');
        throw error;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Failed to initialize Silk');
};

// Initialize Silk
const silk = await initializeSilk();

const wagmiConfig = createConfig({
  chains: [optimism],
  connectors: [
    createConnector((config) => ({
      name: 'silk',
      id: 'silk',
      type: 'silk',
      provider: silk,
      connect: async () => {
        try {
          const loginPromise = silk.login();
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Login timed out')), 10000);
          });

          await Promise.race([loginPromise, timeoutPromise]);
          const accounts = await silk.request({ method: 'eth_requestAccounts' }) as `0x${string}`[];
          return { accounts, chainId: optimism.id };
        } catch (error) {
          console.error('Silk connect error:', error);
          toast.error('Failed to connect to Silk wallet. Please try again.');
          throw error;
        }
      },
      disconnect: async () => {
        // Silk doesn't have a disconnect method
      },
      getAccounts: async () => {
        try {
          return silk.request({ method: 'eth_accounts' }) as Promise<readonly `0x${string}`[]>;
        } catch (error) {
          console.error('Failed to get accounts:', error);
          return [];
        }
      },
      getChainId: async () => {
        return optimism.id;
      },
      isAuthorized: async () => {
        try {
          const accounts = await silk.request({ method: 'eth_accounts' }) as `0x${string}`[];
          return accounts.length > 0;
        } catch {
          return false;
        }
      },
      getProvider: async () => Promise.resolve(silk),
      onAccountsChanged: (accounts) => {
        config.emitter.emit('change', { accounts: accounts as readonly `0x${string}`[] });
      },
      onChainChanged: (chainId) => {
        const id = Number(chainId);
        config.emitter.emit('change', { chainId: id });
      },
      onDisconnect: (error: ProviderRpcError) => {
        config.emitter.emit('disconnect');
      },
    }))
  ],
  transports: {
    [optimism.id]: http('https://mainnet.optimism.io'),
  },
});

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/decks/:stream_id" element={<DeckPage />} />
                  <Route path="/study/:stream_id" element={<StudyPage />} />
                  <Route path="/connect" element={<ConnectPage />} />
                </Routes>
              </main>
            </div>
            <Toaster />
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App; 