import { useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  BarChart3,
  ChevronRight,
  CreditCard,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

import { BrandMark } from '../brand/BrandMark';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

interface AdminNavItem {
  to: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
}

const navItems: AdminNavItem[] = [
  {
    to: '/admin/dashboard',
    label: 'Painel administrativo',
    shortLabel: 'Painel',
    description: 'Visão geral da plataforma',
    icon: LayoutDashboard,
  },
  {
    to: '/admin/trainers',
    label: 'Personais e CREF',
    shortLabel: 'Personais',
    description: 'Cadastros, aprovação e situação',
    icon: Users,
  },
  {
    to: '/admin/subscriptions',
    label: 'Assinaturas',
    shortLabel: 'Planos',
    description: 'Planos e assinaturas da plataforma',
    icon: CreditCard,
  },
  {
    to: '/admin/financial',
    label: 'Financeiro',
    shortLabel: 'Financeiro',
    description: 'Pagamentos e movimentações',
    icon: DollarSign,
  },
  {
    to: '/admin/reports',
    label: 'Relatórios',
    shortLabel: 'Relatórios',
    description: 'Indicadores e análises',
    icon: BarChart3,
  },
];

function getPageTitle(pathname: string) {
  if (
    pathname.startsWith('/admin/trainers/') &&
    pathname.endsWith('/approve')
  ) {
    return {
      title: 'Análise de CREF',
      subtitle: 'Revise os dados do personal antes da aprovação',
    };
  }

  const item = navItems.find(
    (navItem) =>
      pathname === navItem.to ||
      pathname.startsWith(`${navItem.to}/`)
  );

  if (item) {
    return {
      title: item.label,
      subtitle: item.description,
    };
  }

  return {
    title: 'VSFit Admin',
    subtitle: 'Gestão da plataforma',
  };
}

function AdminNavigation({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-1.5">
      {navItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to !== '/admin/trainers'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-[18px] border px-3 py-3 transition-all',
                isActive
                  ? 'border-[#ff2a32]/30 bg-[#ff2a32]/12 text-white'
                  : 'border-transparent text-zinc-500 hover:border-white/10 hover:bg-white/[0.045] hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] transition-colors',
                    isActive
                      ? 'bg-[#ff2a32] text-white'
                      : 'bg-white/[0.055] text-zinc-500 group-hover:text-white'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">
                    {item.label}
                  </p>

                  <p className="mt-0.5 truncate text-[10px] text-zinc-600">
                    {item.description}
                  </p>
                </div>

                <ChevronRight
                  className={cn(
                    'h-4 w-4 transition-colors',
                    isActive
                      ? 'text-[#ff2a32]'
                      : 'text-zinc-700'
                  )}
                />
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    profile,
    logout,
  } = useAuthStore();

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const pageInfo =
    getPageTitle(location.pathname);

  const adminName =
    profile?.name?.trim() ||
    profile?.email ||
    'Administrador';

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await logout();

      navigate('/auth/login', {
        replace: true,
      });
    } finally {
      setLoggingOut(false);
      setMenuOpen(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-[290px] shrink-0 flex-col border-r border-white/[0.07] bg-[#09090a] p-4 md:flex">
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-3 rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-3"
          >
            <BrandMark
              size="sm"
              className="shrink-0 rounded-[13px]"
            />

            <div className="min-w-0">
              <p className="truncate text-sm font-black">
                VSFit Admin
              </p>

              <div className="mt-1 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#ff2a32]" />

                <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                  Super administrador
                </p>
              </div>
            </div>
          </Link>

          <div className="mt-5 flex-1 overflow-y-auto">
            <p className="mb-3 px-3 text-[9px] font-black uppercase tracking-[0.22em] text-zinc-700">
              Administração
            </p>

            <AdminNavigation />
          </div>

          <div className="mt-4 rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff2a32]/15 text-sm font-black text-[#ff2a32]">
                {adminName
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-white">
                  {adminName}
                </p>

                <p className="truncate text-[10px] text-zinc-600">
                  {profile?.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                void handleLogout()
              }
              disabled={loggingOut}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[15px] border border-red-400/15 bg-red-400/[0.07] text-xs font-black uppercase text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />

              {loggingOut
                ? 'Saindo...'
                : 'Sair da conta'}
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#050505]/95 backdrop-blur-xl">
            <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-3 px-4 md:h-[76px] md:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <BrandMark
                  size="sm"
                  className="shrink-0 rounded-[12px] md:hidden"
                />

                <div className="min-w-0">
                  <p className="truncate text-[15px] font-black tracking-[-0.025em] text-white md:text-lg">
                    {pageInfo.title}
                  </p>

                  <p className="mt-0.5 truncate text-[10px] text-zinc-600 md:text-xs">
                    {pageInfo.subtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMenuOpen(true)
                }
                aria-label="Abrir menu administrativo"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-zinc-400 md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="hidden items-center gap-2 rounded-full border border-[#ff2a32]/20 bg-[#ff2a32]/10 px-4 py-2 md:flex">
                <ShieldCheck className="h-4 w-4 text-[#ff2a32]" />

                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#ff2a32]">
                  Área protegida
                </span>
              </div>
            </div>
          </header>

          <main className="min-h-[calc(100vh-68px)] pb-24 md:min-h-[calc(100vh-76px)] md:pb-0">
            <Outlet />
          </main>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#080809]/98 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">
        <nav className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            const active =
              location.pathname === item.to ||
              location.pathname.startsWith(
                `${item.to}/`
              );

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex min-w-0 flex-col items-center justify-center gap-1 rounded-[14px] py-2 transition-colors',
                  active
                    ? 'bg-[#ff2a32]/12 text-[#ff2a32]'
                    : 'text-zinc-600'
                )}
              >
                <Icon className="h-5 w-5" />

                <span className="max-w-full truncate px-1 text-[8px] font-black uppercase">
                  {item.shortLabel}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() =>
              setMenuOpen(false)
            }
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          <aside className="absolute bottom-0 right-0 top-0 flex w-[88%] max-w-sm flex-col border-l border-white/[0.08] bg-[#09090a] p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrandMark
                  size="sm"
                  className="rounded-[12px]"
                />

                <div>
                  <p className="text-sm font-black">
                    VSFit Admin
                  </p>

                  <p className="text-[10px] text-zinc-600">
                    Super administrador
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMenuOpen(false)
                }
                aria-label="Fechar menu"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-zinc-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex-1 overflow-y-auto">
              <AdminNavigation
                onNavigate={() =>
                  setMenuOpen(false)
                }
              />
            </div>

            <div className="mt-4 rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-3">
              <p className="truncate text-xs font-black">
                {adminName}
              </p>

              <p className="mt-1 truncate text-[10px] text-zinc-600">
                {profile?.email}
              </p>

              <button
                type="button"
                onClick={() =>
                  void handleLogout()
                }
                disabled={loggingOut}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[15px] border border-red-400/15 bg-red-400/[0.07] text-xs font-black uppercase text-red-300 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />

                {loggingOut
                  ? 'Saindo...'
                  : 'Sair da conta'}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default AdminShell;