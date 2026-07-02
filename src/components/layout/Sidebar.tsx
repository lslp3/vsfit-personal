import {
  useEffect,
  useRef,
} from 'react';
import {
  NavLink,
  useNavigate,
} from 'react-router-dom';
import {
  AnimatePresence,
  motion,
} from 'framer-motion';
import {
  Activity,
  Apple,
  BarChart3,
  Bell,
  ClipboardList,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  User,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';

import { BrandMark } from '../brand/BrandMark';
import {
  cn,
  getInitials,
} from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  {
    to: '/personal/dashboard',
    icon: LayoutDashboard,
    label: 'Painel',
  },
  {
    to: '/personal/notifications',
    icon: Bell,
    label: 'Notificações',
  },
  {
    to: '/personal/students',
    icon: Users,
    label: 'Alunos',
  },
  {
    to: '/personal/exercise-library',
    icon: Dumbbell,
    label: 'Biblioteca',
  },
  {
    to: '/personal/workout-builder',
    icon: ClipboardList,
    label: 'Montar treino',
  },
  {
    to: '/personal/nutrition',
    icon: Apple,
    label: 'Nutrição',
  },
  {
    to: '/personal/signup-links',
    icon: UserPlus,
    label: 'Captação de alunos',
  },
  {
    to: '/personal/subscription',
    icon: CreditCard,
    label: 'Assinatura',
  },
  {
    to: '/personal/financial',
    icon: Wallet,
    label: 'Financeiro',
  },
  {
    to: '/personal/chat',
    icon: MessageSquare,
    label: 'Chat',
  },
  {
    to: '/personal/reports',
    icon: BarChart3,
    label: 'Relatórios',
  },
  {
    to: '/personal/progress',
    icon: Activity,
    label: 'Progresso',
  },
  {
    to: '/personal/profile',
    icon: User,
    label: 'Perfil',
  },
];

export function Sidebar({
  open,
  onClose,
}: SidebarProps) {
  const { trainerProfile, logout } =
    useAuthStore();

  const navigate = useNavigate();

  const sidebarRef =
    useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [open, onClose]);

  async function handleLogout() {
    onClose();

    await logout();

    navigate('/auth/login', {
      replace: true,
    });
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
            className="fixed inset-0 z-[998] bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.aside
            ref={sidebarRef}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 260,
            }}
            className="fixed left-0 top-0 z-[999] h-full w-[300px] border-r border-white/[0.08] bg-[#080808] shadow-[10px_0_70px_rgba(0,0,0,0.65)]"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 pb-4 pt-5">
                <div className="flex min-w-0 items-center gap-3">
                  <BrandMark
                    size="md"
                    className="rounded-[13px]"
                  />

                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-black leading-tight tracking-[-0.025em] text-white">
                      VSFit Personal
                    </p>

                    <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.13em] text-[#ff2a32]">
                      Gestão fitness
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar menu"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-zinc-400 transition-colors hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {trainerProfile && (
                <div className="mx-4 mb-3 mt-4 flex items-center gap-3 rounded-[18px] border border-white/[0.08] bg-white/[0.035] p-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#ff2a32]/12 text-sm font-black text-[#ff2a32]">
                    {getInitials(
                      trainerProfile.name
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">
                      {trainerProfile.name}
                    </p>

                    <p className="mt-0.5 truncate text-[11px] text-zinc-500">
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
                        'flex items-center gap-3 rounded-[14px] border px-4 py-3 text-sm font-semibold transition-all',
                        isActive
                          ? 'border-[#ff2a32]/20 bg-[#ff2a32]/10 text-[#ff2a32]'
                          : 'border-transparent text-zinc-400 hover:bg-white/[0.045] hover:text-white'
                      )
                    }
                  >
                    <item.icon className="h-[19px] w-[19px] shrink-0" />

                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="border-t border-white/[0.08] px-3 py-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <LogOut className="h-5 w-5 shrink-0" />

                  <span>Sair</span>
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default Sidebar;