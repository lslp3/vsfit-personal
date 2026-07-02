import { Outlet, NavLink } from 'react-router-dom';
import { Home, Dumbbell, BarChart3, MessageSquare, User } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/student/home', icon: Home, label: 'Início' },
  { to: '/student/workouts', icon: Dumbbell, label: 'Treinos' },
  { to: '/student/progress', icon: BarChart3, label: 'Progresso' },
  { to: '/student/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/student/profile', icon: User, label: 'Perfil' },
];

export function StudentShell() {
  return (
    <div className="min-h-screen bg-vs-dark">
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
    </div>
  );
}
