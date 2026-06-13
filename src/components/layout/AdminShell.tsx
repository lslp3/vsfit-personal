import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ShieldCheck, CreditCard, BarChart3, DollarSign } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/trainers', icon: Users, label: 'Personais' },
  { to: '/admin/trainer-approval', icon: ShieldCheck, label: 'Aprovações' },
  { to: '/admin/subscriptions', icon: CreditCard, label: 'Assinaturas' },
  { to: '/admin/financial', icon: DollarSign, label: 'Financeiro' },
  { to: '/admin/reports', icon: BarChart3, label: 'Relatórios' },
];

export function AdminShell() {
  return (
    <div className="min-h-screen bg-vs-dark">
      <div className="flex max-w-7xl mx-auto">
        <aside className="hidden md:flex flex-col w-64 min-h-screen bg-vs-dark-2 border-r border-vs-border p-4">
          <div className="flex items-center gap-3 px-3 py-5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vs-primary to-orange-500 flex items-center justify-center">
              <span className="font-black text-white text-sm">VS</span>
            </div>
            <div>
              <p className="font-bold text-sm">VSFit Admin</p>
              <p className="text-xs text-vs-muted">Super Admin</p>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-vs-primary/10 text-vs-primary'
                      : 'text-vs-muted hover:text-white hover:bg-white/5'
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-h-screen pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
