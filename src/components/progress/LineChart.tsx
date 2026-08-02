import { useMemo } from 'react';
import type { EvolutionPoint } from '../../utils/evolution';

interface Pt {
  x: number;
  y: number;
  value: number;
  label?: string;
}

interface LineChartProps {
  /** Pontos de evolução (nulls viram gaps — a linha interrompe). */
  points: EvolutionPoint<number>[];
  /** Cor da linha/área. Default #ff2a32 (vermelho do tema). */
  color?: string;
  /** Largura do viewBox (render responsivo mantém proporção). */
  width?: number;
  /** Altura do viewBox. */
  height?: number;
  /** Unidade exibida no tooltip (ex: 'kg'). */
  unit?: string;
  /** Formatador custom do valor (precedência sobre unit). */
  formatValue?: (value: number) => string;
  /** Mostra grid horizontal de fundo. */
  showGrid?: boolean;
  /** Mostra rótulos min/max. */
  showMinMax?: boolean;
  /** Destaca o último ponto + valor. */
  highlightLast?: boolean;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(255,42,50,${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Converte pontos de evolução (com nulls) em coordenadas cartesianas.
 * Apenas valores não-nulos formam a série; o caminho é calculado sobre eles.
 * Retorna [] quando não há nenhum ponto válido.
 */
function toPoints(points: EvolutionPoint<number>[], width: number, height: number): Pt[] {
  const usable = (points || []).filter(
    (p): p is EvolutionPoint<number> => typeof p.value === 'number'
  );
  if (usable.length === 0) return [];
  const values = usable.map((p) => p.value as number);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const pad = 12;
  const innerW = Math.max(1, width - pad * 2);
  const innerH = Math.max(1, height - pad * 2);
  return usable.map((p, i) => {
    const t = usable.length === 1 ? 0 : i / (usable.length - 1);
    return {
      x: pad + t * innerW,
      y: pad + (1 - ((p.value as number) - min) / span) * innerH,
      value: p.value as number,
      label: p.label,
    };
  });
}

function buildLinePath(pts: Pt[]): string {
  if (pts.length === 0) return '';
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
}

function titleFor(p?: string): string {
  if (!p) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) {
    return new Date(p + 'T00:00:00').toLocaleDateString('pt-BR');
  }
  return p;
}

/**
 * LineChart — gráfico de linha em SVG puro, sem biblioteca externa.
 * Dark theme: fundo transparente, linha e área com gradiente subtil, pontos
 * com tooltip nativo (<title>) e valor do último ponto destacado.
 */
export function LineChart({
  points,
  color = '#ff2a32',
  width = 320,
  height = 140,
  unit = '',
  formatValue,
  showGrid = true,
  showMinMax = false,
  highlightLast = true,
}: LineChartProps) {
  const pts = useMemo(() => toPoints(points, width, height), [points, width, height]);

  if (pts.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-zinc-600"
      >
        Sem dados suficientes
      </div>
    );
  }

  const linePath = buildLinePath(pts);
  const last = pts[pts.length - 1];
  const areaPath =
    pts.length === 1
      ? ''
      : `${linePath} L ${last.x} ${height} L ${pts[0].x} ${height} Z`;

  const gradId = useMemo(() => `line-grad-${color.replace('#', '')}`, [color]);
  const fmt = (v: number) =>
    formatValue ? formatValue(v) : `${v}${unit ? ' ' + unit : ''}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ maxWidth: width }}
      className="overflow-visible"
      role="img"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hexToRgba(color, 0.35)} />
          <stop offset="100%" stopColor={hexToRgba(color, 0)} />
        </linearGradient>
      </defs>

      {showGrid &&
        [0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={12}
            x2={width - 12}
            y1={12 + t * (height - 24)}
            y2={12 + t * (height - 24)}
            stroke="#27272a"
            strokeWidth={1}
          />
        ))}

      {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}

      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={highlightLast && i === pts.length - 1 ? 4 : 3}
          fill="#0b0b0f"
          stroke={color}
          strokeWidth={2}
        >
          <title>{`${titleFor(p.label)}: ${fmt(p.value)}`}</title>
        </circle>
      ))}

      {highlightLast && (
        <text
          x={last.x}
          y={Math.max(18, last.y - 8)}
          textAnchor="middle"
          fill={color}
          fontSize={10}
          fontWeight={600}
        >
          {fmt(last.value)}
        </text>
      )}

      {showMinMax && (
        <>
          <text x={10} y={height - 6} fontSize={9} fill="#71717a">
            {fmt(Math.min(...pts.map((p) => p.value)))}
          </text>
          <text
            x={width - 10}
            y={12}
            fontSize={9}
            fill="#71717a"
            textAnchor="end"
          >
            {fmt(Math.max(...pts.map((p) => p.value)))}
          </text>
        </>
      )}
    </svg>
  );
}