import {
  AlertTriangle,
  Info,
  Lightbulb,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Card } from '../ui/Card';
import type { AnalyticsInsight, InsightTone } from '../../types/analytics';

export interface InsightsCardProps {
  /** Insights gerados pela camada analytics (AnalyticsSummary.insights). */
  insights: AnalyticsInsight[];
  /** Rótulo do período ativo (ex.: "Últimos 30 dias"). */
  periodLabel?: string;
}

const toneStyles: Record<
  InsightTone,
  { icon: typeof Lightbulb; iconClass: string; chipClass: string }
> = {
  positive: {
    icon: TrendingUp,
    iconClass: 'text-emerald-400',
    chipClass: 'bg-emerald-400/10 text-emerald-400',
  },
  negative: {
    icon: TrendingDown,
    iconClass: 'text-vs-primary',
    chipClass: 'bg-vs-primary/10 text-vs-primary',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-400',
    chipClass: 'bg-amber-400/10 text-amber-400',
  },
  info: {
    icon: Info,
    iconClass: 'text-sky-400',
    chipClass: 'bg-sky-400/10 text-sky-400',
  },
};

/**
 * Seção de Insights (Fase 4) — lista de observações derivadas da camada
 * analytics a partir de dados reais. Componente puro: recebe por props.
 */
export function InsightsCard({ insights, periodLabel }: InsightsCardProps) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-vs-muted" />
        <div>
          <h3 className="text-sm font-bold text-white">Insights</h3>
          {periodLabel && (
            <p className="text-[11px] text-vs-muted">{periodLabel}</p>
          )}
        </div>
      </div>

      {insights.length === 0 ? (
        <p className="text-sm text-vs-muted">
          Nenhum insight para o período. Os dados estão saudáveis.
        </p>
      ) : (
        <ul className="space-y-3">
          {insights.map((insight) => {
            const tone = toneStyles[insight.tone] ?? toneStyles.info;
            const Icon = tone.icon;
            return (
              <li
                key={insight.id}
                className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone.chipClass}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white">
                    {insight.title}
                  </p>
                  <p className="text-xs text-vs-muted">{insight.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
