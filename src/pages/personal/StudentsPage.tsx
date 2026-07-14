import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Users, Phone, KeyRound } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import * as studentService from '../../services/studentService';
import * as subscriptionService from '../../services/subscriptionService';
import { getPlanLimits } from '../../lib/planLimits';
import { cn } from '../../lib/utils';
import type { Student } from '../../types/database';

type FilterType = 'all' | 'active' | 'paused' | 'inactive';

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Ativos' },
  { key: 'paused', label: 'Pausados' },
  { key: 'inactive', label: 'Inativos' },
];

const initialCreateForm = {
  name: '',
  email: '',
  phone: '',
  birthDate: '',
  objective: '',
  level: 'Iniciante',
  weight: '',
  height: '',
  bodyFat: '',
  targetBodyFat: '',
  muscleMass: '',
  waterIntake: '',
  targetWeight: '',
  weeklyFrequency: '',
  notes: '',
  createAppAccess: false,
};

function getStudentInitials(name?: string) {
  const safeName = String(name || 'Aluno').trim();
  const parts = safeName.split(' ').filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return safeName.slice(0, 2).toUpperCase();
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

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planModalMessage, setPlanModalMessage] = useState('');

  const [createForm, setCreateForm] = useState(initialCreateForm);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadStudents();
  }, [isAuthenticated, trainerProfile?.id]);

  async function loadStudents() {
    setLoading(true);

    const trainerId = trainerProfile?.id;

    if (!trainerId) {
      setLoading(false);
      return;
    }

    try {
      const data = await studentService.getStudentsByTrainer(trainerId);
      setStudents(data || []);
    } catch (err) {
      console.error('[StudentsPage] loadStudents error:', err);
    } finally {
      setLoading(false);
    }
  }

  function closeCreateModal() {
    setIsCreateModalOpen(false);
    setError('');
    setCreateForm(initialCreateForm);
    setSearchParams({});
  }

  function openCreateModal() {
    setIsCreateModalOpen(true);
    setError('');
  }

  async function handleCreateStudent() {
    if (!createForm.name.trim() || !createForm.email.trim()) {
      setError('Nome e email são obrigatórios.');
      return;
    }

    if (!trainerProfile?.id) {
      setError('Perfil do personal não encontrado. Saia e entre novamente no app.');
      return;
    }

    const studentCount = students.length;
    const currentPlanSlug = await subscriptionService.getCurrentPlanSlug(trainerProfile.id);
    const canCreate = await subscriptionService.canCreateStudent(trainerProfile.id, studentCount);
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
      await studentService.createStudent(trainerProfile.id, {
        name: createForm.name.trim(),
        email: createForm.email.trim().toLowerCase(),
        phone: createForm.phone || undefined,
        birthDate: createForm.birthDate || undefined,
        objective: createForm.objective || undefined,
        level: createForm.level,
        weight: createForm.weight ? Number(createForm.weight) : undefined,
        height: createForm.height ? Number(createForm.height) : undefined,
        bodyFat: createForm.bodyFat ? Number(createForm.bodyFat) : undefined,
        targetBodyFat: createForm.targetBodyFat ? Number(createForm.targetBodyFat) : undefined,
        muscleMass: createForm.muscleMass ? Number(createForm.muscleMass) : undefined,
        waterIntake: createForm.waterIntake ? Number(createForm.waterIntake) : undefined,
        targetWeight: createForm.targetWeight ? Number(createForm.targetWeight) : undefined,
        weeklyFrequency: createForm.weeklyFrequency
          ? Number(createForm.weeklyFrequency)
          : undefined,
        notes: createForm.notes || undefined,
        createAppAccess: createForm.createAppAccess,
      });

      await loadStudents();
      closeCreateModal();
    } catch (err: any) {
      console.error('[StudentsPage] create student error:', err);
      setError(err?.message || 'Erro ao criar aluno.');
    } finally {
      setSaving(false);
    }
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
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ff2a32]">
                VSFit Personal
              </p>
              <h1 className="mt-0.5 text-xl font-black tracking-tight">Alunos</h1>
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
        className="fixed bottom-24 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#ff2a32] text-white shadow-[0_18px_45px_rgba(255,42,48,0.38)] transition-all hover:scale-105 active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </button>

      <Modal open={isCreateModalOpen} onClose={closeCreateModal} title="Novo Aluno">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input
                label="Nome *"
                placeholder="Nome completo"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm({ ...createForm, name: event.target.value })
                }
              />
            </div>

            <div className="col-span-2">
              <Input
                label="Email *"
                type="email"
                placeholder="email@exemplo.com"
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm({ ...createForm, email: event.target.value })
                }
              />
            </div>

            <div className="col-span-2">
              <Input
                label="Telefone"
                placeholder="(11) 99999-9999"
                value={createForm.phone}
                onChange={(event) =>
                  setCreateForm({ ...createForm, phone: event.target.value })
                }
              />
            </div>

            <div className="col-span-2">
              <Input
                label="Data de nascimento"
                type="date"
                value={createForm.birthDate}
                onChange={(event) =>
                  setCreateForm({ ...createForm, birthDate: event.target.value })
                }
              />
            </div>

            <div className="col-span-2">
              <Select
                label="Objetivo"
                value={createForm.objective}
                onChange={(event) =>
                  setCreateForm({ ...createForm, objective: event.target.value })
                }
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
                onChange={(event) =>
                  setCreateForm({ ...createForm, level: event.target.value })
                }
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
                onChange={(event) =>
                  setCreateForm({ ...createForm, weight: event.target.value })
                }
              />
            </div>

            <div>
              <Input
                label="Altura (cm)"
                type="number"
                placeholder="ex: 175"
                value={createForm.height}
                onChange={(event) =>
                  setCreateForm({ ...createForm, height: event.target.value })
                }
              />
            </div>

            <div>
              <Input
                label="Gordura (%)"
                type="number"
                step="0.1"
                placeholder="ex: 22"
                value={createForm.bodyFat}
                onChange={(event) =>
                  setCreateForm({ ...createForm, bodyFat: event.target.value })
                }
              />
            </div>

            <div>
              <Input
                label="Massa muscular (kg)"
                type="number"
                step="0.1"
                placeholder="ex: 38"
                value={createForm.muscleMass}
                onChange={(event) =>
                  setCreateForm({ ...createForm, muscleMass: event.target.value })
                }
              />
            </div>

            <div>
              <Input
                label="Meta gordura (%)"
                type="number"
                step="0.1"
                placeholder="ex: 18"
                value={createForm.targetBodyFat}
                onChange={(event) =>
                  setCreateForm({ ...createForm, targetBodyFat: event.target.value })
                }
              />
            </div>

            <div>
              <Input
                label="Água (L)"
                type="number"
                step="0.1"
                placeholder="ex: 3"
                value={createForm.waterIntake}
                onChange={(event) =>
                  setCreateForm({ ...createForm, waterIntake: event.target.value })
                }
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
                onChange={(event) =>
                  setCreateForm({ ...createForm, notes: event.target.value })
                }
              />
            </div>

            <div className="col-span-2 flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3">
              <input
                type="checkbox"
                id="createAppAccess"
                checked={createForm.createAppAccess}
                onChange={(event) =>
                  setCreateForm({
                    ...createForm,
                    createAppAccess: event.target.checked,
                  })
                }
                className="h-5 w-5 rounded border-white/10 bg-white/5 accent-[#ff2a32]"
              />
              <label
                htmlFor="createAppAccess"
                className="cursor-pointer text-sm font-medium text-zinc-300"
              >
                Criar acesso ao app para o aluno
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={closeCreateModal} className="flex-1">
              Cancelar
            </Button>

            <Button onClick={handleCreateStudent} loading={saving} className="flex-1">
              Salvar Aluno
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        title="Limite do plano"
      >
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-yellow-500/30 bg-yellow-500/15">
            <Users className="h-7 w-7 text-yellow-400" />
          </div>

          <p className="px-4 text-sm leading-relaxed text-zinc-300">
            {planModalMessage}
          </p>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowPlanModal(false)}
            >
              Fechar
            </Button>

            <Button
              className="flex-1"
              onClick={() => {
                setShowPlanModal(false);
                navigate('/personal/subscription');
              }}
            >
              Ver planos
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default StudentsPage;