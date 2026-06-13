import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  GraduationCap,
  ShieldCheck,
  DollarSign,
  CreditCard,
  UserCheck,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { getAdminDashboardStats } from '../../services/adminService';
import { getAllTrainers } from '../../services/trainerService';
import { formatCurrency } from '../../lib/formatters';
import { Badge } from '../../components/ui/Badge';

interface DashboardStats {
  trainerCount: number;
  studentCount: number;
  pendingCref: number;
  totalRevenue: number;
  subscriptions: number;
  activeTrainers: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const statCards = [
  { key: 'trainerCount', label: 'Total de Personais', icon: Users, color: 'from-vs-primary to-orange-500' },
  { key: 'studentCount', label: 'Total de Alunos', icon: GraduationCap, color: 'from-blue-500 to-cyan-500' },
  { key: 'pendingCref', label: 'CREF Pendentes', icon: ShieldCheck, color: 'from-yellow-500 to-orange-500' },
  { key: 'totalRevenue', label: 'Receita Mensal', icon: DollarSign, color: 'from-green-500 to-emerald-500' },
  { key: 'subscriptions', label: 'Assinaturas Ativas', icon: CreditCard, color: 'from-purple-500 to-pink-500' },
  { key: 'activeTrainers', label: 'Personais Aprovados', icon: UserCheck, color: 'from-teal-500 to-green-500' },
];

const quickActions = [
  { label: 'Gerenciar Personais', to: '/admin/trainers', icon: Users },
  { label: 'Aprovar CREF', to: '/admin/trainer-approval', icon: ShieldCheck },
  { label: 'Ver Assinaturas', to: '/admin/subscriptions', icon: CreditCard },
  { label: 'Relatórios', to: '/admin/reports', icon: DollarSign },
];

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTrainers, setRecentTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, trainers] = await Promise.all([
          getAdminDashboardStats(),
          getAllTrainers(),
        ]);
        setStats(statsData);
        setRecentTrainers(trainers.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-vs-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-vs-muted text-sm mt-1">Visão geral da plataforma</p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {statCards.map((stat) => {
          const Icon = stat.icon;
          let value: string | number = 0;
          if (stat.key === 'totalRevenue') {
            value = formatCurrency(stats?.[stat.key as keyof DashboardStats] as number || 0);
          } else {
            value = stats?.[stat.key as keyof DashboardStats] as number || 0;
          }
          return (
            <motion.div key={stat.key} variants={itemVariants}>
              <Card className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-sm text-vs-muted mt-1">{stat.label}</p>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="text-lg font-bold text-white mb-4">Personais Recentes</h2>
          {recentTrainers.length === 0 ? (
            <p className="text-sm text-vs-muted">Nenhum personal cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {recentTrainers.map((trainer: any) => (
                <div
                  key={trainer.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => navigate('/admin/trainers')}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-vs-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-vs-primary">
                        {trainer.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{trainer.name}</p>
                      <p className="text-xs text-vs-muted truncate">{trainer.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge status={trainer.cref_status || 'not_submitted'} />
                    <ArrowRight className="w-4 h-4 text-vs-muted" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-bold text-white mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.to}
                  onClick={() => navigate(action.to)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-vs-border hover:border-vs-primary/30 transition-all active:scale-[0.98]"
                >
                  <Icon className="w-6 h-6 text-vs-primary" />
                  <span className="text-xs font-medium text-white text-center">{action.label}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
