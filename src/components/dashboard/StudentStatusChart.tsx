import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Users } from 'lucide-react';
import { Card } from '../ui/Card';

export interface StudentStatusChartProps {
  active: number;
  inactive: number;
  paused: number;
}

const SEGMENTS = [
  { key: 'active', label: 'Ativos', color: '#22c55e' },
  { key: 'paused', label: 'Pausados', color: '#f59e0b' },
  { key: 'inactive', label: 'Inativos', color: '#52525b' },
] as const;

/**
 * Distribuição de alunos (Ativos / Pausados / Inativos) em donut.
 * Dados por props — sem fetch interno.
 */
export function StudentStatusChart({ active, inactive, paused }: StudentStatusChartProps) {
  const data = [
    { name: SEGMENTS[0].label, value: active, color: SEGMENTS[0].color },
    { name: SEGMENTS[1].label, value: paused, color: SEGMENTS[1].color },
    { name: SEGMENTS[2].label, value: inactive, color: SEGMENTS[2].color },
  ];
  const total = active + paused + inactive;

  return (
    <Card className="p-5">
      <div className="mb-2 flex items-center gap-2">
        <Users className="h-4 w-4 text-vs-muted" />
        <div>
          <h3 className="text-sm font-bold text-white">Status dos alunos</h3>
          <p className="text-[11px] text-vs-muted">{total} alunos</p>
        </div>
      </div>

      <div className="relative h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={56}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((segment) => (
                <Cell key={segment.name} fill={segment.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#101010',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value: any, name: any) => [`${value}`, name]}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white">{total}</span>
          <span className="text-[10px] text-vs-muted">total</span>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {data.map((segment) => (
          <div key={segment.name} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-vs-muted">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              {segment.name}
            </span>
            <span className="font-semibold text-white">{segment.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}