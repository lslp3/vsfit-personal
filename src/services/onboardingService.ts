/**
 * SPRINT 17 · ETAPA 3 — Sistema de Primeiro Acesso (infraestrutura).
 *
 * Camada de persistência pura que identifica se o aplicativo está sendo
 * aberto pela primeira vez e guarda o estado de onboarding/perfil escolhido.
 *
 * Compatibilidade: localStorage funciona tanto em Web (PWA) quanto no
 * Capacitor Android WebView — o mesmo mecanismo que o supabase-js já usa
 * para persistir a sessão, portanto não há interferência na sessão.
 *
 * NÃO toca banco/RLS/Edge/serviços existentes e NÃO altera autenticação.
 * As telas (onboarding, escolha de perfil, cadastro) são das ETAPAS 4–6.
 */

const STORAGE_KEY = 'vsf_first_access_v1';

/** Versão atual da persistência de primeiro acesso (ETAPA 9 — hardening). */
const CURRENT_VERSION = 1 as const;

export type OnboardingRole = 'personal' | 'student' | null;

export interface FirstAccessState {
  /** Concluiu o onboarding? (nunca reexibido para o mesmo device) */
  onboardingDone: boolean;
  /** Perfil escolhido pelo usuário (Personal ou Aluno), se já escolhido. */
  chosenRole: OnboardingRole;
  /** Timestamp (epoch ms) da primeira abertura (para telemetria futura). */
  firstAccessAt: number | null;
  /** Versão da infraestrutura — usado para migração idempotente. */
  version: typeof CURRENT_VERSION;
}

const DEFAULT_STATE: FirstAccessState = {
  onboardingDone: false,
  chosenRole: null,
  firstAccessAt: null,
  version: CURRENT_VERSION,
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function resolveStorage(): StorageLike | null {
  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined'
    ) {
      return window.localStorage;
    }
  } catch {
    // localStorage indisponível em contexto restrito (WebView/privacy).
  }

  return null;
}

/**
 * Normaliza qualquer valor lido do storage para um `FirstAccessState` válido.
 * Tolerante a shape incompleto (preenche defaults), versão antiga (migra) e a
 * representações legacy (boolean/string). O ponto crítico (ETAPA 9): PRESERVA
 * `onboardingDone === true` sempre que houver qualquer evidência de conclusão,
 * para que uma mudança de shape/chave/versão NUNCA re-exiba o onboarding para
 * um usuário que já concluiu. Retorna `null` quando não há como interpretar.
 */
function normalizeState(input: unknown): FirstAccessState | null {
  if (input && typeof input === 'object') {
    const s = input as Partial<FirstAccessState>;

    const onboardingDone = s.onboardingDone === true;
    const chosenRole =
      s.chosenRole === 'personal' || s.chosenRole === 'student'
        ? s.chosenRole
        : null;
    const firstAccessAt =
      typeof s.firstAccessAt === 'number' ? s.firstAccessAt : null;

    return {
      onboardingDone,
      chosenRole,
      firstAccessAt,
      version: CURRENT_VERSION,
    };
  }

  // Representações legacy simples que guardavam o flag de conclusão.
  if (input === true || input === 'true' || input === '1') {
    return { ...DEFAULT_STATE, onboardingDone: true, version: CURRENT_VERSION };
  }

  if (input === false || input === 'false' || input === '0' || input === '') {
    return { ...DEFAULT_STATE, version: CURRENT_VERSION };
  }

  return null;
}

/** Lê o estado persistido (ou o estado inicial quando inexistente). */
export function loadFirstAccessState(): FirstAccessState {
  const storage = resolveStorage();

  if (!storage) {
    return { ...DEFAULT_STATE };
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);

    if (!raw) {
      return { ...DEFAULT_STATE };
    }

    const parsed: unknown = JSON.parse(raw);
    const normalized = normalizeState(parsed);

    if (!normalized) {
      // Conteúdo incompreensível: cai no default sem destruir nada.
      return { ...DEFAULT_STATE };
    }

    // Migração idempotente: se a versão persistida está defasada/ausente,
    // persiste a forma normalizada (preservando onboardingDone) e corrige.
    const persistedVersion =
      parsed && typeof parsed === 'object'
        ? (parsed as Partial<FirstAccessState>).version
        : undefined;

    if (persistedVersion !== CURRENT_VERSION) {
      saveFirstAccessState(normalized);
    }

    return normalized;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

/** Persiste o estado de primeiro acesso (atômico, replace). */
export function saveFirstAccessState(
  state: FirstAccessState
): void {
  const storage = resolveStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Falhas de escrita não devem quebrar o app (best-effort).
  }
}

/** Marca o onboarding como concluído (idempotente). */
export function completeOnboarding(
  overrides: Partial<Omit<FirstAccessState, 'onboardingDone'>> = {}
): FirstAccessState {
  const next: FirstAccessState = {
    ...loadFirstAccessState(),
    onboardingDone: true,
    ...overrides,
  };

  saveFirstAccessState(next);
  return next;
}

/** Grava o perfil escolhido (Personal | Aluno). */
export function setChosenRole(role: NonNullable<OnboardingRole>): FirstAccessState {
  const next: FirstAccessState = {
    ...loadFirstAccessState(),
    chosenRole: role,
  };

  saveFirstAccessState(next);
  return next;
}

/** Observável de "primeira abertura": true enquanto onboarding não concluído. */
export function isFirstAccess(): boolean {
  return !loadFirstAccessState().onboardingDone;
}

/** Limpa o estado local (usado em reset manual / testes). */
export function resetFirstAccessState(): void {
  const storage = resolveStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // best-effort.
  }
}

/* ────────────────────────────────────────────────────────────
   SPRINT 17 · ETAPA 5 — configuração inicial do Personal.

   Flag por conta (trainer_id) que marca quando o Personal já concluiu a
   configuração inicial. Usado para NUNCA reexibir a tela de setup. Mantida
   local (localStorage), sem tocar no banco.
   ──────────────────────────────────────────────────────────── */

function trainerSetupKey(trainerId: string): string {
  return `vsf_trainer_setup_done_${trainerId}`;
}

/** True quando o Personal já concluiu a configuração inicial nesta conta. */
export function isTrainerSetupDone(trainerId: string): boolean {
  const storage = resolveStorage();

  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(trainerSetupKey(trainerId)) === '1';
  } catch {
    return false;
  }
}

/** Marca a configuração inicial como concluída para o Personal. */
export function markTrainerSetupDone(trainerId: string): void {
  const storage = resolveStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(trainerSetupKey(trainerId), '1');
  } catch {
    // best-effort.
  }
}

/**
 * Decide se o Personal ainda PRECISA da configuração inicial (ETAPA 5).
 * Retorna true somente quando: conta não marcada como concluída E perfil
 * ainda vazio nos campos opcionais de configuração. Usuários existentes com
 * perfil preenchido ou já concluídos NUNCA veem novamente.
 */
export function needsTrainerSetup(trainerProfile: {
  id: string;
  avatar_url?: string | null;
  cref?: string | null;
  niche?: string | null;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  instagram?: string | null;
} | null): boolean {
  if (!trainerProfile?.id) return false;

  if (isTrainerSetupDone(trainerProfile.id)) return false;

  const hasProfileData =
    Boolean(trainerProfile.avatar_url) ||
    Boolean(trainerProfile.cref) ||
    Boolean(trainerProfile.niche) ||
    Boolean(trainerProfile.phone) ||
    Boolean(trainerProfile.location) ||
    Boolean(trainerProfile.bio) ||
    Boolean(trainerProfile.instagram);

  return !hasProfileData;
}

export { DEFAULT_STATE, STORAGE_KEY };