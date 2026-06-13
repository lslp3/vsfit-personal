import { useEffect, useState, useCallback } from 'react';
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
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { formatCurrency, formatDate, formatDateTime, formatPhone } from '../../lib/formatters';
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

type TabKey = 'resumo' | 'treinos' | 'progresso' | 'financeiro' | 'chat' | 'dados';

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'resumo', label: 'Resumo', icon: User },
  { key: 'treinos', label: 'Treinos', icon: Dumbbell },
  { key: 'progresso', label: 'Progresso', icon: TrendingUp },
  { key: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'dados', label: 'Dados', icon: FileText },
];

function getStudentInitials(name?: string) {
  const safeName = String(name || "Aluno").trim();
  const parts = safeName.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return safeName.slice(0, 2).toUpperCase();
}

function StudentAvatar({ student }: { student: Student }) {
  const avatarUrl = student.avatar_url;
  const initials = getStudentInitials(student.name);

  if (avatarUrl) {
    return (
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
        <img 
          src={avatarUrl} 
          alt={student.name} 
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
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
  const normalized = String(status || "active").toLowerCase();
  const label = normalized === "active" ? "Ativo" : normalized === "paused" ? "Pausado" : normalized === "inactive" ? "Inativo" : "Ativo";
  
  const className = normalized === "active" 
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" 
    : normalized === "paused" 
    ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300" 
    : "border-zinc-400/20 bg-zinc-400/10 text-zinc-300";

  return (
    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${className}`}>
      {label}
    </span>
  );
}

function AccessBadge({ student }: { student: Student }) {
  const accounts = student.student_accounts;
  const hasAccess = Boolean(student.auth_user_id) || 
    (Array.isArray(accounts) ? accounts.some(a => a.auth_user_id) : Boolean((accounts as any)?.auth_user_id)) || 
    student.app_access_status === 'active' ||
    student.app_access_status === 'invited';

  const isBlocked = student.app_access_status === 'blocked' || student.login_enabled === false;

  if (isBlocked && (student.auth_user_id || (accounts as any)?.auth_user_id)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/25 bg-red-400/10 px-2.5 py-1 text-[11px] font-bold text-red-300">
        <Lock className="h-3 w-3" />
        Bloqueado
      </span>
    );
  }

  return (
    <span className={
      hasAccess 
        ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300" 
        : "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-zinc-400"
    }>
      <KeyRound className="h-3 w-3" />
      {hasAccess ? "Com acesso" : "Sem acesso"}
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
    method: '',
  });

  const loadStudent = useCallback(async () => {
    if (!id || !trainerProfile) return;
    setLoading(true);
    setError('');
    try {
      const [studentData] = await Promise.all([
        studentService.getStudentById(id),
      ]);
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
    if (student) {
      setEditForm({
        name: student.name || '',
        email: student.email || '',
        phone: student.phone || '',
        birthDate: student.birth_date || '',
      });
    }
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
    if (!student || !trainerProfile) return;
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
      setPaymentForm({ amount: '', dueDate: '', description: '', method: '' });
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
      const updated = await messageService.getMessages(trainerProfile.id, student.id);
      setMessages(updated);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }

  async function handleToggleAccess() {
    if (!student) return;
    try {
      const newStatus =
        student.login_enabled
          ? { login_enabled: false, app_access_status: 'blocked' as const }
          : { login_enabled: true, app_access_status: 'active' as const };
      const updated = await studentService.updateStudent(student.id, newStatus);
      setStudent(updated);
    } catch (err) {
      console.error('Failed to toggle access:', err);
    }
  }

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

  async function handleResetPassword() {
    if (!student) return;
    setResettingPassword(true);
    setPasswordError('');
    try {
      const studentName = student.name || student.email?.split('@')[0] || 'Aluno';
      const { resetStudentPassword } = await import('../../services/resetStudentPassword');
      const tempPassword = await resetStudentPassword(student.id, student.email, studentName);
      setGeneratedCredentials({
        email: student.email,
        password: tempPassword,
        studentName,
        phone: student.phone,
      });
      setCredentialsModalOpen(true);
    } catch (err: any) {
      console.error('[RESET STUDENT PASSWORD]', err);
      setPasswordError(err?.message || 'Erro ao resetar senha do aluno.');
      setTimeout(() => setPasswordError(''), 4000);
    } finally {
      setResettingPassword(false);
    }
  }

  function handleCopyCredentials() {
    if (!generatedCredentials) return;
    const text = `Email: ${generatedCredentials.email}\nSenha: ${generatedCredentials.password}`;
    navigator.clipboard.writeText(text)
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

    const phone = student.phone?.replace(/\D/g, '') || '';
    if (phone) {
      window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      navigator.clipboard.writeText(msg)
        .then(() => {
          setPasswordError('Telefone não informado. Mensagem copiada para envio manual.');
          setTimeout(() => setPasswordError(''), 4000);
        })
        .catch(() => {});
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-vs-dark">
        <Header title="Carregando..." showBack />
        <div className="flex items-center justify-center pt-20">
          <div className="w-8 h-8 border-2 border-vs-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-vs-dark">
        <Header title="Aluno" showBack />
        <EmptyState
          title="Aluno não encontrado"
          description={error || 'O aluno solicitado não foi encontrado'}
          action={
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Voltar
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header
        title="Perfil do Aluno"
        showBack
        right={
          <button
            onClick={() => setEditModalOpen(true)}
            className="flex h-9 items-center justify-center rounded-full bg-white/[0.06] px-4 text-xs font-black tracking-wide text-white active:scale-95 transition-all border border-white/10"
          >
            EDITAR
          </button>
        }
      />

      <div className="max-w-lg mx-auto px-4 pt-4 pb-32">
        <div 
          className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] mb-6"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
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

        <div className="flex gap-1 overflow-x-auto hide-scrollbar mb-6 bg-white/[0.03] border border-white/5 rounded-[20px] p-1.5 backdrop-blur-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-[11px] font-black tracking-wide whitespace-nowrap transition-all uppercase",
                  activeTab === tab.key
                    ? "bg-[#ff2a32]/20 border border-[#ff2a32]/30 text-[#ff2a32] shadow-[0_8px_20px_rgba(255,42,48,0.12)]"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
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
            <div className="grid gap-4">
              <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#ff2a32]/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-[#ff2a32]" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-[0.1em] text-zinc-500">
                    Dados do Aluno
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0 border border-white/5">
                      <Phone className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Telefone</p>
                      <p className="text-sm font-black text-white">{formatPhone(student.phone)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0 border border-white/5">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Nascimento</p>
                      <p className="text-sm font-black text-white">{formatDate(student.birth_date)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {goals && (
                <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#ff2a32]/10 flex items-center justify-center">
                      <Target className="w-4 h-4 text-[#ff2a32]" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[0.1em] text-zinc-500">
                      Metas e Objetivos
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Objetivo</p>
                      <p className="text-sm font-black text-white">{goals.objective || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Nível</p>
                      <p className="text-sm font-black text-white">{goals.level || "—"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-6 text-center">
                <p className="text-3xl font-black text-[#ff2a32]">{workouts.length}</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.1em] mt-1">Treinos</p>
              </div>
              <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-6 text-center">
                <p className="text-3xl font-black text-emerald-400">
                  {payments.filter((p) => p.status === 'paid').length}
                </p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.1em] mt-1">Pagamentos</p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'treinos' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-zinc-500">
                Planos de Treino
              </h3>
              <button
                onClick={() => navigate(`/personal/workout-builder?studentId=${student.id}`)}
                className="group flex items-center gap-2 rounded-full bg-[#ff2a32] px-4 py-2 text-[11px] font-black tracking-wide text-white shadow-[0_12px_35px_rgba(255,42,48,0.22)] active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                NOVO TREINO
              </button>
            </div>

            {workouts.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={<div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-6">
                    <Dumbbell className="w-10 h-10 text-zinc-700" />
                  </div>}
                  title="Nenhum treino criado"
                  description="Comece criando o primeiro plano de treino personalizado para este aluno."
                  action={
                    <button
                      onClick={() => navigate(`/personal/workout-builder?studentId=${student.id}`)}
                      className="mt-6 rounded-2xl bg-[#ff2a32] px-8 py-4 text-[14px] font-black text-white shadow-[0_15px_40px_rgba(255,42,48,0.3)] active:scale-95 transition-all"
                    >
                      CRIAR PRIMEIRO TREINO
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="grid gap-3">
                {workouts.map((w) => (
                  <div 
                    key={w.id} 
                    className="group relative overflow-hidden rounded-[24px] border border-white/5 bg-white/[0.03] p-4 active:scale-[0.98] transition-all cursor-pointer hover:border-white/10"
                    onClick={() => navigate(`/personal/workout-builder/${w.id}`)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-vs-primary/10 flex items-center justify-center shrink-0 border border-vs-primary/10">
                        <Dumbbell className="w-6 h-6 text-vs-primary" />
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="truncate text-[15px] font-black tracking-tight text-white group-hover:text-vs-primary transition-colors">
                            {w.name}
                          </h4>
                          <Badge status={w.status} />
                        </div>
                        
                        <p className="mt-1 truncate text-[12px] font-medium text-zinc-400">
                          {w.objective || 'Treino Geral'} • {w.level || 'Todos os níveis'}
                        </p>
                        
                        <div className="mt-4 flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500">
                            <Clock className="w-3.5 h-3.5" />
                            {w.duration_minutes || '--'} min
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500">
                            <Activity className="w-3.5 h-3.5" />
                            Frequência Livre
                          </div>
                        </div>
                      </div>
                      
                      <div className="self-center">
                        <ChevronRight className="w-5 h-5 text-zinc-700" />
                      </div>
                    </div>
                  </div>
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
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-zinc-500">
                Histórico de Medidas
              </h3>
              <button
                className="group flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/5 px-4 py-2 text-[11px] font-black tracking-wide text-zinc-400 active:scale-95 transition-all hover:border-white/10 hover:text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                NOVA AVALIAÇÃO
              </button>
            </div>

            {metrics.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={<div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-6">
                    <Ruler className="w-10 h-10 text-zinc-700" />
                  </div>}
                  title="Nenhuma medida"
                  description="As avaliações físicas e progresso do aluno aparecerão listadas aqui."
                />
              </div>
            ) : (
              <div className="grid gap-4">
                {metrics.map((m) => (
                  <div key={m.id} className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <p className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">
                        {formatDateTime(m.created_at)}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {m.weight && (
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Peso</span>
                          <p className="text-lg font-black text-white">{m.weight}kg</p>
                        </div>
                      )}
                      {m.height && (
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Altura</span>
                          <p className="text-lg font-black text-white">{m.height}m</p>
                        </div>
                      )}
                      {m.body_fat && (
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Gordura</span>
                          <p className="text-lg font-black text-blue-400">{m.body_fat}%</p>
                        </div>
                      )}
                      {m.muscle_mass && (
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Massa Muscular</span>
                          <p className="text-lg font-black text-emerald-400">{m.muscle_mass}kg</p>
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
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-zinc-500">
                Financeiro
              </h3>
              <button
                onClick={() => setPaymentModalOpen(true)}
                className="group flex items-center gap-2 rounded-full bg-[#ff2a32] px-4 py-2 text-[11px] font-black tracking-wide text-white shadow-[0_12px_35px_rgba(255,42,48,0.22)] active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                NOVO PAGAMENTO
              </button>
            </div>

            {payments.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={<div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-6">
                    <DollarSign className="w-10 h-10 text-zinc-700" />
                  </div>}
                  title="Nenhum pagamento"
                  description="Registre as cobranças e mensalidades deste aluno para controle financeiro."
                  action={
                    <button
                      onClick={() => setPaymentModalOpen(true)}
                      className="mt-6 rounded-2xl bg-[#ff2a32] px-8 py-4 text-[14px] font-black text-white shadow-[0_15px_40px_rgba(255,42,48,0.3)] active:scale-95 transition-all"
                    >
                      ADICIONAR PAGAMENTO
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="grid gap-3">
                {payments.map((p) => (
                  <div key={p.id} className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5 active:scale-[0.98] transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xl font-black text-white">{formatCurrency(p.amount)}</p>
                          <Badge status={p.status} />
                        </div>
                        
                        <p className="text-[13px] font-bold text-zinc-300 truncate">
                          {p.description || 'Sem descrição'}
                        </p>
                        
                        <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                          <Calendar className="w-3.5 h-3.5" />
                          Vencimento: {formatDate(p.due_date)}
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
            <h3 className="text-sm font-black uppercase tracking-[0.15em] text-zinc-500">
              Conversa
            </h3>
            
            <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto hide-scrollbar px-1">
              {messages.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    title="Nenhuma mensagem"
                    description="Inicie uma conversa direta com seu aluno através do chat do aplicativo."
                  />
                </div>
              ) : (
                messages.map((msg) => {
                  const isPersonal = msg.sender_role === 'personal';
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        isPersonal ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-[20px] px-4 py-3 shadow-lg",
                          isPersonal
                            ? "bg-[#ff2a32] text-white rounded-tr-sm"
                            : "bg-white/[0.06] border border-white/5 text-white rounded-tl-sm"
                        )}
                      >
                        <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                        <p className={cn(
                          "text-[9px] mt-1.5 font-bold uppercase tracking-wider opacity-60",
                          isPersonal ? "text-white" : "text-zinc-400"
                        )}>
                          {formatDateTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-white/5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Escreva sua mensagem..."
                className="w-full bg-white/[0.045] border border-white/10 rounded-[18px] py-3.5 px-5 text-sm font-medium placeholder:text-zinc-600 focus:outline-none focus:border-[#ff2a32]/40 focus:bg-white/[0.06] transition-all"
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim()}
                className="w-14 h-14 rounded-[18px] bg-[#ff2a32] text-white flex items-center justify-center disabled:opacity-50 disabled:grayscale shrink-0 shadow-[0_12px_30px_rgba(255,42,48,0.22)] active:scale-95 transition-all"
              >
                <Send className="w-5 h-5" />
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
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[#ff2a32]/10 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-[#ff2a32]" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.1em] text-zinc-500">
                  Controle de Acesso
                </h3>
              </div>

              <div className="space-y-4">
                {/* Acesso ao Aplicativo */}
                <div className="rounded-[22px] border border-white/10 bg-white/[0.035] p-5">
                  <div className="space-y-1">
                    <h4 className="text-[15px] font-black leading-tight text-white">
                      Acesso ao Aplicativo
                    </h4>
                    <p className="text-[12px] leading-relaxed text-zinc-400">
                      {student.login_enabled 
                        ? 'O aluno pode realizar login e acessar seus treinos.' 
                        : 'Acesso suspenso. O aluno não consegue acessar o app.'}
                    </p>
                  </div>

                  <button
                    onClick={handleToggleAccess}
                    className={cn(
                      "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] text-[13px] font-black tracking-wide transition-all active:scale-[0.98]",
                      student.login_enabled
                        ? "bg-red-500/10 border border-red-500/20 text-red-400"
                        : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    )}
                  >
                    {student.login_enabled ? (
                      <>
                        <Lock className="w-4 h-4" /> BLOQUEAR
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" /> LIBERAR ACESSO
                      </>
                    )}
                  </button>
                </div>

                {/* Segurança da Conta */}
                <div className="rounded-[22px] border border-white/10 bg-white/[0.035] p-5">
                  <div className="space-y-1">
                    <h4 className="text-[15px] font-black leading-tight text-white">
                      Segurança da Conta
                    </h4>
                    <p className="text-[12px] leading-relaxed text-zinc-400">
                      Gera uma nova senha temporária e desconecta o aluno de outros dispositivos.
                    </p>
                  </div>

                  <button
                    onClick={handleResetPassword}
                    disabled={resettingPassword}
                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.06] text-[13px] font-black tracking-wide text-white transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {resettingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> GERANDO...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" /> RESETAR SENHA
                      </>
                    )}
                  </button>
                </div>
                
                {passwordError && (
                  <p className="text-xs text-red-400 mt-2 font-medium bg-red-400/10 p-3 rounded-xl border border-red-400/20">
                    {passwordError}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[#ff2a32]/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-[#ff2a32]" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.1em] text-zinc-500">
                  Mais Metas
                </h3>
              </div>
              
              {goals ? (
                <div className="grid gap-4">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Frequência Semanal</p>
                    <p className="text-sm font-black text-white">{goals.weekly_frequency ? `${goals.weekly_frequency}x por semana` : 'Não informada'}</p>
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Peso Alvo</p>
                    <p className="text-sm font-black text-[#ff2a32]">{goals.target_weight ? `${goals.target_weight}kg` : 'Não informado'}</p>
                  </div>

                  {goals.goal_notes && (
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Observações Adicionais</p>
                      <p className="text-xs font-medium text-zinc-400 leading-relaxed">{goals.goal_notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 font-medium text-center py-4 italic">Nenhuma meta adicional registrada.</p>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar Aluno">
        <div className="space-y-4">
          <Input
            label="Nome"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
          />
          <Input
            label="Telefone"
            value={editForm.phone}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
          />
          <Input
            label="Data de Nascimento"
            type="date"
            value={editForm.birthDate}
            onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
          />
          <Button onClick={handleEditStudent}>
            <Save className="w-4 h-4" /> Salvar Alterações
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
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
          />
          <Input
            label="Data de Vencimento"
            type="date"
            value={paymentForm.dueDate}
            onChange={(e) => setPaymentForm({ ...paymentForm, dueDate: e.target.value })}
          />
          <Input
            label="Descrição"
            placeholder="Ex: Mensalidade Junho"
            value={paymentForm.description}
            onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
          />
          <Select
            label="Método"
            options={[
              { value: 'pix', label: 'PIX' },
              { value: 'credit_card', label: 'Cartão de Crédito' },
              { value: 'cash', label: 'Dinheiro' },
              { value: 'transfer', label: 'Transferência' },
            ]}
            value={paymentForm.method}
            onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
          />
          <Button onClick={handleCreatePayment}>
            <Plus className="w-4 h-4" /> Criar Pagamento
          </Button>
        </div>
      </Modal>

      {generatedCredentials && credentialsModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setCredentialsModalOpen(false)}
            className="absolute inset-0"
          />

          <div className="relative w-full max-w-[370px] overflow-hidden rounded-[32px] border border-white/10 bg-[#080808] shadow-[0_24px_90px_rgba(0,0,0,0.85)]">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-emerald-500/20 to-transparent" />

            <button
              type="button"
              onClick={() => setCredentialsModalOpen(false)}
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
                  <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Aluno</p>
                  <p className="mt-1 text-[14px] font-black text-white">{generatedCredentials.studentName}</p>
                </div>

                <div className="rounded-[18px] border border-white/10 bg-white/[0.045] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Email</p>
                  <p className="mt-1 break-all text-[14px] font-black text-white">{generatedCredentials.email}</p>
                </div>

                <div className="rounded-[18px] border border-[#ff2a32]/20 bg-[#ff2a32]/10 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-red-300">Senha temporária</p>
                  <p className="mt-1 text-[18px] font-black tracking-wide text-[#ff2a32]">{generatedCredentials.password}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="h-12 rounded-[18px] border border-white/10 bg-white/[0.06] text-[14px] font-black text-white active:scale-[0.98]"
                >
                  {copiedText ? (
                    <span className="flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> Copiado</span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5"><Copy className="w-4 h-4" /> Copiar</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="h-12 rounded-[18px] border border-white/10 bg-white/[0.06] text-[14px] font-black text-white active:scale-[0.98]"
                >
                  <span className="flex items-center justify-center gap-1.5"><Send className="w-4 h-4" /> WhatsApp</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setCredentialsModalOpen(false)}
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
