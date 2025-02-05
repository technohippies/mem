import { tailspin } from 'ldrs';

// Register the tailspin loader
tailspin.register();

interface LoaderProps {
  className?: string;
  size?: number;
  color?: string;
}

export function Loader({ 
  className = "", 
  size = 40, 
  color = "white" 
}: LoaderProps) {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <l-tailspin
        size={size}
        stroke="3"
        speed="0.9"
        color={color}
      ></l-tailspin>
    </div>
  );
} 