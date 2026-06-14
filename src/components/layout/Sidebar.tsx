import { useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  ClipboardList,
  Apple,
  UserPlus,
  CreditCard,
  Wallet,
  MessageSquare,
  BarChart3,
  Activity,
  User,
  LogOut,
  X,
  Dumbbell as Logo,
} from 'lucide-react';

import { cn, getInitials } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/personal/dashboard', icon: LayoutDashboard, label: 'Painel' },
  { to: '/personal/students', icon: Users, label: 'Alunos' },
  { to: '/personal/exercise-library', icon: Dumbbell, label: 'Biblioteca' },
  { to: '/personal/workout-builder', icon: ClipboardList, label: 'Montar Treino' },
  { to: '/personal/nutrition', icon: Apple, label: 'Nutrição' },
  { to: '/personal/signup-links', icon: UserPlus, label: 'Captação de Alunos' },
  { to: '/personal/subscription', icon: CreditCard, label: 'Assinatura' },
  { to: '/personal/financial', icon: Wallet, label: 'Financeiro' },
  { to: '/personal/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/personal/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/personal/progress', icon: Activity, label: 'Progresso' },
  { to: '/personal/profile', icon: User, label: 'Perfil' },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const { trainerProfile, logout } = useAuthStore();
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  async function handleLogout() {
    onClose();
    await logout();
    navigate('/auth/login');
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[998] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            ref={sidebarRef}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed left-0 top-0 z-[999] h-full w-[300px] border-r border-white/10 bg-[#070707] shadow-[4px_0_60px_rgba(0,0,0,0.6)]"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/10 px-5 pb-4 pt-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ff2a32]/30 bg-[#ff2a32]/15">
                    <Logo className="h-5 w-5 text-[#ff2a32]" />
                  </div>

                  <div>
                    <p className="text-base font-black leading-tight text-white">
                      VSFit Personal
                    </p>

                    {trainerProfile && (
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {trainerProfile.name}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-zinc-400 transition-colors hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {trainerProfile && (
                <div className="mx-5 mb-3 mt-4 flex items-center gap-3 rounded-[16px] border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-white">
                    {getInitials(trainerProfile.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">
                      {trainerProfile.name}
                    </p>

                    <p className="truncate text-[11px] text-zinc-500">
                      {trainerProfile.email}
                    </p>
                  </div>
                </div>
              )}

              <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-[14px] border px-4 py-3 text-sm font-medium transition-all',
                        isActive
                          ? 'border-[#ff2a32]/20 bg-[#ff2a32]/12 text-[#ff2a32]'
                          : 'border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-white'
                      )
                    }
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <div className="border-t border-white/10 px-3 py-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  Sair
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}