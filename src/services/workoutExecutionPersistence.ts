import type {
  CompletedExercise,
  ExerciseSetDraft,
} from '../types/workout';
import type { ThenStep } from '../execution/techniqueEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// CAMADA ISOLADA DE PERSISTÊNCIA DA EXECUÇÃO DO ALUNO (localStorage)
// ═══════════════════════════════════════════════════════════════════════════════
//
// ⚠️ NÃO REMOVER ESTE FLUXO SEM VALIDAR PERSISTÊNCIA DA EXECUÇÃO.
//
// O estado da execução do treino (exercício atual, série atual, séries concluídas,
// cargas/reps reais por série, rest em andamento, cronômetro) vivia SOMENTE em
// memória React e se perdia ao trocar de app / segundo plano / fechar e abrir /
// recriar a WebView/Activity. Este serviço persiste um SNAPSHOT completo em
// localStorage (síncrono) e o restaura ao reabrir — mesma filosofia do rascunho
// do WorkoutBuilder do Personal.
//
// Contrato:
//   - saveExecutionSnapshot(snapshot)  → grava (síncrono, try/catch de quota);
//   - loadExecutionSnapshot()           → lê + valida versão/ownership, ou null;
//   - hasExecutionSnapshot()            → existe snapshot gravado?;
//   - clearExecutionSnapshot()          → APAGA — SÓ após handleSave() gravar o
//                                         workout_log com sucesso. NUNCA em
//                                         unmount/reload/erro/troca de tela;
//   - registerExecutionLifecycleFlush() → flush SÍNCRONO nos 4 listeners de
//                                         perda de foco/background/reload:
//                                         visibilitychange, pagehide,
//                                         beforeunload, focusout.
//
// REGRA DE OURO:
//   1. Nunca limpar snapshot automaticamente.
//   2. Só limpar após handleSave() (workout_logs) bem-sucedido.
//   3. Restaurar somente quando workoutId + studentId + dayKey batem com o
//      treino carregado (nunca um snapshot de outro treino).
//
// Técnicas premium (drop_set / rest_pause / pyramid / bi_set): NENHUMA técnica
// é recalculada — o snapshot guarda o estado já existente (drafts por exercício,
// atual index/set) e restaura exatamente onde parou.
// ═══════════════════════════════════════════════════════════════════════════════

export const EXECUTION_KEY =
  'vsfit_workout_execution_v1';
const EXECUTION_VERSION = 1;

/** Payload completo do snapshot da execução (restaura o treino onde parou). */
export interface WorkoutSnapshot {
  version: number;
  savedAt: number;

  // Identificação (ownership — valida que pertence ao mesmo treino/dia/aluno)
  workoutId: string;
  studentId: string;
  dayKey: string;

  // Estado da execução
  currentExerciseIndex: number;
  currentSet: number;
  completedExercises: CompletedExercise[];

  // Séries por exercício (preserva cargas/reps/concluídas — inclusive A/B do bi-set)
  draftsByExercise: Record<string, ExerciseSetDraft[]>;

  // Próximo passo decidido pela engine (se havia rest em andamento)
  pendingTransition: {
    then: ThenStep | null;
    restRestore: boolean;
  };

  // Descanso em andamento
  isResting: boolean;
  restTimeLeft: number;
  restDuration: number;
  restMode: 'set' | 'exercise';
  restTitle: string;

  // Tempo
  elapsedSeconds: number;
  startedAt: string;
}

/** True se o snapshot tem conteúdo de treino relevante a persistir. */
export function snapshotHasContent(
  snapshot: WorkoutSnapshot
): boolean {
  return Boolean(
    snapshot.workoutId &&
      snapshot.dayKey &&
      (snapshot.currentExerciseIndex >= 0 ||
        snapshot.currentSet >= 1 ||
        snapshot.completedExercises.length > 0 ||
        Object.keys(snapshot.draftsByExercise).length > 0 ||
        snapshot.isResting)
  );
}

/** Grava o snapshot de forma síncrona (sobrevive a reload/troca de app/Background). */
export function saveExecutionSnapshot(
  snapshot: WorkoutSnapshot
): void {
  try {
    window.localStorage.setItem(
      EXECUTION_KEY,
      JSON.stringify(snapshot)
    );
  } catch {
    // Quota / private mode / storage indisponível — não pode quebrar a UI.
  }
}

/** Lê e valida o snapshot. null se não existir, versão antiga ou corrompido. */
export function loadExecutionSnapshot(): WorkoutSnapshot | null {
  try {
    const raw = window.localStorage.getItem(EXECUTION_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as WorkoutSnapshot;

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      parsed.version !== EXECUTION_VERSION
    ) {
      return null;
    }

    return parsed;
  } catch {
    // Quota/private mode / payload corrompido — trata como inexistente.
    return null;
  }
}

/** Existe um snapshot gravado neste device? */
export function hasExecutionSnapshot(): boolean {
  try {
    return window.localStorage.getItem(EXECUTION_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * APAGA o snapshot. Só chamar após handleSave() salvar o workout_log com
 * sucesso (treino concluído). NUNCA no unmount/reload/init/erro/troca de tela —
 * isso é o que causaria a perda de progresso.
 */
export function clearExecutionSnapshot(): void {
  try {
    window.localStorage.removeItem(EXECUTION_KEY);
  } catch {
    // ignore
  }
}

/**
 * Registra o flush SÍNCRONO nos 4 eventos de ciclo de vida que acontecem ao
 * trocar de app / ir para background / recarregar a WebView:
 * visibilitychange (quando hidden), pagehide, beforeunload e focusout.
 *
 * localStorage é síncrono, então gravar aqui vence a janela do debounce e o
 * `clearTimeout` do unmount. Retorna a função de cleanup (chamar no unmount).
 *
 * Os 4 listeners devem permanecer registrados juntos (add E remove). Se um
 * sumir numa refatoração futura, o flush deixa de cobrir aquele caminho.
 */
export function registerExecutionLifecycleFlush(opts: {
  /** Ex.: () => isTrainingSessionActive — só faz flush com treino em andamento. */
  isEnabled: () => boolean;
  /** Ex.: () => executionSnapshotRef.current — snapshot PRONTO mais recente. */
  getSnapshot: () => WorkoutSnapshot | null;
  /** Callback opcional ao gravar um flush com sucesso. */
  onFlushed?: () => void;
}): () => void {
  const flush = () => {
    if (!opts.isEnabled()) return;

    const snapshot = opts.getSnapshot();

    if (!snapshot || !snapshotHasContent(snapshot)) {
      return;
    }

    saveExecutionSnapshot(snapshot);
    opts.onFlushed?.();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      flush();
    }
  };

  const handlePageHide = () => {
    flush();
  };

  const handleBeforeUnload = () => {
    flush();
  };

  const handleFocusOut = () => {
    flush();
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide);
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('focusout', handleFocusOut);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', handlePageHide);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('focusout', handleFocusOut);
  };
}