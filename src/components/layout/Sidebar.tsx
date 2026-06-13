import { useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  ClipboardList,
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
            className="fixed left-0 top-0 z-[999] h-full w-[300px] bg-[#070707] border-r border-white/10 shadow-[4px_0_60px_rgba(0,0,0,0.6)]"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#ff2a32]/15 border border-[#ff2a32]/30 flex items-center justify-center">
                    <Logo className="w-5 h-5 text-[#ff2a32]" />
                  </div>

                  <div>
                    <p className="text-base font-black text-white leading-tight">
                      VSFit Personal
                    </p>

                    {trainerProfile && (
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {trainerProfile.name}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full border border-white/10 bg-white/[0.05] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {trainerProfile && (
                <div className="mx-5 mt-4 mb-3 flex items-center gap-3 rounded-[16px] border border-white/10 bg-white/[0.04] p-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-white">
                    {getInitials(trainerProfile.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">
                      {trainerProfile.name}
                    </p>

                    <p className="text-[11px] text-zinc-500 truncate">
                      {trainerProfile.email}
                    </p>
                  </div>
                </div>
              )}

              <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-4 py-3 rounded-[14px] text-sm font-medium transition-all',
                        isActive
                          ? 'bg-[#ff2a32]/12 text-[#ff2a32] border border-[#ff2a32]/20'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                      )
                    }
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <div className="border-t border-white/10 px-3 py-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3 rounded-[14px] text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
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