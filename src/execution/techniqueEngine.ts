import type {
  WorkoutExerciseGroup,
  WorkoutPlanExercise,
} from '../types/database';
import {
  getBiSetRounds,
  getDropSetConfig,
  getExerciseRest,
  getExerciseSets,
  getPyramidConfig,
  getRestPauseConfig,
  getTransitionRest,
  getTransitionTitle,
} from '../utils/workoutPlan';

/**
 * TechniqueEngine — decisão de progressão da execução.
 *
 * Módulo PURO: não manipula estado, não toca DOM/hook, não grava nada.
 * A cada série concluída, o executor (hook) chama evaluateNextStep e apenas
 * aplica as ações retornadas. Isso centraliza a lógica das estratégias de
 * técnica num único lugar testável, mantendo o contrato do hook intacto.
 *
 * Estratégias: normal, bi_set, drop_set, rest_pause, pyramid — cada uma com
 * comportamento próprio (drop, rest-pause e pyramid são execuções premium).
 */

export type RestKind = 'set' | 'exercise';

/** O que fazer DEPOIS do steStop (direto ou ao fim do descanso). */
export type ThenStep =
  | { kind: 'advance-set' }
  | { kind: 'go-to'; exerciseId: string }
  | { kind: 'back-to-a'; exerciseId: string }
  | { kind: 'next' }
  | { kind: 'done' };

export interface TechniqueOutcome {
  /** Cancela o exercício atual em completedExercises. */
  registerExercise: boolean;
  /** Próximo passo a aplicar (direto ou após o descanso). */
  then: ThenStep;
  /** Descanso opcional a iniciar agora (null = aplicar `then` já). */
  rest: {
    seconds: number;
    mode: RestKind;
    title: string;
  } | null;
}

export interface NextStepInput {
  exercise: WorkoutPlanExercise;
  nextExercise: WorkoutPlanExercise | null;
  group: WorkoutExerciseGroup | null;
  /** Outro membro do mesmo grupo (A↔B). Null para exercícios normais. */
  partner: WorkoutPlanExercise | null;
  currentSet: number;
  safeTotalSets: number;
  groups: WorkoutExerciseGroup[];
}

/** Dados expositivos para a UI específica do drop-set. */
export interface DropSetInfo {
  current: number;
  total: number;
  currentWeight: number | null;
  nextWeight: number | null;
  finalRest: number;
  isLast: boolean;
}

/** Dados expositivos para a UI específica do rest-pause. */
export interface RestPauseInfo {
  current: number;
  total: number;
  pauseSeconds: number;
  isLast: boolean;
}

/** Carga/repetições de UMA etapa (série) da pirâmide. */
export interface PyramidStep {
  weight: number | null;
  reps: number | null;
}

/** Dados expositivos para a UI específica da pirâmide. */
export interface PyramidInfo {
  current: number;
  total: number;
  currentWeight: number | null;
  nextWeight: number | null;
  currentReps: number | null;
  nextReps: number | null;
  isLast: boolean;
}

/**
 * Ponto de entrada das estratégias de técnica.
 * normal / bi_set / drop_set / rest_pause / pyramid — cada técnica tem sua
 * própria estratégia (as premium drop, rest-pause e pyramid não delegam).
 */
export function evaluateNextStep(
  input: NextStepInput
): TechniqueOutcome {
  const technique = input.exercise.technique_type;

  switch (technique) {
    case 'bi_set':
      return biSetStrategy(input);
    case 'drop_set':
      return dropSetStrategy(input);
    case 'rest_pause':
      return restPauseStrategy(input);
    case 'pyramid':
      return pyramidStrategy(input);
    default:
      return normalStrategy(input);
  }
}

/**
 * Quantidade de "passos" da progressão para a técnica atual.
 * - bi_set: rodadas do grupo (ou mínimo entre os sets dos dois membros);
 * - drop_set: número de quedas (DropSetConfig.drops; fallback sets);
 * - demais: séries do exercício.
 * Usado pelo hook para derivar safeTotalSets / X de N.
 */
export function resolveStepCount(
  exercise: WorkoutPlanExercise,
  partner: WorkoutPlanExercise | null,
  group: WorkoutExerciseGroup | null
): number {
  const technique = exercise.technique_type;

  if (
    technique === 'bi_set' &&
    group?.group_type === 'bi_set'
  ) {
    return getBiSetRounds(exercise, partner, group);
  }

  if (technique === 'drop_set') {
    const drops =
      getDropSetConfig(exercise).drops;

    return drops && drops > 0
      ? drops
      : getExerciseSets(exercise);
  }

  // Rest-pause: cada série do plano vira `max_pauses + 1` levas.
  // Sem max_pauses configurado, cai para o número de séries (fallback).
  if (technique === 'rest_pause') {
    const pauses =
      getRestPauseConfig(exercise).max_pauses;

    if (typeof pauses === 'number' && pauses >= 0) {
      return pauses + 1;
    }

    return getExerciseSets(exercise);
  }

  // pyramid: a quantidade de passos é EXATAMENTE o número de séries
  // configuradas no exercício (top_sets do config não é usado aqui).
  if (technique === 'pyramid') {
    return getExerciseSets(exercise);
  }

  return getExerciseSets(exercise);
}

/**
 * Pesos sugeridos (por queda) para um drop-set: a 1ª queda usa o peso do
 * plano e cada queda seguinte é reduzida em `reduction_percent`. Sem peso
 * definido, devolve um array de null (cabe ao aluno registrar).
 */
export function getDropStepWeights(
  exercise: WorkoutPlanExercise
): Array<number | null> {
  const config = getDropSetConfig(exercise);
  const reduction = Math.max(
    0,
    Number(config.reduction_percent) || 0
  );

  const raw = Number(
    String(exercise.suggested_weight || '')
      .replace(',', '.')
      .trim()
  );

  const count = Math.max(
    1,
    (config.drops && config.drops > 0
      ? config.drops
      : getExerciseSets(exercise))
  );

  if (
    !Number.isFinite(raw) ||
    raw <= 0
  ) {
    return Array.from(
      { length: count },
      () => null
    );
  }

  return Array.from(
    { length: count },
    (_, index) => {
      if (index === 0) {
        return Math.round(raw * 10) / 10;
      }

      const factor = Math.pow(
        1 - reduction / 100,
        index
      );

      return (
        Math.round(raw * factor * 10) /
        10
      );
    }
  );
}

/**
 * Carga/repetições por série de uma pirâmide. A contagem é o nº de séries do
 * exercício (`getExerciseSets`). O peso da 1ª série = `suggested_weight` do
 * plano; a partir daí sobe por `increment_percent` (linear aditivo sobre a
 * base, ex.: 25% → 20/25/30/35…) OU pela lista `increments` (variação em kg
 * por série, relativa à base). Repetições: usa o `reps` do plano (o builder
 * não captura reps diferentes por série). Sem carga base definida, pesos null.
 */
export function getPyramidSteps(
  exercise: WorkoutPlanExercise
): PyramidStep[] {
  const config = getPyramidConfig(exercise);
  const count = Math.max(
    1,
    getExerciseSets(exercise)
  );

  const baseWeight = Number(
    String(exercise.suggested_weight || '')
      .replace(',', '.')
      .trim()
  );
  const baseReps = Number(
    String(exercise.reps || '').replace(
      ',',
      '.'
    )
  );
  const increment = Math.max(
    0,
    Number(config.increment_percent) || 0
  );

  const hasBaseWeight =
    Number.isFinite(baseWeight) &&
    baseWeight > 0;

  return Array.from({ length: count }, (_, i) => {
    const weight = hasBaseWeight
      ? Math.round(
          (baseWeight *
            (1 + (increment / 100) * i)) *
            10
        ) / 10
      : null;

    return {
      weight,
      reps:
        Number.isFinite(baseReps) && baseReps > 0
          ? baseReps
          : null,
    };
  });
}

function normalStrategy(
  input: NextStepInput
): TechniqueOutcome {
  const { exercise, currentSet, safeTotalSets } =
    input;

  if (currentSet < safeTotalSets) {
    const restSeconds = getExerciseRest(
      exercise
    );

    return {
      registerExercise: false,
      then: { kind: 'advance-set' },
      rest:
        restSeconds > 0
          ? {
              seconds: restSeconds,
              mode: 'set',
              title: 'Descanso entre séries',
            }
          : null,
    };
  }

  return completeToNext(input);
}

/**
 * drop_set (execução premium): cada série é uma "queda". Entre quedas há um
 * microdescanso (rest_between_drops_seconds); a última queda transita para o
 * descanso final do exercício (rest_seconds) e avança para o próximo passo.
 */
function dropSetStrategy(
  input: NextStepInput
): TechniqueOutcome {
  const { exercise, currentSet, safeTotalSets } =
    input;

  if (currentSet < safeTotalSets) {
    const micro = Number(
      getDropSetConfig(exercise)
        .rest_between_drops_seconds || 0
    );

    return {
      registerExercise: false,
      then: { kind: 'advance-set' },
      rest:
        micro > 0
          ? {
              seconds: micro,
              mode: 'set',
              title: 'Microdescanso entre quedas',
            }
          : null,
    };
  }

  // Última queda concluída: descanso final do exercício + próximo passo.
  return completeToNext(input);
}

/**
 * rest_pause (execução premium): `max_pauses + 1` levas. Cada leva usa a
 * MESMA carga do plano; entre levas há uma pausa curta (`pause_seconds`).
 * A última leva finaliza o exercício (descanso final + próximo passo).
 */
function restPauseStrategy(
  input: NextStepInput
): TechniqueOutcome {
  const { exercise, currentSet, safeTotalSets } =
    input;

  if (currentSet < safeTotalSets) {
    const pauseSeconds = Number(
      getRestPauseConfig(exercise)
        .pause_seconds || 0
    );

    return {
      registerExercise: false,
      then: { kind: 'advance-set' },
      rest:
        pauseSeconds > 0
          ? {
              seconds: pauseSeconds,
              mode: 'set',
              title: 'Pausa curta (rest-pause)',
            }
          : null,
    };
  }

  // Última leva concluída: descanso final do exercício + próximo passo.
  return completeToNext(input);
}

/**
 * pyramid (execução premium): séries em rampa. Cada série tem peso/reps
 * próprios (da rampa). Após concluir cada série, inicia o DESCanso configurado
 * (`rest_seconds`) do exercício e então avança (`advance-set`) para a próxima.
 * Na última série, `completeToNext` aplica o descanso final normal e segue
 * para o próximo exercício. Não altera a quantidade de séries.
 */
function pyramidStrategy(
  input: NextStepInput
): TechniqueOutcome {
  const { exercise, currentSet, safeTotalSets } =
    input;

  if (currentSet < safeTotalSets) {
    const restSeconds = getExerciseRest(
      exercise
    );

    return {
      registerExercise: false,
      then: { kind: 'advance-set' },
      // Cada série da pirâmide é seguida pelo descanso configurado do
      // exercício; só então avança para a próxima série.
      rest:
        restSeconds > 0
          ? {
              seconds: restSeconds,
              mode: 'set',
              title: 'Descanso entre séries',
            }
          : null,
    };
  }

  // Última série concluída: descanso normal do exercício + próximo passo.
  return completeToNext(input);
}

function biSetStrategy(
  input: NextStepInput
): TechniqueOutcome {
  const {
    exercise,
    partner,
    currentSet,
    safeTotalSets,
  } = input;

  // Fase A (group_order 1): segue para B sem descanso.
  if (exercise.group_order === 1) {
    if (!partner) {
      // Sem parceiro — dado inconsistente: cai no fluxo normal.
      return normalStrategy(input);
    }

    return {
      registerExercise:
        currentSet >= safeTotalSets,
      then: {
        kind: 'go-to',
        exerciseId: partner.id,
      },
      rest: null,
    };
  }

  // Fase B (group_order 2).
  if (currentSet < safeTotalSets) {
    const partnerA =
      partner?.group_order === 1
        ? partner
        : null;

    if (!partnerA) {
      // Grupo inconsistente (sem o exercício A): não trava — segue o
      // fluxo linear do próprio exercício.
      return normalStrategy(input);
    }

    const restSeconds = getTransitionRest({
      exercise,
      nextExercise: partner,
      groups: input.groups,
    });

    return {
      registerExercise: false,
      then: {
        kind: 'back-to-a',
        exerciseId: partnerA.id,
      },
      rest:
        restSeconds > 0
          ? {
              seconds: restSeconds,
              mode: 'set',
              title: 'Descanso entre rodadas do bi-set',
            }
          : null,
    };
  }

  // Fim do bloco nesta rodada (B, últ. rodada): completa e segue.
  return completeToNext(input);
}

/**
 * Conclusão do último set de um exercício (aplicável a normal e bi_set B):
 * registra o exercício e segue para o próximo exercício / fim do treino.
 */
function completeToNext(
  input: NextStepInput
): TechniqueOutcome {
  const { nextExercise } = input;

  if (!nextExercise) {
    return {
      registerExercise: true,
      then: { kind: 'done' },
      rest: null,
    };
  }

  const restSeconds = getTransitionRest(
    input
  );

  return {
    registerExercise: true,
    then: { kind: 'next' },
    rest:
      restSeconds > 0
        ? {
            seconds: restSeconds,
            mode: 'exercise',
            title: getTransitionTitle(
              input.exercise,
              input.groups
            ),
          }
        : null,
  };
}