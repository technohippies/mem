import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button/Button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function ConnectPage() {
  const navigate = useNavigate();
  const { isConnected, connectWithFarcaster, connectWithSilk } = useAuth();

  const handleFarcasterConnect = async () => {
    try {
      await connectWithFarcaster();
      navigate('/');
    } catch (error) {
      console.error('Failed to connect:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect with Farcaster');
    }
  };

  const handleSilkConnect = async () => {
    try {
      await connectWithSilk();
      navigate('/');
    } catch (error) {
      console.error('Failed to connect:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect with Silk');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
        <p className="text-gray-600 mb-8">
          Connect your wallet to sync your progress across devices and back up your data to the cloud.
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-md">
        {isConnected ? (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center mb-4">
              <p className="text-green-700">Wallet connected successfully!</p>
            </div>
            <Button onClick={() => navigate('/')}>
              Go to Home
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleFarcasterConnect}>
              Connect with Farcaster
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button 
              variant="outline"
              onClick={handleSilkConnect}
            >
              Connect with Silk
            </Button>
          </>
        )}
      </div>
    </div>
  );
} 