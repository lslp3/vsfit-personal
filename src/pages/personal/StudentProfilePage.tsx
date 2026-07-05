import { useEffect, useState, useCallback, type ElementType } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  TrendingUp,
  DollarSign,
  MessageSquare,
  FileText,
  Dumbbell,
  Plus,
  Send,
  Lock,
  Unlock,
  Key,
  KeyRound,
  Save,
  Copy,
  Check,
  X,
  Phone,
  Calendar,
  Ruler,
  Activity,
  ChevronRight,
  Clock,
  Target,
  Loader2,
} from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import { Header } from '../../components/ui/Header';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
} from '../../lib/formatters';
import * as studentService from '../../services/studentService';
import * as workoutService from '../../services/workoutService';
import * as paymentService from '../../services/paymentService';
import * as messageService from '../../services/messageService';
import type {
  Student,
  StudentGoals,
  StudentMetrics,
  WorkoutPlan,
  Payment,
  Message,
} from '../../types/database';

type TabKey =
  | 'resumo'
  | 'treinos'
  | 'progresso'
  | 'financeiro'
  | 'chat'
  | 'dados';

const tabs: { key: TabKey; label: string; icon: ElementType }[] = [
  { key: 'resumo', label: 'Resumo', icon: User },
  { key: 'treinos', label: 'Treinos', icon: Dumbbell },
  { key: 'progresso', label: 'Progresso', icon: TrendingUp },
  { key: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'dados', label: 'Dados', icon: FileText },
];

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'credit_card', label: 'Cartão' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'transfer', label: 'Transferência' },
];

function getStudentInitials(name?: string) {
  const safeName = String(name || 'Aluno').trim();
  const parts = safeName.split(' ').filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return safeName.slice(0, 2).toUpperCase();
}

function getStudentAvatarUrl(student: any) {
  return (
    student?.avatar_url ||
    student?.photo_url ||
    student?.profile_photo_url ||
    student?.image_url ||
    ''
  );
}

function normalizeWhatsappPhone(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '');

  if (!digits) return '';

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

function StudentAvatar({ student }: { student: Student }) {
  const avatarUrl = getStudentAvatarUrl(student);
  const initials = getStudentInitials(student.name);

  if (avatarUrl) {
    return (
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
        <img
          src={avatarUrl}
          alt={student.name || 'Aluno'}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#ff2a32]/20 bg-[#ff2a32]/15 text-[15px] font-black text-[#ff2a32] shadow-[0_14px_35px_rgba(255,42,48,0.16)]">
      {initials}
    </div>
  );
}

function StudentStatusBadge({ status }: { status?: string }) {
  const normalized = String(status || 'active').toLowerCase();

  const label =
    normalized === 'active'
      ? 'Ativo'
      : normalized === 'paused'
        ? 'Pausado'
        : normalized === 'inactive'
          ? 'Inativo'
          : 'Ativo';

  const className =
    normalized === 'active'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
      : normalized === 'paused'
        ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300'
        : 'border-zinc-400/20 bg-zinc-400/10 text-zinc-300';

  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}

function AccessBadge({ student }: { student: Student }) {
  const accounts = student.student_accounts;

  const hasAccess =
    Boolean(student.auth_user_id) ||
    (Array.isArray(accounts)
      ? accounts.some((account) => account.auth_user_id)
      : Boolean((accounts as any)?.auth_user_id)) ||
    student.app_access_status === 'active' ||
    student.app_access_status === 'invited';

  const isBlocked =
    student.app_access_status === 'blocked' ||
    student.login_enabled === false;

  if (
    isBlocked &&
    (student.auth_user_id || (accounts as any)?.auth_user_id)
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/25 bg-red-400/10 px-2.5 py-1 text-[11px] font-bold text-red-300">
        <Lock className="h-3 w-3" />
        Bloqueado
      </span>
    );
  }

  return (
    <span
      className={
        hasAccess
          ? 'inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300'
          : 'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-zinc-400'
      }
    >
      <KeyRound className="h-3 w-3" />
      {hasAccess ? 'Com acesso' : 'Sem acesso'}
    </span>
  );
}

export function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { trainerProfile } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabKey>('resumo');
  const [loading, setLoading] = useState(true);

  const [student, setStudent] = useState<Student | null>(null);
  const [goals, setGoals] = useState<StudentGoals | null>(null);
  const [metrics, setMetrics] = useState<StudentMetrics[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState('');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    email: string;
    password: string;
    studentName: string;
    phone: string | null;
  } | null>(null);

  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [copiedText, setCopiedText] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    dueDate: '',
    description: '',
    method: 'pix',
  });

  const loadStudent = useCallback(async () => {
    if (!id || !trainerProfile) return;

    setLoading(true);
    setError('');

    try {
      const studentData = await studentService.getStudentById(id);

      if (!studentData) {
        setError('Aluno não encontrado');
        return;
      }

      setStudent(studentData);

      const [goalsData, paymentsData, workoutsData, messagesData] =
        await Promise.all([
          supabase
            .from('student_goals')
            .select('*')
            .eq('student_id', id)
            .maybeSingle(),
          paymentService.getPaymentsByStudent(id),
          workoutService.getWorkoutPlansByStudent(id),
          messageService.getMessages(trainerProfile.id, id),
        ]);

      setGoals(goalsData.data || null);
      setPayments(paymentsData);
      setWorkouts(workoutsData);
      setMessages(messagesData);

      const { data: metricsData } = await supabase
        .from('student_metrics')
        .select('*')
        .eq('student_id', id)
        .order('created_at', { ascending: false });

      setMetrics(metricsData || []);
    } catch (err) {
      console.error('Failed to load student:', err);
      setError('Erro ao carregar dados do aluno');
    } finally {
      setLoading(false);
    }
  }, [id, trainerProfile]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  useEffect(() => {
    if (!student) return;

    setEditForm({
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      birthDate: student.birth_date || '',
    });
  }, [student]);

  async function handleEditStudent() {
    if (!student) return;

    try {
      const updated = await studentService.updateStudent(student.id, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone || null,
        birth_date: editForm.birthDate || null,
      });

      setStudent(updated);
      setEditModalOpen(false);
    } catch (err) {
      console.error('Failed to update student:', err);
    }
  }

  async function handleCreatePayment() {
    if (!student || !trainerProfile || !paymentForm.amount) return;

    try {
      await paymentService.createPayment(trainerProfile.id, {
        student_id: student.id,
        student_name: student.name,
        amount: Number(paymentForm.amount),
        due_date: paymentForm.dueDate || undefined,
        description: paymentForm.description || undefined,
        method: paymentForm.method || undefined,
      });

      setPaymentModalOpen(false);

      setPaymentForm({
        amount: '',
        dueDate: '',
        description: '',
        method: 'pix',
      });

      const updated = await paymentService.getPaymentsByStudent(student.id);
      setPayments(updated);
    } catch (err) {
      console.error('Failed to create payment:', err);
    }
  }

  async function handleSendMessage() {
    if (!student || !trainerProfile || !chatInput.trim()) return;

    try {
      await messageService.sendMessage({
        trainer_id: trainerProfile.id,
        student_id: student.id,
        sender_role: 'personal',
        sender_id: trainerProfile.id,
        content: chatInput.trim(),
      });

      setChatInput('');

      const updated = await messageService.getMessages(
        trainerProfile.id,
        student.id
      );
      setMessages(updated);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }

  async function handleToggleAccess() {
    if (!student) return;

    try {
      const newStatus = student.login_enabled
        ? {
            login_enabled: false,
            app_access_status: 'blocked' as const,
          }
        : {
            login_enabled: true,
            app_access_status: 'active' as const,
          };

      const updated = await studentService.updateStudent(
        student.id,
        newStatus
      );
      setStudent(updated);
    } catch (err) {
      console.error('Failed to toggle access:', err);
    }
  }

  async function handleResetPassword() {
    if (!student) return;

    setResettingPassword(true);
    setPasswordError('');

    try {
      const studentName =
        student.name ||
        student.email?.split('@')[0] ||
        'Aluno';

      const { resetStudentPassword } = await import(
        '../../services/resetStudentPassword'
      );

      const tempPassword = await resetStudentPassword(
        student.id,
        student.email,
        studentName
      );

      setGeneratedCredentials({
        email: student.email,
        password: tempPassword,
        studentName,
        phone: student.phone,
      });

      setCredentialsModalOpen(true);
    } catch (err: any) {
      console.error('[RESET STUDENT PASSWORD]', err);
      setPasswordError(
        err?.message || 'Erro ao resetar senha do aluno.'
      );

      setTimeout(() => setPasswordError(''), 4000);
    } finally {
      setResettingPassword(false);
    }
  }

  function handleCopyCredentials() {
    if (!generatedCredentials) return;

    const text = `Email: ${generatedCredentials.email}\nSenha: ${generatedCredentials.password}`;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2000);
      })
      .catch(() => {});
  }

  function handleSendWhatsApp() {
    if (!generatedCredentials || !student) return;

    const msg = `Olá ${student.name}, seu acesso ao VSFit Personal foi criado:

Email: ${student.email}
Senha temporária: ${generatedCredentials.password}

Acesse o app e altere sua senha após o primeiro login.`;

    const phone = normalizeWhatsappPhone(student.phone);

    if (phone) {
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
        '_blank'
      );
      return;
    }

    navigator.clipboard
      .writeText(msg)
      .then(() => {
        setPasswordError(
          'Telefone não informado. Mensagem copiada para envio manual.'
        );

        setTimeout(() => setPasswordError(''), 4000);
      })
      .catch(() => {});
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header title="Carregando..." showBack />

        <div className="flex items-center justify-center pt-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ff2a32] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header title="Aluno" showBack />

        <EmptyState
          title="Aluno não encontrado"
          description={
            error || 'O aluno solicitado não foi encontrado'
          }
          action={
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
            >
              Voltar
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] text-white">
      <Header
        title="Perfil do Aluno"
        showBack
        right={
          <button
            type="button"
            onClick={() => setEditModalOpen(true)}
            className="flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-4 text-xs font-black tracking-wide text-white transition-all active:scale-95"
          >
            EDITAR
          </button>
        }
      />

      <div className="mx-auto w-full min-w-0 max-w-lg overflow-x-hidden px-4 pb-32 pt-4">
        <div className="mb-6 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-4">
            <StudentAvatar student={student} />

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-black tracking-[-0.02em] text-white">
                {student.name}
              </h1>

              <p className="truncate text-[13px] font-medium text-zinc-400">
                {student.email}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StudentStatusBadge status={student.status} />
                <AccessBadge student={student} />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-2 rounded-[22px] border border-white/5 bg-white/[0.03] p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex min-h-[46px] min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] px-1 text-[10px] font-black uppercase tracking-wide transition-all',
                  activeTab === tab.key
                    ? 'border border-[#ff2a32]/30 bg-[#ff2a32]/20 text-[#ff2a32] shadow-[0_8px_20px_rgba(255,42,48,0.12)]'
                    : 'text-zinc-500'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="max-w-full truncate">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {activeTab === 'resumo' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff2a32]/10">
                  <User className="h-4 w-4 text-[#ff2a32]" />
                </div>

                <h3 className="text-xs font-black uppercase tracking-[0.1em] text-zinc-500">
                  Dados do Aluno
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04]">
                    <Phone className="h-4 w-4 text-zinc-400" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                      Telefone
                    </p>

                    <p className="break-words text-sm font-black text-white">
                      {student.phone
                        ? formatPhone(student.phone)
                        : '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04]">
                    <Calendar className="h-4 w-4 text-zinc-400" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                      Nascimento
                    </p>

                    <p className="break-words text-sm font-black text-white">
                      {student.birth_date
                        ? formatDate(student.birth_date)
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff2a32]/10">
                  <Target className="h-4 w-4 text-[#ff2a32]" />
                </div>

                <h3 className="text-xs font-black uppercase tracking-[0.1em] text-zinc-500">
                  Metas e Objetivos
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    Objetivo
                  </p>

                  <p className="break-words text-sm font-black text-white">
                    {goals?.objective || '—'}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    Nível
                  </p>

                  <p className="break-words text-sm font-black text-white">
                    {goals?.level || '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="min-w-0 rounded-[24px] border border-white/5 bg-white/[0.03] p-6 text-center">
                <p className="text-3xl font-black text-[#ff2a32]">
                  {workouts.length}
                </p>

                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500">
                  Treinos
                </p>
              </div>

              <div className="min-w-0 rounded-[24px] border border-white/5 bg-white/[0.03] p-6 text-center">
                <p className="text-3xl font-black text-emerald-400">
                  {
                    payments.filter(
                      (payment) => payment.status === 'paid'
                    ).length
                  }
                </p>

                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500">
                  Pagamentos
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'treinos' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-w-0 space-y-6"
          >
            <div className="flex min-w-0 items-center justify-between gap-3">
              <h3 className="min-w-0 text-sm font-black uppercase tracking-[0.15em] text-zinc-500">
                Planos de Treino
              </h3>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/personal/workout-builder?studentId=${student.id}`
                  )
                }
                className="flex shrink-0 items-center gap-2 rounded-full bg-[#ff2a32] px-4 py-2 text-[11px] font-black tracking-wide text-white shadow-[0_12px_35px_rgba(255,42,48,0.22)] transition-all active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                NOVO
              </button>
            </div>

            {workouts.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/5 bg-white/[0.03]">
                      <Dumbbell className="h-10 w-10 text-zinc-700" />
                    </div>
                  }
                  title="Nenhum treino criado"
                  description="Comece criando o primeiro plano de treino personalizado para este aluno."
                  action={
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/personal/workout-builder?studentId=${student.id}`
                        )
                      }
                      className="mt-6 rounded-2xl bg-[#ff2a32] px-8 py-4 text-[14px] font-black text-white shadow-[0_15px_40px_rgba(255,42,48,0.3)] transition-all active:scale-95"
                    >
                      CRIAR PRIMEIRO TREINO
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="grid w-full min-w-0 max-w-full gap-3 overflow-hidden">
                {workouts.map((workout) => (
                  <button
                    key={workout.id}
                    type="button"
                    onClick={() =>
                      navigate(
                        `/personal/workout-builder?studentId=${student.id}&workoutId=${workout.id}`
                      )
                    }
                    className="block w-full min-w-0 max-w-full overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] p-4 text-left transition-all hover:border-white/10 active:scale-[0.98]"
                  >
                    <div className="flex w-full min-w-0 items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#ff2a32]/10 bg-[#ff2a32]/10">
                        <Dumbbell className="h-6 w-6 text-[#ff2a32]" />
                      </div>

                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex min-w-0 items-start gap-2">
                          <h4 className="min-w-0 flex-1 break-words text-[14px] font-black leading-tight tracking-tight text-white">
                            {workout.name}
                          </h4>

                          <div className="shrink-0">
                            <Badge status={workout.status} />
                          </div>
                        </div>

                        <p className="mt-1 min-w-0 break-words text-[11px] font-medium leading-relaxed text-zinc-400">
                          {workout.objective || 'Treino Geral'} •{' '}
                          {workout.level || 'Todos os níveis'}
                        </p>

                        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                          <div className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold text-zinc-500">
                            <Clock className="h-3.5 w-3.5" />
                            {workout.duration_minutes || '--'} min
                          </div>

                          <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold text-zinc-500">
                            <Activity className="h-3.5 w-3.5 shrink-0" />
                            <span className="break-words">
                              Frequência Livre
                            </span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="mt-3 h-5 w-5 shrink-0 text-zinc-700" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'progresso' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-zinc-500">
                Histórico de Medidas
              </h3>

              <button
                type="button"
                onClick={() => navigate('/personal/progress')}
                className="flex shrink-0 items-center gap-2 rounded-full border border-white/5 bg-white/[0.04] px-4 py-2 text-[11px] font-black tracking-wide text-zinc-400 transition-all active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                NOVA
              </button>
            </div>

            {metrics.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/5 bg-white/[0.03]">
                      <Ruler className="h-10 w-10 text-zinc-700" />
                    </div>
                  }
                  title="Nenhuma medida"
                  description="As avaliações físicas e progresso do aluno aparecerão listadas aqui."
                />
              </div>
            ) : (
              <div className="grid gap-4">
                {metrics.map((metric) => (
                  <div
                    key={metric.id}
                    className="min-w-0 rounded-[24px] border border-white/5 bg-white/[0.03] p-5"
                  >
                    <div className="mb-4 flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                        <Calendar className="h-3.5 w-3.5 text-blue-400" />
                      </div>

                      <p className="min-w-0 break-words text-[11px] font-black uppercase tracking-widest text-zinc-500">
                        {formatDateTime(metric.created_at)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {metric.weight && (
                        <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                            Peso
                          </span>

                          <p className="break-words text-lg font-black text-white">
                            {metric.weight}kg
                          </p>
                        </div>
                      )}

                      {metric.height && (
                        <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                            Altura
                          </span>

                          <p className="break-words text-lg font-black text-white">
                            {metric.height}m
                          </p>
                        </div>
                      )}

                      {metric.body_fat && (
                        <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                            Gordura
                          </span>

                          <p className="break-words text-lg font-black text-blue-400">
                            {metric.body_fat}%
                          </p>
                        </div>
                      )}

                      {metric.muscle_mass && (
                        <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                            Massa
                          </span>

                          <p className="break-words text-lg font-black text-emerald-400">
                            {metric.muscle_mass}kg
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'financeiro' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-zinc-500">
                Financeiro
              </h3>

              <button
                type="button"
                onClick={() => setPaymentModalOpen(true)}
                className="flex shrink-0 items-center gap-2 rounded-full bg-[#ff2a32] px-4 py-2 text-[11px] font-black tracking-wide text-white shadow-[0_12px_35px_rgba(255,42,48,0.22)] transition-all active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                NOVO
              </button>
            </div>

            {payments.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/5 bg-white/[0.03]">
                      <DollarSign className="h-10 w-10 text-zinc-700" />
                    </div>
                  }
                  title="Nenhum pagamento"
                  description="Registre as cobranças e mensalidades deste aluno para controle financeiro."
                  action={
                    <button
                      type="button"
                      onClick={() => setPaymentModalOpen(true)}
                      className="mt-6 rounded-2xl bg-[#ff2a32] px-8 py-4 text-[14px] font-black text-white shadow-[0_15px_40px_rgba(255,42,48,0.3)] transition-all active:scale-95"
                    >
                      ADICIONAR PAGAMENTO
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="grid gap-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="min-w-0 overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] p-5 transition-all active:scale-[0.98]"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex min-w-0 flex-wrap items-center gap-2">
                          <p className="min-w-0 break-words text-xl font-black text-white">
                            {formatCurrency(payment.amount)}
                          </p>

                          <div className="shrink-0">
                            <Badge status={payment.status} />
                          </div>
                        </div>

                        <p className="break-words text-[13px] font-bold text-zinc-300">
                          {payment.description || 'Sem descrição'}
                        </p>

                        <div className="mt-3 flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span className="break-words">
                            Vencimento:{' '}
                            {formatDate(payment.due_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'chat' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-zinc-500">
                Conversa
              </h3>

              <button
                type="button"
                onClick={() => navigate('/personal/chat')}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[11px] font-black text-white"
              >
                ABRIR CHAT
              </button>
            </div>

            <div className="hide-scrollbar flex max-h-[500px] min-w-0 flex-col gap-4 overflow-y-auto px-1">
              {messages.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    title="Nenhuma mensagem"
                    description="Inicie uma conversa direta com seu aluno através do chat do aplicativo."
                  />
                </div>
              ) : (
                messages.map((message) => {
                  const isPersonal =
                    message.sender_role === 'personal';

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        'flex min-w-0',
                        isPersonal
                          ? 'justify-end'
                          : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] min-w-0 overflow-hidden rounded-[20px] px-4 py-3 shadow-lg',
                          isPersonal
                            ? 'rounded-tr-sm bg-[#ff2a32] text-white'
                            : 'rounded-tl-sm border border-white/5 bg-white/[0.06] text-white'
                        )}
                      >
                        <p className="break-words text-sm font-medium leading-relaxed">
                          {message.content}
                        </p>

                        <p className="mt-1.5 break-words text-[9px] font-bold uppercase tracking-wider opacity-60">
                          {formatDateTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex min-w-0 gap-2 border-t border-white/5 pt-4">
              <input
                type="text"
                value={chatInput}
                onChange={(event) =>
                  setChatInput(event.target.value)
                }
                onKeyDown={(event) =>
                  event.key === 'Enter' &&
                  handleSendMessage()
                }
                placeholder="Escreva sua mensagem..."
                className="min-w-0 flex-1 rounded-[18px] border border-white/10 bg-white/[0.045] px-5 py-3.5 text-sm font-medium placeholder:text-zinc-600 transition-all focus:border-[#ff2a32]/40 focus:bg-white/[0.06] focus:outline-none"
              />

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!chatInput.trim()}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#ff2a32] text-white shadow-[0_12px_30px_rgba(255,42,48,0.22)] transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'dados' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-6">
              <div className="mb-6 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff2a32]/10">
                  <KeyRound className="h-4 w-4 text-[#ff2a32]" />
                </div>

                <h3 className="text-xs font-black uppercase tracking-[0.1em] text-zinc-500">
                  Controle de Acesso
                </h3>
              </div>

              <div className="space-y-4">
                <div className="rounded-[22px] border border-white/10 bg-white/[0.035] p-5">
                  <h4 className="text-[15px] font-black leading-tight text-white">
                    Acesso ao Aplicativo
                  </h4>

                  <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">
                    {student.login_enabled
                      ? 'O aluno pode realizar login e acessar seus treinos.'
                      : 'Acesso suspenso. O aluno não consegue acessar o app.'}
                  </p>

                  <button
                    type="button"
                    onClick={handleToggleAccess}
                    className={cn(
                      'mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] text-[13px] font-black tracking-wide transition-all active:scale-[0.98]',
                      student.login_enabled
                        ? 'border border-red-500/20 bg-red-500/10 text-red-400'
                        : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                    )}
                  >
                    {student.login_enabled ? (
                      <>
                        <Lock className="h-4 w-4" />
                        BLOQUEAR
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4" />
                        LIBERAR ACESSO
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-white/[0.035] p-5">
                  <h4 className="text-[15px] font-black leading-tight text-white">
                    Segurança da Conta
                  </h4>

                  <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">
                    Gera uma nova senha temporária e desconecta o aluno de outros dispositivos.
                  </p>

                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={resettingPassword}
                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.06] text-[13px] font-black tracking-wide text-white transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {resettingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        GERANDO...
                      </>
                    ) : (
                      <>
                        <Key className="h-4 w-4" />
                        RESETAR SENHA
                      </>
                    )}
                  </button>
                </div>

                {passwordError && (
                  <p className="mt-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs font-medium text-red-400">
                    {passwordError}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-6">
              <div className="mb-6 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff2a32]/10">
                  <Target className="h-4 w-4 text-[#ff2a32]" />
                </div>

                <h3 className="text-xs font-black uppercase tracking-[0.1em] text-zinc-500">
                  Mais Metas
                </h3>
              </div>

              {goals ? (
                <div className="grid gap-4">
                  <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Frequência Semanal
                    </p>

                    <p className="break-words text-sm font-black text-white">
                      {goals.weekly_frequency
                        ? `${goals.weekly_frequency}x por semana`
                        : 'Não informada'}
                    </p>
                  </div>

                  <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Peso Alvo
                    </p>

                    <p className="break-words text-sm font-black text-[#ff2a32]">
                      {goals.target_weight
                        ? `${goals.target_weight}kg`
                        : 'Não informado'}
                    </p>
                  </div>

                  {goals.goal_notes && (
                    <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Observações
                      </p>

                      <p className="break-words text-xs font-medium leading-relaxed text-zinc-400">
                        {goals.goal_notes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="py-4 text-center text-sm font-medium italic text-zinc-500">
                  Nenhuma meta adicional registrada.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Aluno"
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            value={editForm.name}
            onChange={(event) =>
              setEditForm({
                ...editForm,
                name: event.target.value,
              })
            }
          />

          <Input
            label="Email"
            type="email"
            value={editForm.email}
            onChange={(event) =>
              setEditForm({
                ...editForm,
                email: event.target.value,
              })
            }
          />

          <Input
            label="Telefone"
            value={editForm.phone}
            onChange={(event) =>
              setEditForm({
                ...editForm,
                phone: event.target.value,
              })
            }
          />

          <Input
            label="Data de Nascimento"
            type="date"
            value={editForm.birthDate}
            onChange={(event) =>
              setEditForm({
                ...editForm,
                birthDate: event.target.value,
              })
            }
          />

          <Button onClick={handleEditStudent}>
            <Save className="h-4 w-4" />
            Salvar Alterações
          </Button>
        </div>
      </Modal>

      <Modal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Novo Pagamento"
      >
        <div className="space-y-4">
          <Input
            label="Valor"
            type="number"
            step="0.01"
            placeholder="0,00"
            value={paymentForm.amount}
            onChange={(event) =>
              setPaymentForm({
                ...paymentForm,
                amount: event.target.value,
              })
            }
          />

          <Input
            label="Data de Vencimento"
            type="date"
            value={paymentForm.dueDate}
            onChange={(event) =>
              setPaymentForm({
                ...paymentForm,
                dueDate: event.target.value,
              })
            }
          />

          <Input
            label="Descrição"
            placeholder="Ex: Mensalidade Junho"
            value={paymentForm.description}
            onChange={(event) =>
              setPaymentForm({
                ...paymentForm,
                description: event.target.value,
              })
            }
          />

          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
              Método
            </span>

            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() =>
                    setPaymentForm({
                      ...paymentForm,
                      method: method.value,
                    })
                  }
                  className={cn(
                    'min-h-12 rounded-2xl border px-3 py-2 text-[11px] font-black transition-all active:scale-[0.97]',
                    paymentForm.method === method.value
                      ? 'border-[#ff2a32]/40 bg-[#ff2a32]/15 text-[#ff2a32] shadow-[0_12px_30px_rgba(255,42,48,0.18)]'
                      : 'border-white/10 bg-white/[0.045] text-zinc-400'
                  )}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleCreatePayment}>
            <Plus className="h-4 w-4" />
            Criar Pagamento
          </Button>
        </div>
      </Modal>

      {generatedCredentials && credentialsModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() =>
              setCredentialsModalOpen(false)
            }
            className="absolute inset-0"
          />

          <div className="relative w-full max-w-[370px] overflow-hidden rounded-[32px] border border-white/10 bg-[#080808] shadow-[0_24px_90px_rgba(0,0,0,0.85)]">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-emerald-500/20 to-transparent" />

            <button
              type="button"
              onClick={() =>
                setCredentialsModalOpen(false)
              }
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-300"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative p-5 pt-7">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-500/15 text-emerald-400 shadow-[0_18px_45px_rgba(16,185,129,0.22)]">
                <KeyRound className="h-8 w-8" />
              </div>

              <h2 className="mt-5 text-center text-[22px] font-black tracking-[-0.04em] text-white">
                Senha temporária gerada
              </h2>

              <p className="mt-2 text-center text-[13px] leading-relaxed text-zinc-400">
                Envie essas credenciais para o aluno acessar o aplicativo.
              </p>

              <div className="mt-5 rounded-[24px] border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                <p className="text-[13px] font-bold text-emerald-300">
                  Acesso criado com sucesso!
                </p>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-[18px] border border-white/10 bg-white/[0.045] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                    Aluno
                  </p>

                  <p className="mt-1 break-words text-[14px] font-black text-white">
                    {generatedCredentials.studentName}
                  </p>
                </div>

                <div className="rounded-[18px] border border-white/10 bg-white/[0.045] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                    Email
                  </p>

                  <p className="mt-1 break-all text-[14px] font-black text-white">
                    {generatedCredentials.email}
                  </p>
                </div>

                <div className="rounded-[18px] border border-[#ff2a32]/20 bg-[#ff2a32]/10 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-red-300">
                    Senha temporária
                  </p>

                  <p className="mt-1 break-all text-[18px] font-black tracking-wide text-[#ff2a32]">
                    {generatedCredentials.password}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="h-12 rounded-[18px] border border-white/10 bg-white/[0.06] text-[14px] font-black text-white active:scale-[0.98]"
                >
                  {copiedText ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Check className="h-4 w-4" />
                      Copiado
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      <Copy className="h-4 w-4" />
                      Copiar
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="h-12 rounded-[18px] border border-white/10 bg-white/[0.06] text-[14px] font-black text-white active:scale-[0.98]"
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Send className="h-4 w-4" />
                    WhatsApp
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCredentialsModalOpen(false)
                }
                className="mt-3 h-12 w-full rounded-[18px] bg-[#ff2a32] text-[14px] font-black text-white shadow-[0_18px_45px_rgba(255,42,48,0.32)] active:scale-[0.98]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentProfilePage;