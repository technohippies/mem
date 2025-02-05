import { cn } from '@/lib/utils';

export interface FlashCardProps {
  children: React.ReactNode;
  className?: string;
}

export const FlashCard = ({
  children,
  className,
}: FlashCardProps) => {
  return (
    <div className={cn("w-full", className)}>
      <div className="w-full aspect-[3/2] p-8 rounded-xl bg-neutral-800 shadow-lg flex flex-col items-center justify-center gap-4">
        {children}
      </div>
    </div>
  );
};

export default FlashCard; 