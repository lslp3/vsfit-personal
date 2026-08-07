import { Outlet, NavLink } from 'react-router-dom';
import { Home, Dumbbell, BarChart3, MessageSquare, Bell, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BrandMark } from '../brand/BrandMark';
import { useAuthStore } from '../../store/authStore';
import { ChangePasswordModal } from '../student/ChangePasswordModal';

const navItems = [
  { to: '/student/home', icon: Home, label: 'Início' },
  { to: '/student/workouts', icon: Dumbbell, label: 'Treinos' },
  { to: '/student/progress', icon: BarChart3, label: 'Progresso' },
  { to: '/student/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/student/notifications', icon: Bell, label: 'Notificações' },
  { to: '/student/profile', icon: User, label: 'Perfil' },
];

export function StudentShell() {
  const { student, studentAccount, setStudentData } = useAuthStore();

  // Primeiro login: o aluno criado pelo personal entra com senha temporária e
  // must_change_password=true. Enquanto isso, bloqueia todo o app do aluno
  // com o modal de troca de senha (não dispensável).
  const mustChangePassword = Boolean(studentAccount?.must_change_password);

  function handlePasswordChanged() {
    if (!student?.id || !studentAccount) return;

    // Libera o app: atualiza o flag na store e o cache de conta já foi
    // invalidado pelo modal (clearStudentAccountCache).
    setStudentData(student, {
      ...studentAccount,
      must_change_password: false,
    });
  }

  return (
    <div className="min-h-screen bg-vs-dark pt-[var(--safe-area-inset-top, env(safe-area-inset-top,0px))]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        {/* Sprint 18 · Fase A — sidebar desktop persistente (oculta no mobile). */}
        <aside className="sticky top-0 hidden h-screen w-[250px] shrink-0 flex-col border-r border-white/[0.07] bg-[#09090a] px-4 py-5 md:flex">
          <div className="mb-6 flex items-center gap-3 rounded-[16px] border border-white/[0.07] bg-white/[0.025] p-3">
            <BrandMark
              size="sm"
              className="shrink-0 rounded-[13px]"
            />

            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">
                VSFit Aluno
              </p>

              <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ff2a32]">
                Seu treino
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }: { isActive: boolean }) =>
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
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-lg pb-[calc(5rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] md:max-w-7xl">
            <Outlet />
          </div>
        </div>
      </div>

      {/* BottomNav apenas no mobile. */}
      <div className="md:hidden">
        <nav className="bottom-nav">
          <div className="flex items-center justify-around max-w-lg mx-auto px-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }: { isActive: boolean }) =>
                  cn(
                    'flex flex-col items-center gap-0.5 py-2 px-3 min-w-0 transition-colors',
                    isActive ? 'text-vs-primary' : 'text-vs-muted'
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

      {mustChangePassword && (
        <ChangePasswordModal
          open
          mustChange
          studentId={student?.id}
          onChanged={handlePasswordChanged}
        />
      )}
    </div>
  );
}
