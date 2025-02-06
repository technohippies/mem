import { useEffect, useCallback } from 'react';
import sdk from '@farcaster/frame-sdk';
import { Button } from '@/components/ui/button/Button';

export function TestFrame() {
  useEffect(() => {
    const initFrame = async () => {
      try {
        // Signal to Warpcast that our frame is ready
        await sdk.actions.ready();
        console.log('Frame ready');
      } catch (error) {
        console.error('Failed to initialize frame:', error);
      }
    };

    initFrame();
  }, []);

  const handleStudyClick = useCallback(async () => {
    try {
      // In a real implementation, this would navigate to the study interface
      console.log('Study button clicked');
      await sdk.actions.openUrl('/study');
    } catch (error) {
      console.error('Failed to handle study click:', error);
    }
  }, []);

  const handleDetailsClick = useCallback(async () => {
    try {
      // In a real implementation, this would show deck details
      console.log('Details button clicked');
      await sdk.actions.openUrl('/details');
    } catch (error) {
      console.error('Failed to handle details click:', error);
    }
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
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={handleStudyClick}
              >
                Study Now
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleDetailsClick}
              >
                Details
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 