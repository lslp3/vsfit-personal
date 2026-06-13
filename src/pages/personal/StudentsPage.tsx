import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  Copy,
  KeyRound,
  Phone,
  Plus,
  Search,
  Send,
  Users,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import * as studentService from '../../services/studentService';
import * as subscriptionService from '../../services/subscriptionService';
import { getPlanLimits } from '../../lib/planLimits';
import { cn } from '../../lib/utils';
import type { Student } from '../../types/database';

type FilterType = 'all' | 'active' | 'paused' | 'inactive';

type CreatedStudentAccess = {
  name: string;
  email: string;
  phone?: string;
  password?: string;
};

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Ativos' },
  { key: 'paused', label: 'Pausados' },
  { key: 'inactive', label: 'Inativos' },
];

function getStudentInitials(name?: string) {
  const safeName = String(name || 'Aluno').trim();
  const parts = safeName.split(' ').filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return safeName.slice(0, 2).toUpperCase();
}

function normalizeWhatsappPhone(value?: string) {
  const digits = String(value || '').replace(/\D/g, '');

  if (!digits) return '';

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

function buildAccessMessage(access: CreatedStudentAccess) {
  return `Olá ${access.name}, seu acesso ao VSFit Personal foi criado:

Email: ${access.email}
Senha temporária: ${access.password || 'Senha não retornada. Solicite redefinição.'}

Acesse o aplicativo e altere sua senha após o primeiro login.`;
}

function getCreatedPassword(result: any) {
  return (
    result?.credentials?.password ||
    result?.credentials?.temporary_password ||
    result?.password ||
    result?.temporary_password ||
    result?.temporaryPassword ||
    result?.studentAccount?.temporary_password ||
    result?.account?.temporary_password ||
    result?.data?.credentials?.password ||
    result?.data?.password ||
    ''
  );
}

function StudentAvatar({ student }: { student: any }) {
  const avatarUrl =
    student.avatar_url ||
    student.photo_url ||
    student.profile_photo_url ||
    student.image_url ||
    '';

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

function AccessBadge({ student }: { student: any }) {
  const accounts = student.student_accounts || student.student_account;

  const hasAccess =
    Boolean(student.auth_user_id) ||
    (Array.isArray(accounts)
      ? accounts.some((account) => account.auth_user_id)
      : Boolean(accounts?.auth_user_id)) ||
    student.has_app_access === true ||
    student.app_access === true;

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

export function StudentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { trainerProfile, isAuthenticated } = useAuthStore();

  const [fallbackTrainerProfile, setFallbackTrainerProfile] = useState<any>(null);
  const activeTrainerProfile = trainerProfile || fallbackTrainerProfile;

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planModalMessage, setPlanModalMessage] = useState('');

  const [createdAccess, setCreatedAccess] = useState<CreatedStudentAccess | null>(null);
  const [copiedAccess, setCopiedAccess] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    objective: '',
    level: 'Iniciante',
    weight: '',
    height: '',
    targetWeight: '',
    weeklyFrequency: '',
    notes: '',
    createAppAccess: true,
  });

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (activeTrainerProfile?.id) {
      loadStudents(activeTrainerProfile.id);
      return;
    }

    resolveTrainerProfileFallback().then((profile) => {
      if (profile?.id) {
        loadStudents(profile.id);
      } else {
        setLoading(false);
      }
    });
  }, [isAuthenticated, trainerProfile?.id, fallbackTrainerProfile?.id]);

  async function resolveTrainerProfileFallback() {
    if (trainerProfile?.id) {
      setFallbackTrainerProfile(null);
      return trainerProfile;
    }

    try {
      const { data: authData } = await supabase.auth.getUser();
      const email = authData.user?.email;

      if (!email) {
        return null;
      }

      const { data, error: profileError } = await supabase
        .from('trainer_profiles')
        .select('*')
        .ilike('email', email)
        .maybeSingle();

      if (profileError) {
        console.error('[StudentsPage] Erro ao buscar personal pelo email:', profileError);
        return null;
      }

      if (data) {
        setFallbackTrainerProfile(data);
        return data;
      }

      return null;
    } catch (fallbackError) {
      console.error('[StudentsPage] resolveTrainerProfileFallback error:', fallbackError);
      return null;
    }
  }

  async function loadStudents(forcedTrainerId?: string) {
    setLoading(true);

    const tid = forcedTrainerId || activeTrainerProfile?.id;

    if (!tid) {
      setLoading(false);
      return;
    }

    try {
      const data = await studentService.getStudentsByTrainer(tid);
      setStudents(data || []);
    } catch (err) {
      console.error('[StudentsPage] loadStudents error:', err);
    } finally {
      setLoading(false);
    }
  }

  function resetCreateForm() {
    setCreateForm({
      name: '',
      email: '',
      phone: '',
      objective: '',
      level: 'Iniciante',
      weight: '',
      height: '',
      targetWeight: '',
      weeklyFrequency: '',
      notes: '',
      createAppAccess: true,
    });
  }

  function closeCreateModal() {
    setIsCreateModalOpen(false);
    setError('');
    resetCreateForm();
    setSearchParams({});
  }

  function openCreateModal() {
    setCreatedAccess(null);
    setError('');
    setIsCreateModalOpen(true);
  }

  async function handleCreateStudent() {
    if (!createForm.name.trim() || !createForm.email.trim()) {
      setError('Nome e email são obrigatórios.');
      return;
    }

    const currentTrainer = activeTrainerProfile || (await resolveTrainerProfileFallback());

    if (!currentTrainer?.id) {
      setError('Perfil do personal não encontrado. Saia e entre novamente no app.');
      return;
    }

    const studentCount = students.length;
    const currentPlanSlug = await subscriptionService.getCurrentPlanSlug(currentTrainer.id);
    const canCreate = await subscriptionService.canCreateStudent(currentTrainer.id, studentCount);
    const studentLimit = getPlanLimits(currentPlanSlug).students;

    if (!canCreate) {
      let message = '';

      if (currentPlanSlug === 'free') {
        message =
          'Seu plano Free permite cadastrar apenas 1 aluno. Faça upgrade para o Pro ou Premium para continuar.';
      } else if (currentPlanSlug === 'pro') {
        message = `Seu plano Pro permite até ${studentLimit} alunos. Atualize para Premium e tenha alunos ilimitados.`;
      } else {
        message = `Seu plano atual (${currentPlanSlug}) não permite cadastrar mais alunos. Faça o upgrade para continuar crescendo.`;
      }

      setPlanModalMessage(message);
      setShowPlanModal(true);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const result = await studentService.createStudent(currentTrainer.id, {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone || undefined,
        objective: createForm.objective || undefined,
        level: createForm.level,
        weight: createForm.weight ? Number(createForm.weight) : undefined,
        height: createForm.height ? Number(createForm.height) : undefined,
        targetWeight: createForm.targetWeight ? Number(createForm.targetWeight) : undefined,
        weeklyFrequency: createForm.weeklyFrequency ? Number(createForm.weeklyFrequency) : undefined,
        notes: createForm.notes || undefined,
        createAppAccess: createForm.createAppAccess,
      });

      await loadStudents(currentTrainer.id);

      if (createForm.createAppAccess) {
        const password = getCreatedPassword(result);

        setCreatedAccess({
          name: createForm.name.trim(),
          email: createForm.email.trim(),
          phone: createForm.phone,
          password,
        });

        resetCreateForm();
        setSearchParams({});
        return;
      }

      closeCreateModal();
    } catch (err: any) {
      console.error('[StudentsPage] createStudent error:', err);
      setError(err?.message || 'Erro ao criar aluno.');
    } finally {
      setSaving(false);
    }
  }

  function handleCopyAccess() {
    if (!createdAccess) return;

    const message = buildAccessMessage(createdAccess);

    navigator.clipboard
      .writeText(message)
      .then(() => {
        setCopiedAccess(true);
        setTimeout(() => setCopiedAccess(false), 2000);
      })
      .catch(() => {
        alert('Não foi possível copiar o acesso.');
      });
  }

  function handleSendAccessWhatsApp() {
    if (!createdAccess) return;

    const phone = normalizeWhatsappPhone(createdAccess.phone);
    const message = encodeURIComponent(buildAccessMessage(createdAccess));

    if (!phone) {
      navigator.clipboard
        .writeText(buildAccessMessage(createdAccess))
        .then(() => {
          alert('Telefone não informado. A mensagem foi copiada para envio manual.');
        })
        .catch(() => {
          alert('Telefone não informado.');
        });

      return;
    }

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  }

  const filtered = students.filter((student) => {
    const matchesSearch =
      String(student.name || '').toLowerCase().includes(search.toLowerCase()) ||
      String(student.email || '').toLowerCase().includes(search.toLowerCase());

    const matchesFilter = activeFilter === 'all' || student.status === activeFilter;

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#ff2a32] border-t-transparent shadow-[0_0_20px_rgba(255,42,48,0.2)]" />
          <p className="text-sm font-medium text-zinc-400">Refinando experiência...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-lg px-4 pb-32 pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ff2a32]">
                VSFit Personal
              </p>
              <h1 className="mt-0.5 text-2xl font-black tracking-tight">Alunos</h1>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="group flex items-center gap-2 rounded-full bg-[#ff2a32] px-4 py-2.5 text-[13px] font-black tracking-wide text-white shadow-[0_12px_35px_rgba(255,42,48,0.28)] transition-all active:scale-95"
            >
              <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
              NOVO
            </button>
          </div>

          <div className="group relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-[#ff2a32]" />

            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-[20px] border border-white/10 bg-white/[0.045] py-4 pl-11 pr-4 text-sm font-medium placeholder:text-zinc-600 transition-all focus:border-[#ff2a32]/40 focus:bg-white/[0.06] focus:outline-none"
            />
          </div>

          <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
            {filters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={cn(
                  'rounded-full border px-5 py-2.5 text-[12px] font-black tracking-wide transition-all',
                  activeFilter === filter.key
                    ? 'border-[#ff2a32]/40 bg-[#ff2a32]/20 text-[#ff2a32]'
                    : 'border-white/5 bg-white/[0.045] text-zinc-500 hover:border-white/10'
                )}
              >
                {filter.label.toUpperCase()}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/5 bg-white/[0.03]">
                    <Users className="h-10 w-10 text-zinc-700" />
                  </div>
                }
                title={students.length === 0 ? 'Nenhum aluno cadastrado' : 'Nenhum resultado'}
                description={
                  students.length === 0
                    ? 'Adicione seu primeiro aluno para começar a montar treinos personalizados.'
                    : 'Tente alterar os filtros ou a busca.'
                }
                action={
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="mt-6 rounded-2xl bg-[#ff2a32] px-8 py-4 text-[14px] font-black text-white shadow-[0_15px_40px_rgba(255,42,48,0.3)] transition-all active:scale-95"
                  >
                    ADICIONAR ALUNO
                  </button>
                }
              />
            </div>
          ) : (
            <div className="grid gap-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((student) => (
                  <motion.div
                    key={student.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      onClick={() => navigate(`/personal/students/${student.id}`)}
                      className="group relative cursor-pointer overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.32)] transition-all hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.98]"
                    >
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                      <div className="flex items-start gap-4">
                        <StudentAvatar student={student} />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="truncate text-[15px] font-black tracking-[-0.02em] text-white">
                                {student.name}
                              </h3>

                              <p className="mt-0.5 truncate text-[12px] font-medium text-zinc-400">
                                {student.email || 'Sem email'}
                              </p>
                            </div>

                            <StudentStatusBadge status={student.status} />
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <AccessBadge student={student} />

                            {student.phone && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400">
                                <Phone className="h-3 w-3" />
                                {student.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={openCreateModal}
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#ff2a32] text-white shadow-[0_18px_45px_rgba(255,42,48,0.38)] transition-all hover:scale-105 active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </button>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/85 px-3 backdrop-blur-xl sm:items-center">
          <button type="button" className="absolute inset-0" onClick={closeCreateModal} />

          <div className="relative flex max-h-[92vh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[32px] border border-white/10 bg-[#080808] shadow-[0_30px_100px_rgba(0,0,0,0.9)] sm:rounded-[32px]">
            <div className="shrink-0 border-b border-white/5 bg-[#080808] px-5 py-5">
              <button
                type="button"
                onClick={closeCreateModal}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>

              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff2a32]">
                Cadastro manual
              </p>

              <h2 className="mt-1 text-[22px] font-black uppercase italic tracking-tight text-white">
                Novo Aluno
              </h2>

              <p className="mt-1 pr-12 text-[12px] font-medium text-zinc-500">
                Cadastre o aluno e, se desejar, gere o acesso ao app automaticamente.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Input
                    label="Nome *"
                    placeholder="Nome completo"
                    value={createForm.name}
                    onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <Input
                    label="Email *"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={createForm.email}
                    onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <Input
                    label="Telefone"
                    placeholder="(11) 99999-9999"
                    value={createForm.phone}
                    onChange={(event) => setCreateForm({ ...createForm, phone: event.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <Select
                    label="Objetivo"
                    value={createForm.objective}
                    onChange={(event) => setCreateForm({ ...createForm, objective: event.target.value })}
                    options={[
                      { value: 'Emagrecimento', label: 'Emagrecimento' },
                      { value: 'Hipertrofia', label: 'Hipertrofia' },
                      { value: 'Definição', label: 'Definição' },
                      { value: 'Condicionamento', label: 'Condicionamento' },
                      { value: 'Saúde', label: 'Saúde' },
                      { value: 'Performance', label: 'Performance' },
                    ]}
                  />
                </div>

                <div>
                  <Select
                    label="Nível"
                    value={createForm.level}
                    onChange={(event) => setCreateForm({ ...createForm, level: event.target.value })}
                    options={[
                      { value: 'Iniciante', label: 'Iniciante' },
                      { value: 'Intermediário', label: 'Intermediário' },
                      { value: 'Avançado', label: 'Avançado' },
                    ]}
                  />
                </div>

                <div>
                  <Input
                    label="Frequência semanal"
                    type="number"
                    placeholder="ex: 5"
                    value={createForm.weeklyFrequency}
                    onChange={(event) =>
                      setCreateForm({ ...createForm, weeklyFrequency: event.target.value })
                    }
                  />
                </div>

                <div>
                  <Input
                    label="Peso (kg)"
                    type="number"
                    step="0.1"
                    placeholder="ex: 75"
                    value={createForm.weight}
                    onChange={(event) => setCreateForm({ ...createForm, weight: event.target.value })}
                  />
                </div>

                <div>
                  <Input
                    label="Altura (cm)"
                    type="number"
                    placeholder="ex: 175"
                    value={createForm.height}
                    onChange={(event) => setCreateForm({ ...createForm, height: event.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <Input
                    label="Peso meta (kg)"
                    type="number"
                    step="0.1"
                    placeholder="ex: 70"
                    value={createForm.targetWeight}
                    onChange={(event) =>
                      setCreateForm({ ...createForm, targetWeight: event.target.value })
                    }
                  />
                </div>

                <div className="col-span-2">
                  <Textarea
                    label="Observações"
                    placeholder="Anotações sobre o aluno..."
                    value={createForm.notes}
                    onChange={(event) => setCreateForm({ ...createForm, notes: event.target.value })}
                  />
                </div>

                <label
                  htmlFor="createAppAccess"
                  className="col-span-2 flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.045] p-3"
                >
                  <input
                    type="checkbox"
                    id="createAppAccess"
                    checked={createForm.createAppAccess}
                    onChange={(event) =>
                      setCreateForm({ ...createForm, createAppAccess: event.target.checked })
                    }
                    className="h-5 w-5 rounded border-white/10 bg-white/5 accent-[#ff2a32]"
                  />

                  <span className="text-sm font-medium text-zinc-300">
                    Criar acesso ao app para o aluno
                  </span>
                </label>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-400">
                  {error}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-white/10 bg-[#080808] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="flex-1 rounded-[18px] border border-white/10 bg-white/[0.06] px-4 py-4 text-[13px] font-black text-white transition-all active:scale-[0.98]"
                >
                  CANCELAR
                </button>

                <button
                  type="button"
                  onClick={handleCreateStudent}
                  disabled={saving}
                  className="flex-1 rounded-[18px] bg-[#ff2a32] px-4 py-4 text-[13px] font-black text-white transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {saving ? 'SALVANDO...' : 'SALVAR ALUNO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {createdAccess && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/95 px-4 backdrop-blur-2xl">
          <div className="relative w-full max-w-[380px] overflow-hidden rounded-[36px] border border-white/10 bg-[#080808] shadow-[0_35px_100px_rgba(0,0,0,1)]">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-emerald-500/20 to-transparent" />

            <div className="relative p-7 pt-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-emerald-500/15 text-emerald-400">
                <KeyRound className="h-10 w-10" />
              </div>

              <h2 className="mt-6 text-center text-[24px] font-black uppercase italic tracking-tight text-white">
                Acesso Criado!
              </h2>

              <p className="mt-2 text-center text-[13px] leading-relaxed text-zinc-400">
                Envie estes dados para o aluno acessar o aplicativo.
              </p>

              <div className="mt-8 rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
                <div className="space-y-3">
                  <div>
                    <p className="pl-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      Aluno
                    </p>

                    <p className="text-[15px] font-black uppercase italic text-white">
                      {createdAccess.name}
                    </p>
                  </div>

                  <div>
                    <p className="pl-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      Email
                    </p>

                    <p className="truncate text-[13px] font-medium text-white">
                      {createdAccess.email}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/70">
                      Senha Temporária
                    </p>

                    <p className="text-2xl font-black tracking-widest text-emerald-400">
                      {createdAccess.password || '---'}
                    </p>

                    {!createdAccess.password && (
                      <p className="mt-2 text-[11px] font-bold text-yellow-300">
                        A senha não foi retornada pelo serviço. Use redefinir senha no perfil do aluno.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCopyAccess}
                  className="h-14 rounded-[20px] border border-white/10 bg-white/[0.06] text-[13px] font-black text-white transition-all active:scale-95"
                >
                  {copiedAccess ? (
                    <span className="flex items-center justify-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      COPIADO
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Copy className="h-4 w-4" />
                      COPIAR
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSendAccessWhatsApp}
                  className="h-14 rounded-[20px] bg-emerald-600 text-[13px] font-black text-white transition-all active:scale-95"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Send className="h-4 w-4" />
                    WHATSAPP
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCreatedAccess(null);
                  closeCreateModal();
                }}
                className="mt-4 h-12 w-full rounded-[20px] border border-white/5 text-[12px] font-black uppercase tracking-widest text-zinc-500 transition-all active:scale-95"
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}

      {showPlanModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/95 px-4 backdrop-blur-2xl">
          <button
            type="button"
            onClick={() => setShowPlanModal(false)}
            className="absolute inset-0"
          />

          <div className="relative w-full max-w-[360px] overflow-hidden rounded-[32px] border border-white/10 bg-[#080808] shadow-[0_35px_100px_rgba(0,0,0,1)]">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-yellow-500/20 to-transparent" />

            <button
              type="button"
              onClick={() => setShowPlanModal(false)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-300"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative p-7 pt-10 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-yellow-500/15 text-yellow-400">
                <AlertTriangle className="h-10 w-10" />
              </div>

              <h2 className="mt-6 text-center text-[24px] font-black uppercase italic tracking-tight text-white">
                Limite do plano
              </h2>

              <p className="mt-2 px-4 text-center text-[13px] leading-relaxed text-zinc-400">
                {planModalMessage}
              </p>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="h-14 flex-1 rounded-[20px] border border-white/10 bg-white/[0.06] text-[13px] font-black text-white transition-all active:scale-95"
                >
                  FECHAR
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPlanModal(false);
                    navigate('/personal/subscription');
                  }}
                  className="h-14 flex-1 rounded-[20px] bg-[#ff2a32] text-[13px] font-black text-white transition-all active:scale-95"
                >
                  VER PLANOS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentsPage;