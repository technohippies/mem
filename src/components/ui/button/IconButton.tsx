import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
}

export const IconButton = ({
  icon,
  label,
  className,
  ...props
}: IconButtonProps) => {
  return (
    <button
      role="button"
      aria-label={label}
      className={cn(
        "p-2 text-neutral-400 hover:text-neutral-300 transition-colors cursor-pointer",
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
}; 