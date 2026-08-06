import { create } from 'zustand';

import {
  completeOnboarding,
  loadFirstAccessState,
  setChosenRole,
  type FirstAccessState,
  type OnboardingRole,
} from '../services/onboardingService';

/**
 * SPRINT 17 · ETAPA 3 — Store de Primeiro Acesso.
 *
 * Estado reativo consumido pelas próximas etapas (onboarding, escolha de
 * perfil, fluxos de entrada). A persistência real vive no
 * `onboardingService` (localStorage compatível Web + Capacitor); este store
 * apenas carrega e expõe o estado, seguindo o padrão authStore/studentStore.
 *
 * NÃO interfere na sessão Supabase nem altera o fluxo atual de usuários
 * autenticados — é leitura opcional até as ETAPAS 4+ consumirem.
 */

interface OnboardingStore extends FirstAccessState {
  /** Carrega (sincronamente) o estado persistido do dispositivo. */
  hydrate: () => void;
  /** Marca o onboarding como concluído (persiste + atualiza o store). */
  markOnboardingDone: () => void;
  /** Grava o perfil escolhido (personal | student). */
  chooseRole: (role: NonNullable<OnboardingRole>) => void;
}

function buildInitialState(): FirstAccessState {
  return loadFirstAccessState();
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  ...buildInitialState(),

  hydrate: () => {
    set(loadFirstAccessState());
  },

  markOnboardingDone: () => {
    const next = completeOnboarding();
    set(next);
  },

  chooseRole: (role) => {
    const next = setChosenRole(role);
    set(next);
  },
}));

export default useOnboardingStore;