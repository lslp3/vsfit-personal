import type { HTMLAttributes } from 'react';

import vsfitLogo from '../../assets/brand/vsfit-logo.png';
import { cn } from '../../lib/utils';

type BrandMarkSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl';

interface BrandMarkProps
  extends HTMLAttributes<HTMLDivElement> {
  size?: BrandMarkSize;
}

const sizeClasses: Record<BrandMarkSize, string> = {
  xs: 'h-5 w-5',
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
};

export function BrandMark({
  size = 'md',
  className,
  ...props
}: BrandMarkProps) {
  return (
    <div
      {...props}
      className={cn(
        'relative shrink-0 overflow-hidden bg-transparent',
        sizeClasses[size],
        className
      )}
    >
      <img
        src={vsfitLogo}
        alt="VSFit"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
      />
    </div>
  );
}

export default BrandMark;