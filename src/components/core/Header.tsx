import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button/Button';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export function Header() {
  const { isConnected, authType, silkAddress, disconnect } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (silkAddress) {
      console.log('Connected Silk wallet address:', silkAddress);
    }
  }, [silkAddress]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Button variant="ghost" onClick={() => navigate('/')}>
            Anki Farcaster
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {isConnected ? (
            <div className="flex items-center gap-4">
              {authType === 'silk' && silkAddress && (
                <span 
                  className="text-sm text-gray-500 cursor-help"
                  title={silkAddress}
                >
                  {silkAddress.slice(0, 6)}...{silkAddress.slice(-4)}
                </span>
              )}
              <Button variant="outline" onClick={disconnect}>
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={() => navigate('/connect')}>
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  );
} 