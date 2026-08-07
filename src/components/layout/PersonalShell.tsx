import { useState } from 'react';
import {
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { ArrowLeft, Menu } from 'lucide-react';

import {
  PersonalHeaderProvider,
  usePersonalHeader,
} from '../../lib/personalPageHeader';

import { BrandMark } from '../brand/BrandMark';
import { BottomNav } from '../ui/BottomNav';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '../../store/authStore';
import { needsTrainerSetup } from '../../services/onboardingService';
import { TrainerFirstSetupPage } from '../../pages/personal/TrainerFirstSetupPage';

function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    '/personal/dashboard': 'Painel',
    '/personal/analytics': 'Analytics',
    '/personal/notifications': 'Notificações',
    '/personal/push-preferences': 'Preferências de Notificações',
    '/personal/students': 'Alunos',
    '/personal/exercise-library': 'Biblioteca',
    '/personal/workout-builder': 'Montar treino',
    '/personal/nutrition': 'Nutrição',
    '/personal/signup-links': 'Captação de alunos',
    '/personal/subscription': 'Assinatura',
    '/personal/financial': 'Financeiro',
    '/personal/chat': 'Chat',
    '/personal/reports': 'Relatórios',
    '/personal/progress': 'Progresso',
    '/personal/profile': 'Perfil',
  };

  return map[pathname] || 'VSFit Personal';
}

export function PersonalShell() {
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  // Sprint 17 · ETAPA 5 — configuração inicial do Personal: exibida UMA vez
  // (perfil ainda vazio + flag não marcada). Após concluir, o usuário segue
  // para o app normalmente (nunca mais reaparece).
  const { trainerProfile } = useAuthStore();

  if (needsTrainerSetup(trainerProfile)) {
    return <TrainerFirstSetupPage />;
  }

  return (
    <PersonalHeaderProvider>
      <div className="min-h-screen bg-[#050505]">
        <div className="mx-auto flex min-h-screen max-w-[1600px]">
          {/* Sprint 18 · Fase A — sidebar persistente em desktop (inline); oculto no mobile. */}
          <Sidebar variant="inline" />

          <div className="min-w-0 flex-1">
            <ShellHeader onOpenSidebar={() => setSidebarOpen(true)} />

            <main className="mx-auto max-w-lg pb-[calc(5rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] md:max-w-7xl">
              <Outlet />
            </main>
          </div>
        </div>

        {/* BottomNav apenas no mobile. */}
        <div className="md:hidden">
          <BottomNav />
        </div>

        {/* Overlay mobile mantido. */}
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>
    </PersonalHeaderProvider>
  );
}

/**
 * Header GLOBAL do PersonalShell — ÚNICO responsável pelo topo nas rotas
 * /personal/*. Título/back/ações vêm do contexto registrado pelas páginas
 * (usePersonalPageHeader), com fallback para o título da rota.
 */
function ShellHeader({
  onOpenSidebar,
}: {
  onOpenSidebar: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { title: pageTitle, back, right } = usePersonalHeader();
  const resolvedTitle = pageTitle ?? getPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#050505] pt-[var(--safe-area-inset-top,env(safe-area-inset-top,0px))]">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4 md:max-w-7xl md:px-6">
        {back ? (
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Voltar"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-zinc-300 transition-all hover:bg-white/[0.08] hover:text-white active:scale-90"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <p className="truncate text-[14px] font-black leading-tight tracking-[-0.025em] text-white">
                {resolvedTitle}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark
              size="sm"
              className="rounded-[11px]"
            />

            <div className="min-w-0">
              <p className="truncate text-[14px] font-black leading-tight tracking-[-0.025em] text-white">
                VSFit Personal
              </p>

              <p className="mt-0.5 truncate text-[10px] font-medium leading-tight text-zinc-500">
                {resolvedTitle}
              </p>
            </div>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {right}

          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Abrir menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-zinc-400 transition-all hover:bg-white/[0.08] hover:text-white active:scale-90 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default PersonalShell;