import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Dumbbell, MessageSquare, Wallet, User } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/personal/dashboard', icon: LayoutDashboard, label: 'Início' },
  { to: '/personal/students', icon: Users, label: 'Alunos' },
  { to: '/personal/exercise-library', icon: Dumbbell, label: 'Biblioteca' },
  { to: '/personal/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/personal/financial', icon: Wallet, label: 'Financeiro' },
  { to: '/personal/profile', icon: User, label: 'Perfil' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
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
  );
}
