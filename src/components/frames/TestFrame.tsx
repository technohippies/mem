import { useEffect } from 'react';
import sdk from '@farcaster/frame-sdk';
import { Button } from '@/components/ui/button/Button';
import { Loader } from '@/components/ui/loader/Loader';

export function TestFrame() {
  useEffect(() => {
    const initFrame = async () => {
      try {
        // Signal to Warpcast that our frame is ready
        await sdk.actions.ready();
        console.log('Frame ready, context:', sdk.context);
      } catch (error) {
        console.error('Failed to initialize frame:', error);
      }
    };

    initFrame();
  }, []);

  return (
    <div className="w-[300px] mx-auto py-4 px-2">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-center">Mem</h1>
        <p className="text-center text-neutral-400">
          Study smarter with spaced repetition
        </p>
        
        {/* Sample deck preview */}
        <div className="p-4 rounded-lg bg-neutral-800">
          <h2 className="font-semibold mb-2">Sample Deck</h2>
          <p className="text-sm text-neutral-400 mb-4">
            A sample flashcard deck to test Frame integration
          </p>
          <div className="flex justify-between items-center">
            <span className="text-sm">20 cards</span>
            <Button variant="secondary" size="sm">
              Study Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 