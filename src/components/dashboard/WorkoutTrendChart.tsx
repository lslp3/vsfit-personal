import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Dumbbell } from 'lucide-react';
import { Card } from '../ui/Card';
import type { WorkoutTrendPoint } from '../../types/analytics';

const chartTooltipStyle = {
  backgroundColor: '#101010',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 12,
  fontSize: 12,
};

export interface WorkoutTrendChartProps {
  /** Série de treinos concluídos (mensal ou por período). */
  data: WorkoutTrendPoint[];
  /** Título do card. Padrão "Treinos concluídos". */
  title?: string;
  /** Subtítulo do card. Padrão "Por mês (ano atual)". */
  subtitle?: string;
}

/**
 * Treinos concluídos (linha) com tooltip — comparação temporal.
 * Dados por props (AnalyticsSummary.workoutSeries ou
 * AnalyticsSummary.workoutSeriesByPeriod).
 */
export function WorkoutTrendChart({
  data,
  title = 'Treinos concluídos',
  subtitle = 'Por mês (ano atual)',
}: WorkoutTrendChartProps) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Dumbbell className="h-4 w-4 text-vs-muted" />
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="text-[11px] text-vs-muted">{subtitle}</p>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
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
              minTickGap={24}
            />
            <YAxis
              stroke="#a1a1aa"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={30}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: 'rgba(255,255,255,0.15)' }}
              contentStyle={chartTooltipStyle}
              labelStyle={{ color: '#a1a1aa' }}
              formatter={(value: any) => [`${value} treinos`, 'Concluídos']}
            />
            <Line
              type="monotone"
              dataKey="workouts"
              stroke="#38bdf8"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: '#38bdf8' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}