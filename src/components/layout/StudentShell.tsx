import { Outlet, NavLink } from 'react-router-dom';
import { Home, Dumbbell, BarChart3, MessageSquare, Bell, User } from 'lucide-react';
import { cn } from '../../lib/utils';
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
    <div className="min-h-screen bg-vs-dark pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-lg mx-auto pb-20">
        <Outlet />
      </div>
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
