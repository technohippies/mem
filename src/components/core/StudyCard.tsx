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

  return (
    <div className={cn("flex flex-col min-h-[calc(100vh-theme(spacing.16))]", className)}>
      <div className="flex-grow">
        <FlashCard>
          {visible && (isFlipped ? (
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
          ))}
        </FlashCard>
      </div>

      <div className="sticky bottom-0 w-full p-4 bg-neutral-900 border-t border-neutral-800">
        {isFlipped ? (
          <div className="flex gap-4 w-full">
            <Button 
              variant="secondary"
              onClick={() => visible && handleGrade(1)}
              disabled={!visible}
              className="flex-1 py-6 bg-neutral-500 hover:bg-neutral-600 text-white disabled:opacity-0"
            >
              Again
            </Button>
            <Button 
              variant="secondary"
              onClick={() => visible && handleGrade(3)}
              disabled={!visible}
              className="flex-1 py-6 bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-0"
            >
              Good
            </Button>
          </div>
        ) : (
          <Button 
            variant="secondary"
            onClick={() => visible && setIsFlipped(true)}
            disabled={!visible}
            className="w-full py-6 bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-0"
          >
            Flip
          </Button>
        )}
      </div>
    </div>
  );
};

export default StudyCard;