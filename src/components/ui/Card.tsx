import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: boolean;
}

export function Card({ children, className, onClick, padding = true }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-card',
        padding && 'p-4',
        onClick && 'cursor-pointer active:scale-[0.99] transition-transform',
        className
      )}
    >
      {children}
    </div>
  );
}
