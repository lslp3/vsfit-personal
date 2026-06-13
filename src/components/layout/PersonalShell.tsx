import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Dumbbell } from 'lucide-react';
import { BottomNav } from '../ui/BottomNav';
import { Sidebar } from './Sidebar';

function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    '/personal/dashboard': 'Painel',
    '/personal/students': 'Alunos',
    '/personal/exercise-library': 'Biblioteca',
    '/personal/workout-builder': 'Montar Treino',
    '/personal/signup-links': 'Captação de Alunos',
    '/personal/subscription': 'Assinatura',
    '/personal/financial': 'Financeiro',
    '/personal/chat': 'Chat',
    '/personal/reports': 'Relatórios',
    '/personal/profile': 'Perfil',
  };
  return map[pathname] || 'VSFit Personal';
}

export function PersonalShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between max-w-lg mx-auto px-4 h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#ff2a32]/15 border border-[#ff2a32]/30 flex items-center justify-center">
              <Dumbbell className="w-[18px] h-[18px] text-[#ff2a32]" />
            </div>
            <div>
              <p className="text-sm font-black text-white leading-tight tracking-tight">VSFit Personal</p>
              <p className="text-[10px] text-zinc-500 leading-tight">{title}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 rounded-full border border-white/10 bg-white/[0.05] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all active:scale-90"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto pb-20">
        <Outlet />
      </div>

      <BottomNav />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </div>
  );
}
