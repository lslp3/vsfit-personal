import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  Dumbbell,
  Activity,
  Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { useStudentStore } from '../../store/studentStore';
import * as workoutService from '../../services/workoutService';
import * as subscriptionService from '../../services/subscriptionService';
import { getPlanLimits } from '../../lib/planLimits';
import type { WorkoutLog } from '../../types/database';

interface MonthlyRevenue {
  month: string;
  value: number;
}

export function ReportsPage() {
  const { trainerProfile } = useAuthStore();
  const { students, fetchStudents } = useStudentStore();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planModalMessage, setPlanModalMessage] = useState('');

  useEffect(() => {
    if (!trainerProfile) return;

    fetchStudents(trainerProfile.id);
    loadData();
  }, [trainerProfile, fetchStudents]);

  const loadData = async () => {
    if (!trainerProfile) return;

    setLoading(true);

    try {
      const currentPlanSlug = await subscriptionService.getCurrentPlanSlug(trainerProfile.id);
      const planLimits = getPlanLimits(currentPlanSlug);

      if (!planLimits.reports) {
        setPlanModalMessage(
          'Relatórios avançados bloqueados no seu plano atual. Assine o plano Premium para ter acesso completo aos seus dados.'
        );
        setShowPlanModal(true);
        setLoading(false);
        return;
      }

      workoutService
        .getWorkoutLogsByTrainer(trainerProfile.id)
        .then(setLogs)
        .catch(() => {})
        .finally(() => setLoading(false));
    } catch (err) {
      console.error('[ReportsPage] loadData error:', err);
      setLoading(false);
    }
  };

  const totalStudents = students.length;
  const activeStudents = students.filter((student) => student.status === 'active').length;
  const studentGrowth = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

  const totalWorkouts = logs.length;
  const avgWorkoutsPerStudent =
    students.length > 0 ? (totalWorkouts / students.length).toFixed(1) : '0';

  const studentWorkoutCount: Record<string, { name: string; count: number }> = {};

  for (const log of logs) {
    const studentId = log.student_id;
    const studentName = (log as any).students?.name || 'Aluno';

    if (!studentWorkoutCount[studentId]) {
      studentWorkoutCount[studentId] = { name: studentName, count: 0 };
    }

    studentWorkoutCount[studentId].count += 1;
  }

  const mostActive = Object.values(studentWorkoutCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const revenueByMonth: MonthlyRevenue[] = months.map((month, index) => ({
    month,
    value: logs.filter((log) => {
      const date = new Date(log.created_at);
      return date.getMonth() === index && date.getFullYear() === new Date().getFullYear();
    }).length,
  }));

  const maxRevenue = Math.max(...revenueByMonth.map((revenue) => revenue.value), 1);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#ff2a32] border-t-transparent" />
          <p className="text-sm font-medium text-zinc-400">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  if (showPlanModal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 text-white">
        <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[#080808] p-8 text-center shadow-[0_24px_90px_rgba(0,0,0,0.85)]">
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-yellow-500/20 to-transparent" />

          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-yellow-500/15 text-yellow-400">
            <Info className="h-10 w-10" />
          </div>

          <h2 className="relative text-xl font-black uppercase italic tracking-tight text-white">
            Acesso Bloqueado
          </h2>

          <p className="relative mt-2 text-[13px] leading-relaxed text-zinc-400">
            {planModalMessage}
          </p>

          <div className="relative mt-8 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowPlanModal(false)}>
              FECHAR
            </Button>

            <Button
              className="flex-1"
              onClick={() => {
                setShowPlanModal(false);
                navigate('/personal/subscription');
              }}
            >
              VER PLANOS
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Relatórios" showBack />

      <div className="page-container space-y-4">
        {totalStudents === 0 ? (
          <EmptyState
            icon={
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/5 bg-white/[0.03]">
                <Activity className="h-10 w-10 text-zinc-700" />
              </div>
            }
            title="Nenhum dado disponível"
            description="Os relatórios serão gerados conforme você cadastrar alunos e eles realizarem treinos."
          />
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <motion.div variants={item}>
                <Card>
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vs-primary/10">
                      <Users className="h-5 w-5 text-vs-primary" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">{totalStudents}</p>
                  <p className="text-xs text-vs-muted">Total de alunos</p>
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Card>
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                      <TrendingUp className="h-5 w-5 text-green-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">{studentGrowth}%</p>
                  <p className="text-xs text-vs-muted">Alunos ativos</p>
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Card>
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                      <Dumbbell className="h-5 w-5 text-blue-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">{totalWorkouts}</p>
                  <p className="text-xs text-vs-muted">Treinos realizados</p>
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Card>
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                      <Activity className="h-5 w-5 text-purple-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">{avgWorkoutsPerStudent}</p>
                  <p className="text-xs text-vs-muted">Média/aluno</p>
                </Card>
              </motion.div>
            </div>

            <motion.div variants={item}>
              <Card>
                <p className="mb-4 text-sm font-medium text-vs-muted">
                  Frequência de treinos por mês
                </p>

                <div className="flex h-28 items-end gap-1.5">
                  {revenueByMonth.map((revenue) => (
                    <div key={revenue.month} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-md bg-gradient-to-t from-vs-primary to-orange-500 transition-all"
                        style={{
                          height: `${(revenue.value / maxRevenue) * 100}%`,
                          minHeight: revenue.value > 0 ? '4px' : '2px',
                        }}
                      />
                      <span className="text-[10px] text-vs-muted">{revenue.month}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            {mostActive.length > 0 && (
              <motion.div variants={item}>
                <Card>
                  <p className="mb-3 text-sm font-medium text-vs-muted">Alunos mais ativos</p>

                  <div className="space-y-2">
                    {mostActive.map((student, index) => (
                      <div
                        key={`${student.name}-${index}`}
                        className="flex items-center justify-between py-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-4 text-xs text-vs-muted">{index + 1}º</span>
                          <span className="text-sm text-white">{student.name}</span>
                        </div>

                        <span className="text-sm font-medium text-white">
                          {student.count} treinos
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}