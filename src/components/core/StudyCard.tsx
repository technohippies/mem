import { useState } from 'react';
import { Button } from '@/components/ui/button/Button';
import { FlashCard } from '@/components/ui/flashcard/FlashCard';
import { cn } from '@/lib/utils';
import type { Flashcard } from '@/types/models';

export interface StudyCardProps {
  card: Flashcard;
  onGrade: (grade: 1 | 3) => void;
  className?: string;
  visible?: boolean;
}

export const StudyCard = ({
  card,
  onGrade,
  className,
  visible = true,
}: StudyCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleGrade = (grade: 1 | 3) => {
    onGrade(grade);
    setIsFlipped(false);
  };

  if (!visible) {
    return <div className={cn("flex flex-col min-h-[calc(100vh-theme(spacing.16))]", className)} />;
  }

  return (
    <div className={cn("flex flex-col min-h-[calc(100vh-theme(spacing.16))]", className)}>
      <div className="flex-grow">
        <FlashCard>
          {isFlipped ? (
            <div className="flex flex-col gap-4 items-center">
              {card.back_image_cid && (
                <img 
                  src={card.back_image_cid} 
                  alt="Back" 
                  className="w-48 h-48 rounded-lg object-cover"
                />
              )}
              <p className="text-xl">{card.back}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 items-center">
              {card.front_image_cid && (
                <img 
                  src={card.front_image_cid} 
                  alt="Front" 
                  className="w-48 h-48 rounded-lg object-cover"
                />
              )}
              <p className="text-xl">{card.front}</p>
              {card.audio_tts_cid && (
                <audio controls src={card.audio_tts_cid} className="mt-4" />
              )}
            </div>
          )}
        </FlashCard>
      </div>

      <div className="sticky bottom-0 w-full p-4 bg-background border-t">
        {isFlipped ? (
          <div className="flex gap-4 w-full">
            <Button 
              variant="secondary"
              onClick={() => handleGrade(1)}
              className="flex-1 py-6 bg-red-100 hover:bg-red-200 text-red-900"
            >
              Again
            </Button>
            <Button 
              variant="secondary"
              onClick={() => handleGrade(3)}
              className="flex-1 py-6 bg-green-100 hover:bg-green-200 text-green-900"
            >
              Good
            </Button>
          </div>
        ) : (
          <Button 
            variant="secondary"
            onClick={() => setIsFlipped(true)}
            className="w-full py-6"
          >
            Flip
          </Button>
        )}
      </div>
    </div>
  );
};

export default StudyCard;