import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  Dumbbell,
  DollarSign,
  UserPlus,
  MessageSquare,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { getGreeting, getInitials } from '../../lib/utils';
import { formatCurrency } from '../../lib/formatters';
import * as studentService from '../../services/studentService';
import * as workoutService from '../../services/workoutService';
import * as paymentService from '../../services/paymentService';
import type { Student, WorkoutPlan, Payment } from '../../types/database';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { trainerProfile, isAuthenticated } = useAuthStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    loadData();
  }, [isAuthenticated]);

  async function loadData() {
    setLoading(true);
    setError('');

    const tid = trainerProfile?.id;
    if (!tid) {
      setLoading(false);
      return;
    }

    try {
      const [studentsData, workoutsData, paymentsData] = await Promise.all([
        studentService.getStudentsByTrainer(tid).catch((e) => {
          console.error('[DashboardPage] students error:', e);
          return [];
        }),
        workoutService.getWorkoutPlansByTrainer(tid).catch((e) => {
          console.error('[DashboardPage] workouts error:', e);
          return [];
        }),
        paymentService.getPaymentsByTrainer(tid).catch((e) => {
          console.error('[DashboardPage] payments error:', e);
          return [];
        }),
      ]);
      setStudents(studentsData);
      setWorkouts(workoutsData);
      setPayments(paymentsData);
    } catch (err) {
      console.error('[DashboardPage] loadData error:', err);
      setError('Erro ao carregar dados do dashboard.');
    } finally {
      setLoading(false);
    }
  }

  const activeStudents = students.filter((s) => s.status === 'active');
  const publishedWorkouts = workouts.filter((w) => w.status === 'published');
  const overduePayments = payments.filter((p) => p.status === 'overdue');
  const totalRevenue = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  const recentStudents = students.slice(0, 5);
  const recentWorkouts = workouts.slice(0, 5);

  const stats = [
    {
      label: 'Total Alunos',
      value: students.length,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Alunos Ativos',
      value: activeStudents.length,
      icon: UserCheck,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
    },
    {
      label: 'Treinos Publicados',
      value: publishedWorkouts.length,
      icon: Dumbbell,
      color: 'text-vs-primary',
      bg: 'bg-vs-primary/10',
    },
    {
      label: 'Faturamento',
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
    },
  ];

  const quickActions = [
    {
      label: 'Novo Aluno',
      icon: UserPlus,
      onClick: () => navigate('/personal/students?new=true'),
      color: 'text-vs-primary',
      bg: 'bg-vs-primary/10',
    },
    {
      label: 'Novo Treino',
      icon: Dumbbell,
      onClick: () => navigate('/personal/workout-builder'),
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Enviar Mensagem',
      icon: MessageSquare,
      onClick: () => navigate('/personal/chat'),
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
    {
      label: 'Relatórios',
      icon: BarChart3,
      onClick: () => navigate('/personal/reports'),
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-vs-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-vs-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-vs-muted">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && students.length === 0) {
    return (
      <div className="min-h-screen bg-vs-dark text-white">
        <div className="max-w-lg mx-auto px-4 pt-6 pb-32">
          <EmptyState
            title="Sem dados"
            description={error}
            action={
              <button onClick={loadData} className="btn-primary max-w-[200px]">
                Tentar novamente
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vs-dark text-white">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-32">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={item}>
            <h1 className="text-2xl font-bold">
              {getGreeting()}, {trainerProfile?.name?.split(' ')[0] || 'Personal'}!
            </h1>
            <p className="text-vs-muted text-sm mt-1">Bem-vindo ao seu painel</p>
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <Card key={stat.label} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-vs-muted truncate">{stat.label}</p>
                    <p className="text-lg font-bold">{stat.value}</p>
                  </div>
                </div>
              </Card>
            ))}
          </motion.div>

          {overduePayments.length > 0 && (
            <motion.div variants={item}>
              <Card className="p-4 border-red-500/30 bg-red-500/5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-400">
                      {overduePayments.length} {overduePayments.length === 1 ? 'pagamento atrasado' : 'pagamentos atrasados'}
                    </p>
                    <p className="text-xs text-red-400/70">
                      Total: {formatCurrency(overduePayments.reduce((s, p) => s + p.amount, 0))}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/personal/reports')}
                    className="text-xs text-red-400 font-medium hover:underline shrink-0"
                  >
                    Ver
                  </button>
                </div>
              </Card>
            </motion.div>
          )}

          <motion.div variants={item}>
            <h2 className="text-sm font-semibold text-vs-muted uppercase tracking-wider mb-3">
              Ações Rápidas
            </h2>
            <div className="grid grid-cols-4 gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 border border-vs-border active:scale-[0.97] transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center`}>
                    <action.icon className={`w-5 h-5 ${action.color}`} />
                  </div>
                  <span className="text-[10px] text-vs-muted text-center leading-tight">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={item}>
            <h2 className="text-sm font-semibold text-vs-muted uppercase tracking-wider mb-3">
              Alunos Recentes
            </h2>
            {recentStudents.length === 0 ? (
              <EmptyState
                title="Nenhum aluno ainda"
                description="Adicione seu primeiro aluno para começar"
                action={
                  <button
                    onClick={() => navigate('/personal/students?new=true')}
                    className="btn-primary max-w-[200px]"
                  >
                    Adicionar Aluno
                  </button>
                }
              />
            ) : (
              <div className="space-y-2">
                {recentStudents.map((student) => (
                  <Card
                    key={student.id}
                    className="p-3"
                    onClick={() => navigate(`/personal/students/${student.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-vs-primary/20 flex items-center justify-center text-xs font-bold text-vs-primary shrink-0">
                        {getInitials(student.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{student.name}</p>
                        <p className="text-xs text-vs-muted truncate">{student.email}</p>
                      </div>
                      <Badge status={student.status} />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div variants={item}>
            <h2 className="text-sm font-semibold text-vs-muted uppercase tracking-wider mb-3">
              Treinos Recentes
            </h2>
            {recentWorkouts.length === 0 ? (
              <EmptyState
                title="Nenhum treino criado"
                description="Crie seu primeiro plano de treino"
                action={
                  <button
                    onClick={() => navigate('/personal/workout-builder')}
                    className="btn-primary max-w-[200px]"
                  >
                    Criar Treino
                  </button>
                }
              />
            ) : (
              <div className="space-y-2">
                {recentWorkouts.map((workout) => (
                  <Card key={workout.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-vs-primary/10 flex items-center justify-center shrink-0">
                        <Dumbbell className="w-4 h-4 text-vs-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{workout.name}</p>
                        <p className="text-xs text-vs-muted truncate">
                          {(workout as any).students?.name || 'Aluno'}
                        </p>
                      </div>
                      <Badge status={workout.status} />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
