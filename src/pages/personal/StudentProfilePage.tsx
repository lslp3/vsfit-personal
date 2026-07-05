import {
  useCallback,
  useEffect,
  useState,
  type ElementType,
} from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Check,
  ChevronRight,
  Copy,
  DollarSign,
  Dumbbell,
  FileText,
  Key,
  KeyRound,
  Loader2,
  Lock,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Save,
  Send,
  Target,
  Trash2,
  TrendingUp,
  Unlock,
  User,
  X,
} from 'lucide-react';

import { Header } from '../../components/ui/Header';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

import { useAuthStore } from '../../store/authStore';
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
  Message,
  Payment,
  Student,
  StudentGoals,
  StudentMetrics,
  WorkoutPlan,
} from '../../types/database';

type TabKey =
  | 'resumo'
  | 'treinos'
  | 'progresso'
  | 'financeiro'
  | 'chat'
  | 'dados';

type Credentials = {
  email: string;
  password: string;
  studentName: string;
  phone: string | null;
};

const tabs: {
  key: TabKey;
  label: string;
  icon: ElementType;
}[] = [
  {
    key: 'resumo',
    label: 'Resumo',
    icon: User,
  },
  {
    key: 'treinos',
    label: 'Treinos',
    icon: Dumbbell,
  },
  {
    key: 'progresso',
    label: 'Progresso',
    icon: TrendingUp,
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    icon: DollarSign,
  },
  {
    key: 'chat',
    label: 'Chat',
    icon: MessageSquare,
  },
  {
    key: 'dados',
    label: 'Dados',
    icon: FileText,
  },
];

const PAYMENT_METHODS = [
  {
    value: 'pix',
    label: 'PIX',
  },
  {
    value: 'credit_card',
    label: 'Cartão',
  },
  {
    value: 'cash',
    label: 'Dinheiro',
  },
  {
    value: 'transfer',
    label: 'Transferência',
  },
];

function getStudentInitials(name?: string) {
  const safeName = String(
    name || 'Aluno'
  ).trim();

  const parts = safeName
    .split(' ')
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return safeName
    .slice(0, 2)
    .toUpperCase();
}

function getStudentAvatarUrl(
  student: Student
) {
  const record =
    student as unknown as Record<
      string,
      string | null
    >;

  return (
    record.avatar_url ||
    record.photo_url ||
    record.profile_photo_url ||
    record.image_url ||
    ''
  );
}

function normalizeWhatsappPhone(
  value?: string | null
) {
  const digits = String(
    value || ''
  ).replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (
    digits.length === 10 ||
    digits.length === 11
  ) {
    return `55${digits}`;
  }

  return digits;
}

function StudentAvatar({
  student,
}: {
  student: Student;
}) {
  const avatarUrl =
    getStudentAvatarUrl(student);

  const initials =
    getStudentInitials(student.name);

  if (avatarUrl) {
    return (
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
        <img
          src={avatarUrl}
          alt={
            student.name || 'Aluno'
          }
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display =
              'none';
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#ff2a32]/20 bg-[#ff2a32]/15 text-[15px] font-black text-[#ff2a32]">
      {initials}
    </div>
  );
}

function StudentStatusBadge({
  status,
}: {
  status?: string;
}) {
  const normalized = String(
    status || 'active'
  ).toLowerCase();

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
      className={cn(
        'rounded-full border px-2.5 py-1 text-[10px] font-black uppercase',
        className
      )}
    >
      {label}
    </span>
  );
}

function AccessBadge({
  student,
}: {
  student: Student;
}) {
  const accounts =
    student.student_accounts;

  const accountHasAccess =
    Array.isArray(accounts)
      ? accounts.some(
          (account) =>
            account.auth_user_id
        )
      : Boolean(
          (
            accounts as unknown as {
              auth_user_id?: string;
            }
          )?.auth_user_id
        );

  const hasAccess =
    Boolean(student.auth_user_id) ||
    accountHasAccess ||
    student.app_access_status ===
      'active' ||
    student.app_access_status ===
      'invited';

  const blocked =
    student.app_access_status ===
      'blocked' ||
    student.login_enabled === false;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold',
        blocked
          ? 'border-red-400/25 bg-red-400/10 text-red-300'
          : hasAccess
            ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
            : 'border-white/10 bg-white/[0.04] text-zinc-400'
      )}
    >
      {blocked ? (
        <Lock className="h-3 w-3" />
      ) : (
        <KeyRound className="h-3 w-3" />
      )}

      {blocked
        ? 'Bloqueado'
        : hasAccess
          ? 'Com acesso'
          : 'Sem acesso'}
    </span>
  );
}

function getWorkoutStatusLabel(
  workout: WorkoutPlan
) {
  const status = String(
    workout.status || ''
  ).toLowerCase();

  if (status === 'published') {
    return 'Publicado';
  }

  if (status === 'draft') {
    return 'Rascunho';
  }

  if (status === 'archived') {
    return 'Arquivado';
  }

  return status || 'Treino';
}

function getWorkoutStatusClass(
  workout: WorkoutPlan
) {
  const status = String(
    workout.status || ''
  ).toLowerCase();

  if (status === 'published') {
    return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300';
  }

  if (status === 'draft') {
    return 'border-yellow-400/25 bg-yellow-400/10 text-yellow-300';
  }

  return 'border-white/10 bg-white/[0.05] text-zinc-400';
}

export function StudentProfilePage() {
  const { id } =
    useParams<{ id: string }>();

  const navigate = useNavigate();

  const { trainerProfile } =
    useAuthStore();

  const [activeTab, setActiveTab] =
    useState<TabKey>('resumo');

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [student, setStudent] =
    useState<Student | null>(null);

  const [goals, setGoals] =
    useState<StudentGoals | null>(
      null
    );

  const [metrics, setMetrics] =
    useState<StudentMetrics[]>([]);

  const [workouts, setWorkouts] =
    useState<WorkoutPlan[]>([]);

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [
    deletingWorkoutId,
    setDeletingWorkoutId,
  ] = useState<string | null>(
    null
  );

  const [
    editModalOpen,
    setEditModalOpen,
  ] = useState(false);

  const [
    paymentModalOpen,
    setPaymentModalOpen,
  ] = useState(false);

  const [chatInput, setChatInput] =
    useState('');

  const [
    credentialsModalOpen,
    setCredentialsModalOpen,
  ] = useState(false);

  const [
    generatedCredentials,
    setGeneratedCredentials,
  ] = useState<Credentials | null>(
    null
  );

  const [
    resettingPassword,
    setResettingPassword,
  ] = useState(false);

  const [
    passwordError,
    setPasswordError,
  ] = useState('');

  const [copiedText, setCopiedText] =
    useState(false);

  const [editForm, setEditForm] =
    useState({
      name: '',
      email: '',
      phone: '',
      birthDate: '',
    });

  const [
    paymentForm,
    setPaymentForm,
  ] = useState({
    amount: '',
    dueDate: '',
    description: '',
    method: 'pix',
  });

  const loadStudent =
    useCallback(async () => {
      if (
        !id ||
        !trainerProfile?.id
      ) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const studentData =
          await studentService.getStudentById(
            id
          );

        if (!studentData) {
          throw new Error(
            'Aluno não encontrado.'
          );
        }

        const [
          goalsResult,
          paymentsResult,
          workoutsResult,
          messagesResult,
          metricsResult,
        ] = await Promise.all([
          supabase
            .from('student_goals')
            .select('*')
            .eq('student_id', id)
            .maybeSingle(),

          paymentService.getPaymentsByStudent(
            id
          ),

          workoutService.getWorkoutPlansByStudent(
            id
          ),

          messageService.getMessages(
            trainerProfile.id,
            id
          ),

          supabase
            .from('student_metrics')
            .select('*')
            .eq('student_id', id)
            .order('created_at', {
              ascending: false,
            }),
        ]);

        setStudent(studentData);

        setGoals(
          goalsResult.data || null
        );

        setPayments(
          paymentsResult || []
        );

        setWorkouts(
          workoutsResult || []
        );

        setMessages(
          messagesResult || []
        );

        setMetrics(
          metricsResult.data || []
        );
      } catch (
        loadError: unknown
      ) {
        console.error(
          '[StudentProfilePage] load:',
          loadError
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Erro ao carregar dados do aluno.'
        );
      } finally {
        setLoading(false);
      }
    }, [
      id,
      trainerProfile?.id,
    ]);

  useEffect(() => {
    void loadStudent();
  }, [loadStudent]);

  useEffect(() => {
    if (!student) {
      return;
    }

    setEditForm({
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      birthDate:
        student.birth_date || '',
    });
  }, [student]);

  async function handleEditStudent() {
    if (!student) {
      return;
    }

    setError('');

    try {
      const updated =
        await studentService.updateStudent(
          student.id,
          {
            name:
              editForm.name.trim(),
            email:
              editForm.email.trim(),
            phone:
              editForm.phone.trim() ||
              null,
            birth_date:
              editForm.birthDate ||
              null,
          }
        );

      setStudent(updated);
      setEditModalOpen(false);
    } catch (
      updateError: unknown
    ) {
      console.error(
        '[StudentProfilePage] update student:',
        updateError
      );

      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Erro ao editar o aluno.'
      );
    }
  }

  async function handleDeleteWorkout(
    workout: WorkoutPlan
  ) {
    if (!trainerProfile?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        `Tem certeza que deseja excluir o treino "${workout.name}"?\n\nEsta ação não poderá ser desfeita.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingWorkoutId(
      workout.id
    );

    setError('');

    try {
      const {
        error: exercisesError,
      } = await supabase
        .from(
          'workout_plan_exercises'
        )
        .delete()
        .eq(
          'workout_plan_id',
          workout.id
        );

      if (exercisesError) {
        throw exercisesError;
      }

      const {
        error: groupsError,
      } = await supabase
        .from(
          'workout_exercise_groups'
        )
        .delete()
        .eq(
          'workout_plan_id',
          workout.id
        );

      if (groupsError) {
        throw groupsError;
      }

      const {
        error: daysError,
      } = await supabase
        .from('workout_days')
        .delete()
        .eq(
          'workout_plan_id',
          workout.id
        );

      if (daysError) {
        throw daysError;
      }

      const {
        error: planError,
      } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', workout.id)
        .eq(
          'trainer_id',
          trainerProfile.id
        );

      if (planError) {
        throw planError;
      }

      setWorkouts((previous) =>
        previous.filter(
          (item) =>
            item.id !== workout.id
        )
      );
    } catch (
      deleteError: unknown
    ) {
      console.error(
        '[StudentProfilePage] delete workout:',
        deleteError
      );

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Erro ao excluir o treino.'
      );
    } finally {
      setDeletingWorkoutId(null);
    }
  }

  async function handleCreatePayment() {
    if (
      !student ||
      !trainerProfile?.id ||
      !paymentForm.amount
    ) {
      return;
    }

    setError('');

    try {
      await paymentService.createPayment(
        trainerProfile.id,
        {
          student_id: student.id,
          student_name:
            student.name,
          amount: Number(
            paymentForm.amount
          ),
          due_date:
            paymentForm.dueDate ||
            undefined,
          description:
            paymentForm.description ||
            undefined,
          method:
            paymentForm.method ||
            undefined,
        }
      );

      setPaymentModalOpen(false);

      setPaymentForm({
        amount: '',
        dueDate: '',
        description: '',
        method: 'pix',
      });

      const updated =
        await paymentService.getPaymentsByStudent(
          student.id
        );

      setPayments(updated);
    } catch (
      paymentError: unknown
    ) {
      console.error(
        '[StudentProfilePage] payment:',
        paymentError
      );

      setError(
        paymentError instanceof Error
          ? paymentError.message
          : 'Erro ao criar pagamento.'
      );
    }
  }

  async function handleSendMessage() {
    if (
      !student ||
      !trainerProfile?.id ||
      !chatInput.trim()
    ) {
      return;
    }

    try {
      await messageService.sendMessage({
        trainer_id:
          trainerProfile.id,
        student_id: student.id,
        sender_role: 'personal',
        sender_id:
          trainerProfile.id,
        content: chatInput.trim(),
      });

      setChatInput('');

      const updated =
        await messageService.getMessages(
          trainerProfile.id,
          student.id
        );

      setMessages(updated);
    } catch (
      messageError: unknown
    ) {
      console.error(
        '[StudentProfilePage] message:',
        messageError
      );

      setError(
        messageError instanceof Error
          ? messageError.message
          : 'Erro ao enviar mensagem.'
      );
    }
  }

  async function handleToggleAccess() {
    if (!student) {
      return;
    }

    try {
      const newStatus =
        student.login_enabled
          ? {
              login_enabled: false,
              app_access_status:
                'blocked' as const,
            }
          : {
              login_enabled: true,
              app_access_status:
                'active' as const,
            };

      const updated =
        await studentService.updateStudent(
          student.id,
          newStatus
        );

      setStudent(updated);
    } catch (
      accessError: unknown
    ) {
      console.error(
        '[StudentProfilePage] access:',
        accessError
      );

      setError(
        accessError instanceof Error
          ? accessError.message
          : 'Erro ao alterar acesso.'
      );
    }
  }

  async function handleResetPassword() {
    if (!student) {
      return;
    }

    setResettingPassword(true);
    setPasswordError('');

    try {
      const studentName =
        student.name ||
        student.email?.split(
          '@'
        )[0] ||
        'Aluno';

      const {
        resetStudentPassword,
      } = await import(
        '../../services/resetStudentPassword'
      );

      const password =
        await resetStudentPassword(
          student.id,
          student.email,
          studentName
        );

      setGeneratedCredentials({
        email: student.email,
        password,
        studentName,
        phone:
          student.phone || null,
      });

      setCredentialsModalOpen(
        true
      );
    } catch (
      resetError: unknown
    ) {
      console.error(
        '[StudentProfilePage] reset password:',
        resetError
      );

      setPasswordError(
        resetError instanceof Error
          ? resetError.message
          : 'Erro ao resetar senha.'
      );
    } finally {
      setResettingPassword(
        false
      );
    }
  }

  function handleCopyCredentials() {
    if (!generatedCredentials) {
      return;
    }

    const text = `Email: ${generatedCredentials.email}\nSenha: ${generatedCredentials.password}`;

    void navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedText(true);

        window.setTimeout(() => {
          setCopiedText(false);
        }, 2000);
      });
  }

  function handleSendWhatsApp() {
    if (
      !generatedCredentials ||
      !student
    ) {
      return;
    }

    const message = `Olá ${student.name}, seu acesso ao VSFit Personal foi criado:

Email: ${generatedCredentials.email}
Senha temporária: ${generatedCredentials.password}

Acesse o aplicativo e altere sua senha após o primeiro login.`;

    const phone =
      normalizeWhatsappPhone(
        generatedCredentials.phone
      );

    if (phone) {
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(
          message
        )}`,
        '_blank'
      );

      return;
    }

    void navigator.clipboard.writeText(
      message
    );

    setPasswordError(
      'Telefone não informado. A mensagem foi copiada.'
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header
          title="Carregando..."
          showBack
        />

        <div className="flex items-center justify-center pt-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#ff2a32]" />
        </div>
      </div>
    );
  }

  if (error && !student) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header
          title="Aluno"
          showBack
        />

        <EmptyState
          title="Aluno não encontrado"
          description={error}
          action={
            <Button
              variant="secondary"
              onClick={() =>
                navigate(-1)
              }
            >
              Voltar
            </Button>
          }
        />
      </div>
    );
  }

  if (!student) {
    return null;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] text-white">
      <Header
        title="Perfil do Aluno"
        showBack
        right={
          <button
            type="button"
            onClick={() =>
              setEditModalOpen(true)
            }
            className="flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-4 text-xs font-black text-white"
          >
            EDITAR
          </button>
        }
      />

      <div className="mx-auto w-full max-w-lg px-4 pb-32 pt-4">
        {error && (
          <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mb-6 rounded-[24px] border border-white/10 bg-white/[0.045] p-5">
          <div className="flex items-center gap-4">
            <StudentAvatar
              student={student}
            />

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-black">
                {student.name}
              </h1>

              <p className="truncate text-[13px] text-zinc-400">
                {student.email}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <StudentStatusBadge
                  status={
                    student.status
                  }
                />

                <AccessBadge
                  student={student}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mb-6 grid grid-cols-3 gap-2 rounded-[22px] border border-white/5 bg-white/[0.03] p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() =>
                  setActiveTab(tab.key)
                }
                className={cn(
                  'flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-[16px] px-1 text-[10px] font-black uppercase',
                  activeTab ===
                    tab.key
                    ? 'border border-[#ff2a32]/30 bg-[#ff2a32]/20 text-[#ff2a32]'
                    : 'text-zinc-500'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab ===
          'resumo' && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="space-y-4"
          >
            <SectionCard
              title="Dados do aluno"
              icon={User}
            >
              <InfoRow
                icon={Phone}
                label="Telefone"
                value={
                  student.phone
                    ? formatPhone(
                        student.phone
                      )
                    : 'Não informado'
                }
              />

              <InfoRow
                icon={Calendar}
                label="Nascimento"
                value={
                  student.birth_date
                    ? formatDate(
                        student.birth_date
                      )
                    : 'Não informado'
                }
              />
            </SectionCard>

            <SectionCard
              title="Metas"
              icon={Target}
            >
              <div className="grid grid-cols-2 gap-3">
                <InfoBox
                  label="Objetivo"
                  value={
                    goals?.objective ||
                    'Não informado'
                  }
                />

                <InfoBox
                  label="Nível"
                  value={
                    goals?.level ||
                    'Não informado'
                  }
                />

                <InfoBox
                  label="Frequência"
                  value={
                    goals?.weekly_frequency
                      ? `${goals.weekly_frequency}x por semana`
                      : 'Não informada'
                  }
                />

                <InfoBox
                  label="Peso-alvo"
                  value={
                    goals?.target_weight
                      ? `${goals.target_weight} kg`
                      : 'Não informado'
                  }
                />
              </div>
            </SectionCard>

            <div className="grid grid-cols-2 gap-3">
              <CounterCard
                value={workouts.length}
                label="Treinos"
              />

              <CounterCard
                value={
                  payments.filter(
                    (payment) =>
                      payment.status ===
                      'paid'
                  ).length
                }
                label="Pagamentos"
              />
            </div>
          </motion.div>
        )}

        {activeTab ===
          'treinos' && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black uppercase text-zinc-500">
                Planos de treino
              </h2>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/personal/workout-builder?studentId=${student.id}`
                  )
                }
                className="flex items-center gap-2 rounded-full bg-[#ff2a32] px-4 py-2 text-[11px] font-black"
              >
                <Plus className="h-4 w-4" />
                NOVO
              </button>
            </div>

            {workouts.length === 0 ? (
              <EmptyState
                title="Nenhum treino criado"
                description="Crie o primeiro plano de treino para este aluno."
                action={
                  <Button
                    onClick={() =>
                      navigate(
                        `/personal/workout-builder?studentId=${student.id}`
                      )
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Criar treino
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {workouts.map(
                  (workout) => (
                    <article
                      key={workout.id}
                      className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/personal/workout-builder?studentId=${student.id}&workoutId=${workout.id}`
                          )
                        }
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ff2a32]/15 text-[#ff2a32]">
                            <Dumbbell className="h-6 w-6" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  'rounded-full border px-2.5 py-1 text-[9px] font-black uppercase',
                                  getWorkoutStatusClass(
                                    workout
                                  )
                                )}
                              >
                                {getWorkoutStatusLabel(
                                  workout
                                )}
                              </span>
                            </div>

                            <h3 className="mt-2 truncate text-base font-black">
                              {workout.name}
                            </h3>

                            <p className="mt-1 text-xs text-zinc-500">
                              {workout.objective ||
                                'Treino personalizado'}
                            </p>
                          </div>

                          <ChevronRight className="h-5 w-5 text-zinc-700" />
                        </div>
                      </button>

                      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/personal/workout-builder?studentId=${student.id}&workoutId=${workout.id}`
                            )
                          }
                          className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] text-[11px] font-black"
                        >
                          <Pencil className="h-4 w-4" />
                          EDITAR
                        </button>

                        <button
                          type="button"
                          disabled={
                            deletingWorkoutId ===
                            workout.id
                          }
                          onClick={() =>
                            void handleDeleteWorkout(
                              workout
                            )
                          }
                          className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 text-[11px] font-black text-red-300 disabled:opacity-50"
                        >
                          {deletingWorkoutId ===
                          workout.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}

                          EXCLUIR
                        </button>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab ===
          'progresso' && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black uppercase text-zinc-500">
                Progresso
              </h2>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/personal/progress'
                  )
                }
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-black"
              >
                <Plus className="h-4 w-4" />
                NOVA
              </button>
            </div>

            {metrics.length === 0 ? (
              <EmptyState
                title="Nenhuma medida"
                description="As avaliações físicas aparecerão aqui."
              />
            ) : (
              <div className="space-y-3">
                {metrics.map(
                  (metric) => (
                    <article
                      key={metric.id}
                      className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4"
                    >
                      <p className="mb-3 text-[10px] font-black uppercase text-zinc-500">
                        {formatDateTime(
                          metric.created_at
                        )}
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <MetricBox
                          label="Peso"
                          value={
                            metric.weight
                              ? `${metric.weight} kg`
                              : '—'
                          }
                        />

                        <MetricBox
                          label="Altura"
                          value={
                            metric.height
                              ? `${metric.height} m`
                              : '—'
                          }
                        />

                        <MetricBox
                          label="Gordura"
                          value={
                            metric.body_fat
                              ? `${metric.body_fat}%`
                              : '—'
                          }
                        />

                        <MetricBox
                          label="Massa muscular"
                          value={
                            metric.muscle_mass
                              ? `${metric.muscle_mass} kg`
                              : '—'
                          }
                        />
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab ===
          'financeiro' && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase text-zinc-500">
                Financeiro
              </h2>

              <button
                type="button"
                onClick={() =>
                  setPaymentModalOpen(
                    true
                  )
                }
                className="flex items-center gap-2 rounded-full bg-[#ff2a32] px-4 py-2 text-[11px] font-black"
              >
                <Plus className="h-4 w-4" />
                NOVO
              </button>
            </div>

            {payments.length === 0 ? (
              <EmptyState
                title="Nenhum pagamento"
                description="As cobranças deste aluno aparecerão aqui."
              />
            ) : (
              <div className="space-y-3">
                {payments.map(
                  (payment) => (
                    <article
                      key={payment.id}
                      className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xl font-black">
                            {formatCurrency(
                              payment.amount
                            )}
                          </p>

                          <p className="mt-1 text-sm text-zinc-400">
                            {payment.description ||
                              'Sem descrição'}
                          </p>
                        </div>

                        <Badge
                          status={
                            payment.status
                          }
                        />
                      </div>

                      <p className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                        <Calendar className="h-4 w-4" />
                        Vencimento:{' '}
                        {payment.due_date
                          ? formatDate(
                              payment.due_date
                            )
                          : 'Não definido'}
                      </p>
                    </article>
                  )
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab ===
          'chat' && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="space-y-4"
          >
            <h2 className="text-sm font-black uppercase text-zinc-500">
              Conversa
            </h2>

            <div className="max-h-[480px] space-y-3 overflow-y-auto">
              {messages.length === 0 ? (
                <EmptyState
                  title="Nenhuma mensagem"
                  description="Inicie uma conversa com o aluno."
                />
              ) : (
                messages.map(
                  (message) => {
                    const personal =
                      message.sender_role ===
                      'personal';

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          'flex',
                          personal
                            ? 'justify-end'
                            : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[85%] rounded-[20px] px-4 py-3',
                            personal
                              ? 'rounded-tr-sm bg-[#ff2a32]'
                              : 'rounded-tl-sm border border-white/10 bg-white/[0.06]'
                          )}
                        >
                          <p className="break-words text-sm">
                            {message.content}
                          </p>

                          <p className="mt-1 text-[9px] opacity-60">
                            {formatDateTime(
                              message.created_at
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>

            <div className="flex gap-2 border-t border-white/10 pt-4">
              <input
                value={chatInput}
                onChange={(event) =>
                  setChatInput(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    void handleSendMessage();
                  }
                }}
                placeholder="Escreva sua mensagem..."
                className="min-w-0 flex-1 rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none"
              />

              <button
                type="button"
                disabled={
                  !chatInput.trim()
                }
                onClick={() =>
                  void handleSendMessage()
                }
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#ff2a32] disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}

        {activeTab ===
          'dados' && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="space-y-4"
          >
            <SectionCard
              title="Controle de acesso"
              icon={KeyRound}
            >
              <p className="text-sm text-zinc-400">
                {student.login_enabled
                  ? 'O aluno pode acessar o aplicativo.'
                  : 'O acesso do aluno está bloqueado.'}
              </p>

              <button
                type="button"
                onClick={() =>
                  void handleToggleAccess()
                }
                className={cn(
                  'mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] text-sm font-black',
                  student.login_enabled
                    ? 'border border-red-400/20 bg-red-400/10 text-red-300'
                    : 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                )}
              >
                {student.login_enabled ? (
                  <>
                    <Lock className="h-4 w-4" />
                    BLOQUEAR ACESSO
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" />
                    LIBERAR ACESSO
                  </>
                )}
              </button>
            </SectionCard>

            <SectionCard
              title="Segurança"
              icon={Key}
            >
              <p className="text-sm text-zinc-400">
                Gere uma nova senha temporária para o aluno.
              </p>

              <button
                type="button"
                disabled={
                  resettingPassword
                }
                onClick={() =>
                  void handleResetPassword()
                }
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.06] text-sm font-black disabled:opacity-50"
              >
                {resettingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Key className="h-4 w-4" />
                )}

                RESETAR SENHA
              </button>

              {passwordError && (
                <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300">
                  {passwordError}
                </p>
              )}
            </SectionCard>
          </motion.div>
        )}
      </div>

      <Modal
        open={editModalOpen}
        onClose={() =>
          setEditModalOpen(false)
        }
        title="Editar Aluno"
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            value={editForm.name}
            onChange={(event) =>
              setEditForm(
                (previous) => ({
                  ...previous,
                  name:
                    event.target.value,
                })
              )
            }
          />

          <Input
            label="Email"
            type="email"
            value={editForm.email}
            onChange={(event) =>
              setEditForm(
                (previous) => ({
                  ...previous,
                  email:
                    event.target.value,
                })
              )
            }
          />

          <Input
            label="Telefone"
            value={editForm.phone}
            onChange={(event) =>
              setEditForm(
                (previous) => ({
                  ...previous,
                  phone:
                    event.target.value,
                })
              )
            }
          />

          <Input
            label="Data de nascimento"
            type="date"
            value={
              editForm.birthDate
            }
            onChange={(event) =>
              setEditForm(
                (previous) => ({
                  ...previous,
                  birthDate:
                    event.target.value,
                })
              )
            }
          />

          <Button
            onClick={() =>
              void handleEditStudent()
            }
          >
            <Save className="h-4 w-4" />
            Salvar alterações
          </Button>
        </div>
      </Modal>

      <Modal
        open={paymentModalOpen}
        onClose={() =>
          setPaymentModalOpen(false)
        }
        title="Novo Pagamento"
      >
        <div className="space-y-4">
          <Input
            label="Valor"
            type="number"
            step="0.01"
            value={
              paymentForm.amount
            }
            onChange={(event) =>
              setPaymentForm(
                (previous) => ({
                  ...previous,
                  amount:
                    event.target.value,
                })
              )
            }
          />

          <Input
            label="Vencimento"
            type="date"
            value={
              paymentForm.dueDate
            }
            onChange={(event) =>
              setPaymentForm(
                (previous) => ({
                  ...previous,
                  dueDate:
                    event.target.value,
                })
              )
            }
          />

          <Input
            label="Descrição"
            value={
              paymentForm.description
            }
            onChange={(event) =>
              setPaymentForm(
                (previous) => ({
                  ...previous,
                  description:
                    event.target.value,
                })
              )
            }
          />

          <div>
            <p className="mb-2 text-[10px] font-black uppercase text-zinc-500">
              Método
            </p>

            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(
                (method) => (
                  <button
                    key={
                      method.value
                    }
                    type="button"
                    onClick={() =>
                      setPaymentForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          method:
                            method.value,
                        })
                      )
                    }
                    className={cn(
                      'h-11 rounded-2xl border text-[11px] font-black',
                      paymentForm.method ===
                        method.value
                        ? 'border-[#ff2a32]/40 bg-[#ff2a32]/15 text-[#ff2a32]'
                        : 'border-white/10 bg-white/[0.04] text-zinc-400'
                    )}
                  >
                    {method.label}
                  </button>
                )
              )}
            </div>
          </div>

          <Button
            onClick={() =>
              void handleCreatePayment()
            }
          >
            <Plus className="h-4 w-4" />
            Criar pagamento
          </Button>
        </div>
      </Modal>

      {generatedCredentials &&
        credentialsModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
            <button
              type="button"
              aria-label="Fechar"
              className="absolute inset-0"
              onClick={() =>
                setCredentialsModalOpen(
                  false
                )
              }
            />

            <div className="relative w-full max-w-[380px] rounded-[32px] border border-white/10 bg-[#080808] p-5">
              <button
                type="button"
                onClick={() =>
                  setCredentialsModalOpen(
                    false
                  )
                }
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-500/15 text-emerald-400">
                <KeyRound className="h-8 w-8" />
              </div>

              <h2 className="mt-5 text-center text-xl font-black">
                Senha temporária
              </h2>

              <div className="mt-5 space-y-3">
                <CredentialBox
                  label="Aluno"
                  value={
                    generatedCredentials.studentName
                  }
                />

                <CredentialBox
                  label="Email"
                  value={
                    generatedCredentials.email
                  }
                />

                <CredentialBox
                  label="Senha"
                  value={
                    generatedCredentials.password
                  }
                  highlighted
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={
                    handleCopyCredentials
                  }
                  className="flex h-12 items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.06] text-sm font-black"
                >
                  {copiedText ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}

                  {copiedText
                    ? 'Copiado'
                    : 'Copiar'}
                </button>

                <button
                  type="button"
                  onClick={
                    handleSendWhatsApp
                  }
                  className="flex h-12 items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.06] text-sm font-black"
                >
                  <Send className="h-4 w-4" />
                  WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff2a32]/10">
          <Icon className="h-4 w-4 text-[#ff2a32]" />
        </div>

        <h3 className="text-xs font-black uppercase text-zinc-500">
          {title}
        </h3>
      </div>

      {children}
    </section>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3 last:mb-0">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04]">
        <Icon className="h-4 w-4 text-zinc-400" />
      </div>

      <div>
        <p className="text-[10px] font-black uppercase text-zinc-500">
          {label}
        </p>

        <p className="text-sm font-black">
          {value}
        </p>
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
      <p className="text-[9px] font-black uppercase text-zinc-600">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-black">
        {value}
      </p>
    </div>
  );
}

function CounterCard({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5 text-center">
      <p className="text-3xl font-black text-[#ff2a32]">
        {value}
      </p>

      <p className="mt-1 text-[10px] font-black uppercase text-zinc-500">
        {label}
      </p>
    </div>
  );
}

function MetricBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
      <p className="text-[9px] font-black uppercase text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-lg font-black">
        {value}
      </p>
    </div>
  );
}

function CredentialBox({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-[18px] border p-3',
        highlighted
          ? 'border-[#ff2a32]/20 bg-[#ff2a32]/10'
          : 'border-white/10 bg-white/[0.045]'
      )}
    >
      <p
        className={cn(
          'text-[10px] font-black uppercase',
          highlighted
            ? 'text-red-300'
            : 'text-zinc-500'
        )}
      >
        {label}
      </p>

      <p
        className={cn(
          'mt-1 break-all font-black',
          highlighted
            ? 'text-lg text-[#ff2a32]'
            : 'text-sm text-white'
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default StudentProfilePage;