import type { ReactNode } from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';

export type MetricTrendType = 'positive' | 'negative' | 'neutral';

export interface MetricCardProps {
  title: string;
  value: ReactNode;
  description?: string;
  /** Tendência exibida como badge (positivo/negativo/neutro). */
  trend?: MetricTrendType;
  /** Rótulo da tendência. Ex.: "+12% este mês". */
  trendLabel?: string;
  /** Ícone lucide opcional ao lado do título. */
  icon?: LucideIcon;
}

const trendStyles: Record<
  MetricTrendType,
  { Icon: LucideIcon; className: string }
> = {
  positive: { Icon: TrendingUp, className: 'text-emerald-400' },
  negative: { Icon: TrendingDown, className: 'text-vs-primary' },
  neutral: { Icon: Minus, className: 'text-zinc-500' },
};

/**
 * Card de KPI reutilizável (identidade Premium: fundo escuro, borda
 * arredondada via `Card`/`glass-card`). 100% controlado por props.
 */
export function MetricCard({
  title,
  value,
  description,
  trend = 'neutral',
  trendLabel,
  icon: Icon,
}: MetricCardProps) {
  const TrendIcon = trendStyles[trend].Icon;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-vs-muted" />}
        <p className="text-xs font-semibold uppercase tracking-wider text-vs-muted">
          {title}
        </p>
      </div>

      <div className="mt-3 text-3xl font-black text-white">{value}</div>

      {description && (
        <p className="mt-1 text-xs text-vs-muted">{description}</p>
      )}

      {trendLabel && (
        <div className="mt-3 flex items-center gap-1.5">
          <TrendIcon className={cn('h-3.5 w-3.5', trendStyles[trend].className)} />
          <span
            className={cn('text-xs font-semibold', trendStyles[trend].className)}
          >
            {trendLabel}
          </span>
        </div>
      )}
    </Card>
  );
}