import { useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface FlashCardProps {
  frontContent: string;
  backContent: string;
  frontImage?: string;
  backImage?: string;
  isFlipped: boolean;
  onAnimationComplete?: () => void;
  className?: string;
}

export const FlashCard = ({
  frontContent,
  backContent,
  frontImage,
  backImage,
  isFlipped,
  onAnimationComplete,
  className,
}: FlashCardProps) => {
  useEffect(() => {
    if (isFlipped) {
      const timer = setTimeout(() => {
        onAnimationComplete?.();
      }, 500); // Match this with CSS transition duration
      return () => clearTimeout(timer);
    }
  }, [isFlipped, onAnimationComplete]);

  return (
    <div className={cn("relative w-[300px] h-[400px] perspective-[1000px]", className)}>
      <div
        className={cn(
          "absolute inset-0 w-full h-full transition-all duration-500",
          "preserve-3d",
          isFlipped ? "[transform:rotateY(180deg)]" : "[transform:rotateY(0deg)]"
        )}
      >
        {/* Front */}
        <div
          className={cn(
            "absolute inset-0 w-full h-full backface-hidden",
            "bg-white rounded-xl shadow-lg p-6",
            "flex flex-col items-center justify-center gap-4"
          )}
        >
          {frontImage && (
            <div className="w-full h-48 overflow-hidden rounded-lg">
              <img
                src={frontImage}
                alt={frontContent}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <p className="text-center text-lg font-medium">{frontContent}</p>
        </div>

        {/* Back */}
        <div
          className={cn(
            "absolute inset-0 w-full h-full backface-hidden",
            "bg-white rounded-xl shadow-lg p-6",
            "flex flex-col items-center justify-center gap-4",
            "[transform:rotateY(180deg)]"
          )}
        >
          {backImage && (
            <div className="w-full h-48 overflow-hidden rounded-lg">
              <img
                src={backImage}
                alt={backContent}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <p className="text-center text-lg font-medium">{backContent}</p>
        </div>
      </div>
    </div>
  );
};

export default FlashCard; 