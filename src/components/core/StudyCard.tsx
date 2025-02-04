import React, { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button/Button';
import { FlashCard } from '@/components/ui/flashcard/FlashCard';
import { cn } from '@/lib/utils';

export interface StudyCardProps {
  front: ReactNode;
  back: ReactNode;
  frontImage?: string;
  backImage?: string;
  onAgain: () => void;
  onGood: () => void;
  className?: string;
}

export const StudyCard = ({
  front,
  back,
  frontImage,
  backImage,
  onAgain,
  onGood,
  className,
}: StudyCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleFlip = () => {
    setIsAnimating(true);
    setIsFlipped(true);
  };

  const handleAgain = () => {
    setIsFlipped(false);
    setIsAnimating(false);
    onAgain();
  };

  const handleGood = () => {
    setIsFlipped(false);
    setIsAnimating(false);
    onGood();
  };

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      <FlashCard
        frontContent={front}
        backContent={back}
        frontImage={frontImage}
        backImage={backImage}
        isFlipped={isFlipped}
        onAnimationComplete={() => setIsAnimating(false)}
      />
      
      <div className="w-full px-6">
        {!isFlipped ? (
          <Button 
            onClick={handleFlip}
            disabled={isAnimating}
            className="w-full"
          >
            Flip
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              onClick={handleAgain}
              disabled={isAnimating}
              className="w-full"
            >
              Again
            </Button>
            <Button 
              onClick={handleGood}
              disabled={isAnimating}
              className="w-full"
            >
              Good
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyCard; 