import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Users, KeyRound, Check, Copy, Send } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { StudentPremiumCard } from '../../components/personal/StudentPremiumCard';
import * as studentService from '../../services/studentService';
import * as subscriptionService from '../../services/subscriptionService';
import { getPlanLimits } from '../../lib/planLimits';
import { getStudentAuditByTrainer, buildPortfolioSummary, type StudentCardAudit, type PortfolioSummary } from '../../services/auditService';
import { StudentsSummary } from '../../components/personal/StudentsSummary';
import { matchesSmartFilter, type SmartFilter } from '../../lib/studentFilters';
import { cn } from '../../lib/utils';
import type { Student, Payment } from '../../types/database';

type FilterType = SmartFilter;

type CreatedStudentAccess = {
  name: string;
  email: string;
  phone?: string;
  password?: string;
};

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

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Ativos' },
  { key: 'paused', label: 'Pausados' },
  { key: 'inactive', label: 'Inativos' },
];

const smartFilters: { key: FilterType; label: string }[] = [
  { key: 'attention', label: 'Precisam de atenção' },
  { key: 'no_recent_workout', label: 'Sem treinar há 7+ dias' },
  { key: 'overdue_payment', label: 'Pagamentos atrasados' },
  { key: 'new_student', label: 'Novos alunos' },
  { key: 'pending_assessment', label: 'Avaliação pendente' },
  { key: 'no_published_plan', label: 'Sem treino publicado' },
  { key: 'no_app_access', label: 'Sem acesso ao app' },
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

export function StudentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { trainerProfile, isAuthenticated } = useAuthStore();

  const [students, setStudents] = useState<Student[]>([]);
  const [auditMap, setAuditMap] = useState<Record<string, StudentCardAudit>>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planModalMessage, setPlanModalMessage] = useState('');

  const [createForm, setCreateForm] = useState(initialCreateForm);

  const [createdAccess, setCreatedAccess] = useState<CreatedStudentAccess | null>(null);
  const [copiedAccess, setCopiedAccess] = useState(false);

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

      // Sprint 16 Fase 1 — agregação batch por trainer (sem N+1).
      try {
        const audit = await getStudentAuditByTrainer(trainerId);
        setAuditMap(audit.cards || {});
        setPayments(audit.payments || []);
      } catch (auditErr) {
        console.error('[StudentsPage] loadAudit error:', auditErr);
        setAuditMap({});
        setPayments([]);
      }
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
      const result = await studentService.createStudent(trainerProfile.id, {
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

      if (createForm.createAppAccess) {
        const anyResult = result as any;
        const password =
          anyResult?.temporary_password ||
          anyResult?.password ||
          anyResult?.credentials?.password ||
          '';

        setCreatedAccess({
          name: createForm.name.trim(),
          email: createForm.email.trim().toLowerCase(),
          phone: createForm.phone,
          password,
        });

        closeCreateModal();
        return;
      }

      closeCreateModal();
    } catch (err: any) {
      console.error('[StudentsPage] create student error:', err);
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

        window.setTimeout(() => {
          setCopiedAccess(false);
        }, 2000);
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

    const matchesFilter = matchesSmartFilter(student, auditMap[student.id], activeFilter);

    return matchesSearch && matchesFilter;
  });

  // Sprint 16 Fase 2 — resumo executivo da carteira (derivado em memória;
  // considera a carteira COMPLETA, não a lista filtrada).
  const summary: PortfolioSummary = useMemo(
    () => buildPortfolioSummary(students, auditMap, payments),
    [students, auditMap, payments]
  );

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

          <StudentsSummary summary={summary} />

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

          {/* Sprint 16 Fase 4 — Filtros inteligentes (derivados 100% em memória) */}
          <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
            {smartFilters.map((filter) => (
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
                    <StudentPremiumCard
                      student={student}
                      audit={auditMap[student.id] || null}
                    />
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
                onClick={() => setCreatedAccess(null)}
                className="mt-4 h-12 w-full rounded-[20px] border border-white/5 text-[12px] font-black uppercase tracking-widest text-zinc-500 transition-all active:scale-95"
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentsPage;