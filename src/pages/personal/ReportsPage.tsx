import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Dumbbell,
  Activity,
  Info,
  Wallet,
  Download,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserPlus,
  BarChart3,
  Trophy,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Header } from '../../components/ui/Header';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { useStudentStore } from '../../store/studentStore';
import * as workoutService from '../../services/workoutService';
import * as paymentService from '../../services/paymentService';
import * as subscriptionService from '../../services/subscriptionService';
import { getPlanLimits } from '../../lib/planLimits';
import { supabase } from '../../lib/supabase';
import type { WorkoutLog, Payment } from '../../types/database';
import { formatCurrency } from '../../lib/formatters';

interface MonthlyValue {
  month: string;
  value: number;
}

interface TopStudent {
  id: string;
  name: string;
  count: number;
}

const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function getValidDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function isCurrentMonth(value?: string | null) {
  const date = getValidDate(value);
  if (!date) return false;

  const now = new Date();

  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function isCurrentYear(value?: string | null) {
  const date = getValidDate(value);
  if (!date) return false;

  return date.getFullYear() === new Date().getFullYear();
}

function getMonthIndex(value?: string | null) {
  const date = getValidDate(value);
  if (!date) return -1;

  return date.getMonth();
}

function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);

  const escapeCsv = (value: string | number) => {
    const text = String(value ?? '').replace(/"/g, '""');
    return `"${text}"`;
  };

  const csv = [
    headers.map(escapeCsv).join(';'),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(';')),
  ].join('\n');

  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { trainerProfile } = useAuthStore();
  const { students, fetchStudents } = useStudentStore();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planModalMessage, setPlanModalMessage] = useState('');

  useEffect(() => {
    if (!trainerProfile) return;

    fetchStudents(trainerProfile.id);
    loadData();
  }, [trainerProfile?.id, fetchStudents]);

  async function loadLeads(trainerId: string) {
    try {
      const { data, error } = await supabase
        .from('signup_leads')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[ReportsPage] signup_leads warning:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.warn('[ReportsPage] signup_leads exception:', error);
      return [];
    }
  }

  async function loadData() {
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

      const [logsData, paymentsData, leadsData] = await Promise.all([
        workoutService.getWorkoutLogsByTrainer(trainerProfile.id).catch(() => []),
        paymentService.getPaymentsByTrainer(trainerProfile.id).catch(() => []),
        loadLeads(trainerProfile.id),
      ]);

      setLogs(logsData || []);
      setPayments(paymentsData || []);
      setLeads(leadsData || []);
    } catch (err) {
      console.error('[ReportsPage] loadData error:', err);
    } finally {
      setLoading(false);
    }
  }

  const totalStudents = students.length;
  const activeStudents = students.filter((student: any) => student.status === 'active').length;
  const inactiveStudents = students.filter((student: any) => student.status !== 'active').length;
  const newStudentsThisMonth = students.filter((student: any) => isCurrentMonth(student.created_at)).length;

  const paidPayments = payments.filter((payment) => payment.status === 'paid');
  const pendingPayments = payments.filter((payment) => payment.status === 'pending');
  const overduePayments = payments.filter((payment) => payment.status === 'overdue');

  const totalRevenue = paidPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const pendingRevenue = pendingPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const overdueRevenue = overduePayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const revenueThisMonth = paidPayments
    .filter((payment) => isCurrentMonth(payment.paid_at || payment.updated_at || payment.created_at))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const completedLogs = logs.filter((log) => log.status === 'completed' || Boolean(log.completed_at));
  const totalWorkouts = completedLogs.length;
  const workoutsThisMonth = completedLogs.filter((log) =>
    isCurrentMonth(log.completed_at || log.created_at)
  ).length;

  const avgWorkoutsPerStudent = totalStudents > 0 ? (totalWorkouts / totalStudents).toFixed(1) : '0';

  const convertedLeads = leads.filter(
    (lead) => lead.converted_student_id || String(lead.status || '').toLowerCase() === 'converted'
  );

  const conversionRate = leads.length > 0 ? Math.round((convertedLeads.length / leads.length) * 100) : 0;
  const leadsThisMonth = leads.filter((lead) => isCurrentMonth(lead.created_at)).length;

  const revenueByMonth: MonthlyValue[] = monthLabels.map((month, index) => ({
    month,
    value: paidPayments
      .filter((payment) => {
        const dateValue = payment.paid_at || payment.updated_at || payment.created_at;
        return isCurrentYear(dateValue) && getMonthIndex(dateValue) === index;
      })
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
  }));

  const workoutsByMonth: MonthlyValue[] = monthLabels.map((month, index) => ({
    month,
    value: completedLogs.filter((log) => {
      const dateValue = log.completed_at || log.created_at;
      return isCurrentYear(dateValue) && getMonthIndex(dateValue) === index;
    }).length,
  }));

  const maxRevenue = Math.max(...revenueByMonth.map((item) => item.value), 1);
  const maxWorkouts = Math.max(...workoutsByMonth.map((item) => item.value), 1);

  const studentNameById = new Map<string, string>();

  students.forEach((student: any) => {
    if (student.id) {
      studentNameById.set(student.id, student.name || 'Aluno');
    }
  });

  const workoutCounter: Record<string, TopStudent> = {};

  completedLogs.forEach((log) => {
    const studentId = log.student_id;

    if (!studentId) return;

    if (!workoutCounter[studentId]) {
      workoutCounter[studentId] = {
        id: studentId,
        name: studentNameById.get(studentId) || 'Aluno',
        count: 0,
      };
    }

    workoutCounter[studentId].count += 1;
  });

  const mostActiveStudents = Object.values(workoutCounter)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  function handleExportReport() {
    const today = new Date().toLocaleDateString('pt-BR');

    downloadCsv(`relatorio-vsfit-${Date.now()}.csv`, [
      { Indicador: 'Data do relatório', Valor: today },
      { Indicador: 'Total de alunos', Valor: totalStudents },
      { Indicador: 'Alunos ativos', Valor: activeStudents },
      { Indicador: 'Alunos inativos/pausados', Valor: inactiveStudents },
      { Indicador: 'Novos alunos no mês', Valor: newStudentsThisMonth },
      { Indicador: 'Receita recebida', Valor: formatCurrency(totalRevenue) },
      { Indicador: 'Receita recebida no mês', Valor: formatCurrency(revenueThisMonth) },
      { Indicador: 'Valor pendente', Valor: formatCurrency(pendingRevenue) },
      { Indicador: 'Valor atrasado', Valor: formatCurrency(overdueRevenue) },
      { Indicador: 'Pagamentos pagos', Valor: paidPayments.length },
      { Indicador: 'Pagamentos pendentes', Valor: pendingPayments.length },
      { Indicador: 'Pagamentos atrasados', Valor: overduePayments.length },
      { Indicador: 'Treinos concluídos', Valor: totalWorkouts },
      { Indicador: 'Treinos concluídos no mês', Valor: workoutsThisMonth },
      { Indicador: 'Média de treinos por aluno', Valor: avgWorkoutsPerStudent },
      { Indicador: 'Leads captados', Valor: leads.length },
      { Indicador: 'Leads captados no mês', Valor: leadsThisMonth },
      { Indicador: 'Leads convertidos', Valor: convertedLeads.length },
      { Indicador: 'Taxa de conversão', Valor: `${conversionRate}%` },
    ]);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#ff2a32]" />
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
            Acesso bloqueado
          </h2>

          <p className="relative mt-2 text-[13px] leading-relaxed text-zinc-400">
            {planModalMessage}
          </p>

          <div className="relative mt-8 flex gap-3">
            <button
              type="button"
              onClick={() => setShowPlanModal(false)}
              className="flex-1 rounded-[18px] border border-white/10 bg-white/[0.06] px-4 py-4 text-[13px] font-black text-white"
            >
              FECHAR
            </button>

            <button
              type="button"
              onClick={() => {
                setShowPlanModal(false);
                navigate('/personal/subscription');
              }}
              className="flex-1 rounded-[18px] bg-[#ff2a32] px-4 py-4 text-[13px] font-black text-white"
            >
              VER PLANOS
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasAnyData = totalStudents > 0 || payments.length > 0 || logs.length > 0 || leads.length > 0;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header title="Relatórios" showBack />

      <div className="mx-auto max-w-lg space-y-5 px-4 pb-32 pt-5">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.55)]">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#ff2a32]/20 to-transparent" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                Premium analytics
              </p>

              <h1 className="mt-1 text-2xl font-black uppercase italic tracking-tight text-white">
                Visão geral
              </h1>

              <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">
                Relatório completo do seu negócio, alunos, treinos, financeiro e captação.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportReport}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white active:scale-95"
              title="Exportar relatório"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>

        {!hasAnyData ? (
          <EmptyState
            icon={
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/5 bg-white/[0.03]">
                <Activity className="h-10 w-10 text-zinc-700" />
              </div>
            }
            title="Nenhum dado disponível"
            description="Os relatórios serão gerados conforme você cadastrar alunos, cobranças, leads e treinos."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Wallet className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="text-xl font-black text-white">{formatCurrency(totalRevenue)}</p>
                <p className="mt-1 text-[11px] font-bold text-zinc-500">Receita recebida</p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff2a32]/10">
                  <TrendingUp className="h-5 w-5 text-[#ff2a32]" />
                </div>
                <p className="text-xl font-black text-white">{formatCurrency(revenueThisMonth)}</p>
                <p className="mt-1 text-[11px] font-bold text-zinc-500">Receita no mês</p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-400" />
                </div>
                <p className="text-xl font-black text-white">{formatCurrency(pendingRevenue)}</p>
                <p className="mt-1 text-[11px] font-bold text-zinc-500">Pendente</p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <p className="text-xl font-black text-white">{formatCurrency(overdueRevenue)}</p>
                <p className="mt-1 text-[11px] font-bold text-zinc-500">Atrasado</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <p className="text-2xl font-black text-white">{totalStudents}</p>
                <p className="mt-1 text-[11px] font-bold text-zinc-500">Total de alunos</p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                </div>
                <p className="text-2xl font-black text-white">{activeStudents}</p>
                <p className="mt-1 text-[11px] font-bold text-zinc-500">Alunos ativos</p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                  <Dumbbell className="h-5 w-5 text-purple-400" />
                </div>
                <p className="text-2xl font-black text-white">{totalWorkouts}</p>
                <p className="mt-1 text-[11px] font-bold text-zinc-500">Treinos concluídos</p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
                  <Activity className="h-5 w-5 text-orange-400" />
                </div>
                <p className="text-2xl font-black text-white">{avgWorkoutsPerStudent}</p>
                <p className="mt-1 text-[11px] font-bold text-zinc-500">Média/aluno</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4 text-center">
                <UserPlus className="mx-auto mb-2 h-5 w-5 text-[#ff2a32]" />
                <p className="text-xl font-black text-white">{newStudentsThisMonth}</p>
                <p className="mt-1 text-[10px] font-bold uppercase text-zinc-500">Novos alunos</p>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4 text-center">
                <Target className="mx-auto mb-2 h-5 w-5 text-yellow-400" />
                <p className="text-xl font-black text-white">{leads.length}</p>
                <p className="mt-1 text-[10px] font-bold uppercase text-zinc-500">Leads</p>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4 text-center">
                <BarChart3 className="mx-auto mb-2 h-5 w-5 text-emerald-400" />
                <p className="text-xl font-black text-white">{conversionRate}%</p>
                <p className="mt-1 text-[10px] font-bold uppercase text-zinc-500">Conversão</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    Receita
                  </p>
                  <h2 className="text-lg font-black text-white">Receita por mês</h2>
                </div>

                <Wallet className="h-5 w-5 text-emerald-400" />
              </div>

              <div className="flex h-32 items-end gap-1.5">
                {revenueByMonth.map((item) => (
                  <div key={item.month} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-md bg-gradient-to-t from-emerald-600 to-emerald-300"
                      style={{
                        height: `${(item.value / maxRevenue) * 100}%`,
                        minHeight: item.value > 0 ? '6px' : '2px',
                      }}
                    />
                    <span className="text-[9px] font-bold text-zinc-600">{item.month}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    Frequência
                  </p>
                  <h2 className="text-lg font-black text-white">Treinos por mês</h2>
                </div>

                <Dumbbell className="h-5 w-5 text-[#ff2a32]" />
              </div>

              <div className="flex h-32 items-end gap-1.5">
                {workoutsByMonth.map((item) => (
                  <div key={item.month} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-md bg-gradient-to-t from-[#ff2a32] to-orange-400"
                      style={{
                        height: `${(item.value / maxWorkouts) * 100}%`,
                        minHeight: item.value > 0 ? '6px' : '2px',
                      }}
                    />
                    <span className="text-[9px] font-bold text-zinc-600">{item.month}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    Ranking
                  </p>
                  <h2 className="text-lg font-black text-white">Alunos mais ativos</h2>
                </div>
              </div>

              {mostActiveStudents.length === 0 ? (
                <p className="rounded-2xl border border-white/5 bg-black/20 p-4 text-[12px] font-bold text-zinc-500">
                  Ainda não há treinos concluídos para montar o ranking.
                </p>
              ) : (
                <div className="space-y-2">
                  {mostActiveStudents.map((student, index) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-[12px] font-black text-white">
                          {index + 1}º
                        </span>

                        <span className="text-sm font-bold text-white">{student.name}</span>
                      </div>

                      <span className="text-[12px] font-black text-[#ff2a32]">
                        {student.count} treinos
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ReportsPage;