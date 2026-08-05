import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarCheck } from 'lucide-react';
import { Card } from '../ui/Card';
import type { TopActiveStudent } from '../../types/analytics';

export interface AdherenceDatum {
  studentName: string;
  weeklyAverage: number;
}

export interface AdherenceChartProps {
  /** Frequência semanal por aluno (comparação entre alunos). */
  data: AdherenceDatum[];
  /** Média geral semanal do grupo (linha de referência). */
  average: number;
  /** Ranking de alunos mais ativos (opcional, para ordenar o eixo X). */
  ranking?: TopActiveStudent[];
}

/**
 * Frequência de treino por aluno (barras) com a média semanal como linha
 * de referência. Idealmente alimentado por `AnalyticsSummary.weeklyFrequency`
 * (média) e uma lista por aluno construída a partir dos logs.
 * Dados por props — sem fetch interno.
 */
export function AdherenceChart({ data, average, ranking }: AdherenceChartProps) {
  // Ordena pela média semanal de forma estável (decrescente).
  const orderedRanking = ranking ?? [];
  const ordered = [...data].sort(
    (a, b) =>
      orderedRanking.findIndex((r) => r.name === a.studentName) -
      orderedRanking.findIndex((r) => r.name === b.studentName)
  );

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <CalendarCheck className="h-4 w-4 text-vs-muted" />
        <div>
          <h3 className="text-sm font-bold text-white">Frequência de treino</h3>
          <p className="text-[11px] text-vs-muted">
            Treinos por semana · média do grupo {average.toFixed(1)}
          </p>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ordered} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="studentName"
              stroke="#a1a1aa"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={54}
            />
            <YAxis
              stroke="#a1a1aa"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={30}
              allowDecimals
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              contentStyle={{
                backgroundColor: '#101010',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: '#a1a1aa' }}
              formatter={(value: any) => [`${Number(value).toFixed(1)}/semana`, 'Frequência']}
            />
            <ReferenceLine
              y={average}
              stroke="#ff2a32"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
            <Bar dataKey="weeklyAverage" fill="#38bdf8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}