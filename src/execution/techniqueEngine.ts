import type {
  WorkoutExerciseGroup,
  WorkoutPlanExercise,
} from '../types/database';
import {
  getExerciseRest,
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
 * Estratégias: normal, bi_set, drop_set, rest_pause, pyramid. As três
 * últimas hoje reproduzem o comportamento de `normal` (a progressão linear)
 * — extraídas separadamente para permitir evolução futura sem tocar no hook.
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

/**
 * Ponto de entrada das estratégias de técnica.
 * drop_set / rest_pause / pyramid intencionalmente puxam a estratégia
 * `normal` — deste modo a REGRA é idêntica ao comportamento atual e o
 * ponto de extensão já existe para evolução posterior.
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

/** drop_set (por ora) segue o mesmo fluxo linear de `normal`. */
function dropSetStrategy(
  input: NextStepInput
): TechniqueOutcome {
  return normalStrategy(input);
}

/** rest_pause (por ora) segue o mesmo fluxo de `normal`. */
function restPauseStrategy(
  input: NextStepInput
): TechniqueOutcome {
  return normalStrategy(input);
}

/** pyramid (por ora) segue o mesmo fluxo de `normal`. */
function pyramidStrategy(
  input: NextStepInput
): TechniqueOutcome {
  return normalStrategy(input);
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