import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';

export interface VolumePoint {
  date: string;
  value: number;
}

export interface VolumeProgressChartProps {
  /** Evolução de volume (kg) por treino. Alimentar com buildVolumeTrend(logs). */
  data: VolumePoint[];
  /** Rótulo opcional da unidade (ex.: "kg"). Padrão "kg". */
  unit?: string;
}

function shortDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatCompactNumber(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

/**
 * Evolução do volume de treino (área). Baseia-se nos dados de volume do
 * workoutLogService (via strengthService/analyticsService.buildVolumeTrend).
 * Dados por props — sem fetch interno.
 */
export function VolumeProgressChart({ data, unit = 'kg' }: VolumeProgressChartProps) {
  const chartData = data.map((point) => ({
    name: shortDate(point.date),
    value: point.value,
  }));

  const totalVolume = data.reduce((sum, point) => sum + point.value, 0);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-vs-muted" />
        <div>
          <h3 className="text-sm font-bold text-white">Evolução de volume</h3>
          <p className="text-[11px] text-vs-muted">
            Volume por treino · total {formatCompactNumber(totalVolume)} {unit}
          </p>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff2a32" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#ff2a32" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              stroke="#a1a1aa"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              stroke="#a1a1aa"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value: number) => formatCompactNumber(value)}
            />
            <Tooltip
              cursor={{ stroke: 'rgba(255,255,255,0.15)' }}
              contentStyle={{
                backgroundColor: '#101010',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: '#a1a1aa' }}
              formatter={(value: any) => [
                `${formatCompactNumber(Number(value))} ${unit}`,
                'Volume',
              ]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#ff2a32"
              strokeWidth={2.5}
              fill="url(#volumeGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}