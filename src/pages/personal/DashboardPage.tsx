import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Dumbbell,
  DollarSign,
  UserPlus,
  MessageSquare,
  BarChart3,
  AlertTriangle,
  Wallet,
  Activity,
} from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { supabase } from '../../lib/supabase';
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

function getDateValue(value?: string | null) {
  if (!value) return 0;

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function sortByRecent<T extends Record<string, any>>(items: T[]) {
  return [...items].sort((a, b) => {
    const bDate = getDateValue(b.created_at || b.updated_at || b.date);
    const aDate = getDateValue(a.created_at || a.updated_at || a.date);

    return bDate - aDate;
  });
}

function getStudentPhotoUrl(student: any) {
  return (
    student?.avatar_url ||
    student?.photo_url ||
    student?.profile_photo_url ||
    student?.image_url ||
    null
  );
}

async function getUnreadStudentMessagesCount(trainerId: string) {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('trainer_id', trainerId)
      .eq('sender_role', 'student')
      .eq('read', false);

    if (error) {
      console.warn('[DashboardPage] unread messages warning:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.warn('[DashboardPage] unread messages exception:', error);
    return 0;
  }
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { trainerProfile, isAuthenticated } = useAuthStore();

  const [students, setStudents] = useState<Student[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!trainerProfile?.id) return;

    loadData(trainerProfile.id);
  }, [isAuthenticated, trainerProfile?.id]);

  async function loadData(trainerIdParam?: string) {
    const tid = trainerIdParam || trainerProfile?.id;

    if (!tid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [studentsData, workoutsData, paymentsData, unreadCount] =
        await Promise.all([
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
          getUnreadStudentMessagesCount(tid),
        ]);

      setStudents(sortByRecent(studentsData));
      setWorkouts(sortByRecent(workoutsData));
      setPayments(sortByRecent(paymentsData));
      setUnreadMessages(unreadCount);
    } catch (err) {
      console.error('[DashboardPage] loadData error:', err);
      setError('Erro ao carregar dados do dashboard.');
    } finally {
      setLoading(false);
    }
  }

  const dashboardData = useMemo(() => {
    const activeStudents = students.filter((student) => student.status === 'active');
    const publishedWorkouts = workouts.filter((workout) => workout.status === 'published');

    const pendingPayments = payments.filter((payment) => payment.status === 'pending');
    const overduePayments = payments.filter((payment) => payment.status === 'overdue');

    const paidPayments = payments.filter((payment) => payment.status === 'paid');

    const totalRevenue = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const monthRevenue = paidPayments
      .filter((payment) => {
        const dateValue = getDateValue(
          (payment as any).paid_at || payment.updated_at || payment.created_at
        );

        return dateValue >= monthStart.getTime();
      })
      .reduce((sum, payment) => sum + payment.amount, 0);

    const pendingAmount = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const overdueAmount = overduePayments.reduce((sum, payment) => sum + payment.amount, 0);

    return {
      activeStudents,
      publishedWorkouts,
      pendingPayments,
      overduePayments,
      totalRevenue,
      monthRevenue,
      pendingAmount,
      overdueAmount,
      recentStudents: students.slice(0, 5),
      recentWorkouts: workouts.slice(0, 5),
    };
  }, [students, workouts, payments]);

  const stats = [
    {
      label: 'Alunos',
      value: students.length,
      subtitle: `${dashboardData.activeStudents.length} ativos`,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Treinos',
      value: dashboardData.publishedWorkouts.length,
      subtitle: `${workouts.length} criados`,
      icon: Dumbbell,
      color: 'text-[#ff2a32]',
      bg: 'bg-[#ff2a32]/10',
    },
    {
      label: 'Mensagens',
      value: unreadMessages,
      subtitle: unreadMessages === 1 ? 'não lida' : 'não lidas',
      icon: MessageSquare,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
    {
      label: 'Mês',
      value: formatCurrency(dashboardData.monthRevenue),
      subtitle: 'recebido',
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
      color: 'text-[#ff2a32]',
      bg: 'bg-[#ff2a32]/10',
    },
    {
      label: 'Novo Treino',
      icon: Dumbbell,
      onClick: () => navigate('/personal/workout-builder'),
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Chat',
      icon: MessageSquare,
      onClick: () => navigate('/personal/chat'),
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
    {
      label: 'Financeiro',
      icon: Wallet,
      onClick: () => navigate('/personal/financial'),
      color: 'text-green-400',
      bg: 'bg-green-400/10',
    },
    {
      label: 'Progresso',
      icon: Activity,
      onClick: () => navigate('/personal/progress'),
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
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
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#ff2a32] border-t-transparent" />
          <p className="text-sm font-medium text-zinc-500">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && students.length === 0 && workouts.length === 0 && payments.length === 0) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto max-w-lg px-4 pb-32 pt-6">
          <EmptyState
            title="Sem dados"
            description={error}
            action={
              <button
                type="button"
                onClick={() => loadData()}
                className="max-w-[220px] rounded-2xl bg-[#ff2a32] px-5 py-3 text-sm font-black text-white"
              >
                Tentar novamente
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-lg px-4 pb-32 pt-6">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-5"
        >
          <motion.div variants={item}>
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#ff2a32]/10">
                  {(trainerProfile as any)?.avatar_url ? (
                    <img
                      src={(trainerProfile as any).avatar_url}
                      alt={trainerProfile?.name || 'Personal'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-black text-[#ff2a32]">
                      {getInitials(trainerProfile?.name || 'Personal')}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                    {getGreeting()}
                  </p>

                  <h1 className="mt-1 truncate text-xl font-black text-white">
                    {trainerProfile?.name?.split(' ')[0] || 'Personal'}
                  </h1>

                  <p className="mt-1 text-[12px] font-medium text-zinc-500">
                    Seu painel em tempo real
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <Card key={stat.label} className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.bg}`}
                  >
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-zinc-500">
                      {stat.label}
                    </p>

                    <p className="mt-0.5 truncate text-lg font-black text-white">
                      {stat.value}
                    </p>

                    <p className="truncate text-[10px] font-medium text-zinc-600">
                      {stat.subtitle}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </motion.div>

          {(dashboardData.overduePayments.length > 0 ||
            dashboardData.pendingPayments.length > 0 ||
            unreadMessages > 0) && (
            <motion.div variants={item} className="space-y-3">
              {unreadMessages > 0 && (
                <Card className="border-purple-500/25 bg-purple-500/5 p-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 shrink-0 text-purple-400" />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-purple-300">
                        {unreadMessages} mensagem{unreadMessages === 1 ? '' : 's'} de aluno
                      </p>

                      <p className="text-xs font-medium text-purple-300/60">
                        Abra o chat para responder.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate('/personal/chat')}
                      className="shrink-0 rounded-full border border-purple-400/20 px-3 py-1.5 text-xs font-black text-purple-300"
                    >
                      Ver
                    </button>
                  </div>
                </Card>
              )}

              {dashboardData.overduePayments.length > 0 && (
                <Card className="border-red-500/25 bg-red-500/5 p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-red-400">
                        {dashboardData.overduePayments.length}{' '}
                        {dashboardData.overduePayments.length === 1
                          ? 'pagamento atrasado'
                          : 'pagamentos atrasados'}
                      </p>

                      <p className="text-xs font-medium text-red-400/70">
                        Total: {formatCurrency(dashboardData.overdueAmount)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate('/personal/financial')}
                      className="shrink-0 rounded-full border border-red-400/20 px-3 py-1.5 text-xs font-black text-red-300"
                    >
                      Ver
                    </button>
                  </div>
                </Card>
              )}

              {dashboardData.pendingPayments.length > 0 && (
                <Card className="border-yellow-500/20 bg-yellow-500/5 p-4">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-5 w-5 shrink-0 text-yellow-400" />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-yellow-300">
                        {dashboardData.pendingPayments.length}{' '}
                        {dashboardData.pendingPayments.length === 1
                          ? 'pagamento pendente'
                          : 'pagamentos pendentes'}
                      </p>

                      <p className="text-xs font-medium text-yellow-300/60">
                        Total: {formatCurrency(dashboardData.pendingAmount)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate('/personal/financial')}
                      className="shrink-0 rounded-full border border-yellow-400/20 px-3 py-1.5 text-xs font-black text-yellow-300"
                    >
                      Ver
                    </button>
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          <motion.div variants={item}>
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-zinc-500">
              Ações rápidas
            </h2>

            <div className="grid grid-cols-3 gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] p-3 transition-all active:scale-[0.97]"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.bg}`}
                  >
                    <action.icon className={`h-5 w-5 ${action.color}`} />
                  </div>

                  <span className="text-center text-[10px] font-black leading-tight text-zinc-400">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={item}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-zinc-500">
                Alunos recentes
              </h2>

              {students.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/personal/students')}
                  className="text-xs font-black text-[#ff2a32]"
                >
                  Ver todos
                </button>
              )}
            </div>

            {dashboardData.recentStudents.length === 0 ? (
              <EmptyState
                title="Nenhum aluno ainda"
                description="Adicione seu primeiro aluno para começar"
                action={
                  <button
                    type="button"
                    onClick={() => navigate('/personal/students?new=true')}
                    className="max-w-[220px] rounded-2xl bg-[#ff2a32] px-5 py-3 text-sm font-black text-white"
                  >
                    Adicionar aluno
                  </button>
                }
              />
            ) : (
              <div className="space-y-2">
                {dashboardData.recentStudents.map((student) => {
                  const photoUrl = getStudentPhotoUrl(student);

                  return (
                    <Card
                      key={student.id}
                      className="p-3"
                      onClick={() => navigate(`/personal/students/${student.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#ff2a32]/10 text-xs font-black text-[#ff2a32]">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={student.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getInitials(student.name)
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-white">
                            {student.name}
                          </p>

                          <p className="truncate text-xs text-zinc-500">
                            {student.email || student.phone || 'Sem contato'}
                          </p>
                        </div>

                        <Badge status={student.status} />
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </motion.div>

          <motion.div variants={item}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-zinc-500">
                Treinos recentes
              </h2>

              {workouts.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/personal/workout-builder')}
                  className="text-xs font-black text-[#ff2a32]"
                >
                  Abrir
                </button>
              )}
            </div>

            {dashboardData.recentWorkouts.length === 0 ? (
              <EmptyState
                title="Nenhum treino criado"
                description="Crie seu primeiro plano de treino"
                action={
                  <button
                    type="button"
                    onClick={() => navigate('/personal/workout-builder')}
                    className="max-w-[220px] rounded-2xl bg-[#ff2a32] px-5 py-3 text-sm font-black text-white"
                  >
                    Criar treino
                  </button>
                }
              />
            ) : (
              <div className="space-y-2">
                {dashboardData.recentWorkouts.map((workout) => (
                  <Card key={workout.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff2a32]/10">
                        <Dumbbell className="h-4 w-4 text-[#ff2a32]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">
                          {workout.name}
                        </p>

                        <p className="truncate text-xs text-zinc-500">
                          {(workout as any).students?.name ||
                            (workout as any).student_name ||
                            'Aluno'}
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

export default DashboardPage;