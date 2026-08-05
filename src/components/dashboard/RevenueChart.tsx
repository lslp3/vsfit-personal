import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CircleDollarSign } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../lib/formatters';
import type { RevenuePoint } from '../../types/analytics';

function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

const chartTooltipStyle = {
  backgroundColor: '#101010',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 12,
  fontSize: 12,
};

export interface RevenueChartProps {
  /** Série mensal de receita (12 pontos: Jan..Dez do ano atual). */
  data: RevenuePoint[];
}

/**
 * Receita mensal (12 meses) em barras, com tooltip e eixo X de meses.
 * Dados vindos por props (AnalyticsSummary.monthlyRevenueSeries).
 */
export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <CircleDollarSign className="h-4 w-4 text-vs-muted" />
        <div>
          <h3 className="text-sm font-bold text-white">Receita mensal</h3>
          <p className="text-[11px] text-vs-muted">Últimos 12 meses (BRL)</p>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              stroke="#a1a1aa"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#a1a1aa"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCompactCurrency(value)}
              width={52}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              contentStyle={chartTooltipStyle}
              labelStyle={{ color: '#a1a1aa' }}
              formatter={(value: any) => [formatCurrency(Number(value)), 'Receita']}
            />
            <Bar dataKey="value" fill="#ff2a32" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}