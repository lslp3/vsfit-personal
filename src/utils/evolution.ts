/**
 * Utilitários de análise de evolução (Sprint 9).
 *
 * Operam sobre dados já normalizados (medidas de avaliação e logs de treino).
 * Funções puras, sem estado — ideais para gráficos de linha e históricos.
 * Defensivas: aceitam valores nulos/vazios sem lançar.
 */

export interface EvolutionPoint<T> {
  /** Data ISO (yyyy-mm-dd) do registro. */
  date: string;
  /** Valor do eixo Y (null = sem dado na data). */
  value: T | null;
  /** Rótulo opcional exibido no tooltip/eixo. */
  label?: string;
}

export const EMPTY_EVOLUTION: EvolutionPoint<number>[] = [];

/**
 * Converte uma lista de avaliações em pontos de evolução para um campo
 * numérico (weight, body_fat, muscle_mass, arm_cm, etc.), na ordem cronológica.
 * Registros sem o campo (null/undefined) viram ponto null (gap no gráfico).
 */
export function metricPointsToEvolution<T extends number | null | undefined>(
  rows: Array<{ date: string; value: T }>
): EvolutionPoint<number>[] {
  return (rows || [])
    .slice()
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
    .map((row) => ({
      date: row.date,
      value: typeof row.value === 'number' ? row.value : null,
      label: row.date,
    }));
}

/**
 * Delta entre o último valor e o primeiro da série (último - primeiro).
 * Retorna null se não houver ao menos 2 valores.
 */
export function deltaSeries(
  points: EvolutionPoint<number>[]
): number | null {
  const values = (points || []).map((p) => p.value).filter((v) => typeof v === 'number') as number[];
  if (values.length < 2) return null;
  const last = values[values.length - 1];
  const first = values[0];
  return round(last - first);
}

/**
 * Média móvel simples (janela `window`) sobre os valores não-nulos.
 * Preserva a ordem cronológica; produz um ponto para cada janela completa.
 * Retorna array na MESMA ordem dos pontos originais (gaps mantidos),
 * com `value` = média móvel ou null quando não há janela completa.
 */
export function movingAverage(
  points: EvolutionPoint<number>[],
  window = 3
): EvolutionPoint<number>[] {
  if (!points || points.length === 0) return [];
  const n = Math.max(1, Math.floor(window));
  return points.map((point, index) => {
    if (index < n - 1) return { ...point, value: null };
    const slice = points
      .slice(index - n + 1, index + 1)
      .map((p) => p.value)
      .filter((v): v is number => typeof v === 'number');
    if (slice.length < n) return { ...point, value: null };
    const sum = slice.reduce((acc, v) => acc + v, 0);
    return { ...point, value: round(sum / slice.length) };
  });
}

/**
 * Melhor (maior) valor da série. Útil para "record de força/peso".
 */
export function maxValue(points: EvolutionPoint<number>[]): number | null {
  const values = (points || []).map((p) => p.value).filter((v): v is number => typeof v === 'number');
  return values.length ? Math.max(...values) : null;
}

export function minValue(points: EvolutionPoint<number>[]): number | null {
  const values = (points || []).map((p) => p.value).filter((v): v is number => typeof v === 'number');
  return values.length ? Math.min(...values) : null;
}

/** Último valor não nulo da série. */
export function lastValue(points: EvolutionPoint<number>[]): number | null {
  const values = (points || []).map((p) => p.value).filter((v): v is number => typeof v === 'number');
  return values.length ? values[values.length - 1] : null;
}

/** Primeiro valor não nulo da série. */
export function firstValue(points: EvolutionPoint<number>[]): number | null {
  const values = (points || []).map((p) => p.value).filter((v): v is number => typeof v === 'number');
  return values.length ? values[0] : null;
}

/** Arredonda para 1 casa decimal. */
export function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Range [min, max] com padding. Auto-determina se tudo for igual. */
export function axisRange(points: EvolutionPoint<number>[]): {
  min: number;
  max: number;
} {
  const min = minValue(points);
  const max = maxValue(points);
  if (min === null || max === null) return { min: 0, max: 1 };
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
}

/**
 * Estimativa de 1RM pela fórmula de Epley: para um dado peso (kg) e reps.
 * Retorna null se peso<=0 ou reps<=0.
 */
export function estimateOneRepMax(weight: number, reps: number): number | null {
  if (weight <= 0 || reps <= 0) return null;
  const ratio = reps > 1 ? 1 + reps / 30 : 1;
  return round(weight * ratio);
}