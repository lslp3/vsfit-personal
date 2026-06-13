import { cn } from '../../lib/utils';
import { getStatusColor, getStatusLabel } from '../../lib/formatters';

interface BadgeProps {
  status: string;
  className?: string;
}

export function Badge({ status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'px-2.5 py-0.5 rounded-full text-xs font-medium border',
        getStatusColor(status),
        'border-current/20 bg-current/5',
        className
      )}
    >
      {getStatusLabel(status)}
    </span>
  );
}
