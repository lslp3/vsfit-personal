import { useState } from 'react';
import {
  Outlet,
  useLocation,
} from 'react-router-dom';
import { Menu } from 'lucide-react';

import { BrandMark } from '../brand/BrandMark';
import { BottomNav } from '../ui/BottomNav';
import { Sidebar } from './Sidebar';

function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    '/personal/dashboard': 'Painel',
    '/personal/notifications': 'Notificações',
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

  const location = useLocation();
  const title = getPageTitle(location.pathname);

  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#050505]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
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
                {title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-zinc-400 transition-all hover:bg-white/[0.08] hover:text-white active:scale-90"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg pb-20">
        <Outlet />
      </main>

      <BottomNav />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </div>
  );
}

export default PersonalShell;