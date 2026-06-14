import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Apple,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  Flame,
  Loader2,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';

import { Header } from '../../components/ui/Header';
import { Input, Textarea } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { formatDate, formatPhone } from '../../lib/formatters';
import * as studentService from '../../services/studentService';
import type { Student } from '../../types/database';

type NutritionStatus = 'draft' | 'published' | 'archived';

type NutritionMeal = {
  id: string;
  meal_name: string;
  meal_time: string;
  foods: string;
  portions: string;
  calories: number | null;
  notes: string;
  sort_order: number;
};

type NutritionPlan = {
  id: string;
  studentid?: string | null;
  student_id?: string | null;
  coach_email?: string | null;
  name?: string | null;
  dailycalories?: number | null;
  dailyprotein?: number | null;
  dailycarbs?: number | null;
  dailyfats?: number | null;
  meals?: NutritionMeal[] | any;
  objective?: string | null;
  status?: NutritionStatus | null;
  notes?: string | null;
  start_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type MealForm = {
  meal_name: string;
  meal_time: string;
  foods: string;
  portions: string;
  calories: string;
  notes: string;
};

const OBJECTIVES = [
  'Emagrecimento',
  'Hipertrofia',
  'Definição',
  'Saúde',
  'Performance',
  'Reeducação alimentar',
];

const DEFAULT_MEALS: MealForm[] = [
  {
    meal_name: 'Café da manhã',
    meal_time: '07:00',
    foods: '',
    portions: '',
    calories: '',
    notes: '',
  },
  {
    meal_name: 'Almoço',
    meal_time: '12:00',
    foods: '',
    portions: '',
    calories: '',
    notes: '',
  },
  {
    meal_name: 'Jantar',
    meal_time: '19:00',
    foods: '',
    portions: '',
    calories: '',
    notes: '',
  },
];

function createLocalId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNumberOrNull(value: string) {
  if (!String(value || '').trim()) return null;

  const parsed = Number(String(value).replace(',', '.'));

  return Number.isNaN(parsed) ? null : parsed;
}

function toNumberOrZero(value: string) {
  const parsed = toNumberOrNull(value);

  return parsed ?? 0;
}

function normalizeMeals(value: any): NutritionMeal[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((meal, index) => ({
      id: meal?.id || createLocalId(),
      meal_name: String(meal?.meal_name || meal?.name || '').trim(),
      meal_time: String(meal?.meal_time || meal?.time || '').trim(),
      foods: String(meal?.foods || '').trim(),
      portions: String(meal?.portions || '').trim(),
      calories:
        typeof meal?.calories === 'number'
          ? meal.calories
          : toNumberOrNull(String(meal?.calories || '')),
      notes: String(meal?.notes || '').trim(),
      sort_order: Number(meal?.sort_order ?? index),
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

function getPlanTitle(plan: NutritionPlan) {
  return plan.name || 'Plano alimentar';
}

function getPlanStatus(plan: NutritionPlan): NutritionStatus {
  return plan.status || 'draft';
}

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

function StatusBadge({ status }: { status: NutritionStatus }) {
  const label =
    status === 'published'
      ? 'Publicado'
      : status === 'archived'
        ? 'Arquivado'
        : 'Rascunho';

  const className =
    status === 'published'
      ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
      : status === 'archived'
        ? 'border-zinc-400/20 bg-zinc-400/10 text-zinc-300'
        : 'border-yellow-400/25 bg-yellow-400/10 text-yellow-300';

  return (
    <span
      className={cn(
        'rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide',
        className
      )}
    >
      {label}
    </span>
  );
}

function buildPlanMessage(plan: NutritionPlan, student?: Student) {
  const meals = normalizeMeals(plan.meals);

  const lines = [
    `Plano alimentar: ${getPlanTitle(plan)}`,
    student?.name ? `Aluno: ${student.name}` : '',
    plan.objective ? `Objetivo: ${plan.objective}` : '',
    '',
    plan.dailycalories ? `Calorias diárias: ${plan.dailycalories} kcal` : '',
    plan.dailyprotein ? `Proteínas: ${plan.dailyprotein}g` : '',
    plan.dailycarbs ? `Carboidratos: ${plan.dailycarbs}g` : '',
    plan.dailyfats ? `Gorduras: ${plan.dailyfats}g` : '',
    '',
    ...meals.map((meal) =>
      [
        `🍽️ ${meal.meal_name}${meal.meal_time ? ` - ${meal.meal_time}` : ''}`,
        `Alimentos: ${meal.foods}`,
        meal.portions ? `Porções: ${meal.portions}` : '',
        meal.calories ? `Calorias: ${meal.calories} kcal` : '',
        meal.notes ? `Obs: ${meal.notes}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    ),
    '',
    plan.notes ? `Orientações gerais: ${plan.notes}` : '',
  ];

  return lines.filter(Boolean).join('\n\n');
}

export function NutritionPage() {
  const { trainerProfile } = useAuthStore();

  const [coachEmail, setCoachEmail] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<NutritionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<NutritionPlan | null>(null);

  const [saving, setSaving] = useState(false);
  const [copiedPlanId, setCopiedPlanId] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [studentSearch, setStudentSearch] = useState('');

  const [form, setForm] = useState({
    student_id: '',
    name: '',
    objective: 'Emagrecimento',
    start_date: new Date().toISOString().slice(0, 10),
    notes: '',
    dailycalories: '',
    dailyprotein: '',
    dailycarbs: '',
    dailyfats: '',
  });

  const [meals, setMeals] = useState<MealForm[]>(DEFAULT_MEALS);

  useEffect(() => {
    if (!trainerProfile?.id) return;

    loadData();
  }, [trainerProfile?.id]);

  async function getCurrentCoachEmail() {
    const profileEmail = String((trainerProfile as any)?.email || '').trim();

    if (profileEmail) {
      setCoachEmail(profileEmail);
      return profileEmail;
    }

    const { data } = await supabase.auth.getUser();
    const authEmail = String(data.user?.email || '').trim();

    setCoachEmail(authEmail);

    return authEmail;
  }

  async function loadData() {
    if (!trainerProfile?.id) return;

    setLoading(true);
    setError('');

    try {
      const email = await getCurrentCoachEmail();

      const [studentsData, plansResponse] = await Promise.all([
        studentService.getStudentsByTrainer(trainerProfile.id),
        (supabase as any)
          .from('nutrition_plans')
          .select('*')
          .eq('coach_email', email)
          .neq('status', 'archived')
          .order('created_at', { ascending: false }),
      ]);

      if (plansResponse.error) {
        throw plansResponse.error;
      }

      setStudents(studentsData || []);
      setPlans((plansResponse.data || []) as NutritionPlan[]);
    } catch (err: any) {
      console.error('[NutritionPage] loadData error:', err);
      setError(err?.message || 'Erro ao carregar módulo de nutrição.');
      setStudents([]);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }

  function getStudent(studentId?: string | null) {
    return students.find((student) => student.id === studentId);
  }

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();

    if (!query) return students;

    return students.filter((student) => {
      const name = String(student.name || '').toLowerCase();
      const email = String(student.email || '').toLowerCase();
      const phone = String(student.phone || '').toLowerCase();

      return name.includes(query) || email.includes(query) || phone.includes(query);
    });
  }, [students, studentSearch]);

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();

    return plans.filter((plan) => {
      const student = getStudent(plan.student_id || plan.studentid);

      return (
        !query ||
        String(getPlanTitle(plan)).toLowerCase().includes(query) ||
        String(plan.objective || '').toLowerCase().includes(query) ||
        String(student?.name || '').toLowerCase().includes(query) ||
        String(student?.email || '').toLowerCase().includes(query)
      );
    });
  }, [plans, students, search]);

  const summary = useMemo(() => {
    const published = plans.filter((plan) => getPlanStatus(plan) === 'published').length;
    const draft = plans.filter((plan) => getPlanStatus(plan) === 'draft').length;
    const totalMeals = plans.reduce(
      (sum, plan) => sum + normalizeMeals(plan.meals).length,
      0
    );

    return {
      total: plans.length,
      published,
      draft,
      totalMeals,
    };
  }, [plans]);

  function resetForm() {
    setForm({
      student_id: '',
      name: '',
      objective: 'Emagrecimento',
      start_date: new Date().toISOString().slice(0, 10),
      notes: '',
      dailycalories: '',
      dailyprotein: '',
      dailycarbs: '',
      dailyfats: '',
    });

    setStudentSearch('');
    setMeals(DEFAULT_MEALS);
    setError('');
    setSuccess('');
  }

  function openCreateModal() {
    resetForm();
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    resetForm();
  }

  function updateMeal(index: number, data: Partial<MealForm>) {
    setMeals((prev) =>
      prev.map((meal, currentIndex) =>
        currentIndex === index ? { ...meal, ...data } : meal
      )
    );
  }

  function addMeal() {
    setMeals((prev) => [
      ...prev,
      {
        meal_name: '',
        meal_time: '',
        foods: '',
        portions: '',
        calories: '',
        notes: '',
      },
    ]);
  }

  function removeMeal(index: number) {
    setMeals((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }

  function validateForm() {
    if (!coachEmail) return 'Email do personal não encontrado. Saia e entre novamente.';

    if (!form.student_id) return 'Selecione o aluno para o plano alimentar.';

    if (!form.name.trim()) return 'Preencha o nome do plano alimentar.';

    const validMeals = meals.filter(
      (meal) => meal.meal_name.trim() && meal.foods.trim()
    );

    if (validMeals.length === 0) {
      return 'Adicione pelo menos uma refeição com nome e alimentos.';
    }

    return '';
  }

  async function handleCreatePlan() {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const selectedStudent = getStudent(form.student_id);

      const mealsPayload: NutritionMeal[] = meals
        .filter((meal) => meal.meal_name.trim() && meal.foods.trim())
        .map((meal, index) => ({
          id: createLocalId(),
          meal_name: meal.meal_name.trim(),
          meal_time: meal.meal_time.trim(),
          foods: meal.foods.trim(),
          portions: meal.portions.trim(),
          calories: toNumberOrNull(meal.calories),
          notes: meal.notes.trim(),
          sort_order: index,
        }));

      const payload = {
        id: createLocalId(),
        studentid: form.student_id,
        student_id: form.student_id,
        coach_email: coachEmail,
        name: form.name.trim(),
        objective: form.objective || null,
        status: 'draft',
        notes: form.notes || null,
        start_date: form.start_date || null,
        dailycalories: toNumberOrZero(form.dailycalories),
        dailyprotein: toNumberOrZero(form.dailyprotein),
        dailycarbs: toNumberOrZero(form.dailycarbs),
        dailyfats: toNumberOrZero(form.dailyfats),
        meals: mealsPayload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: insertError } = await (supabase as any)
        .from('nutrition_plans')
        .insert(payload);

      if (insertError) {
        throw insertError;
      }

      setShowCreateModal(false);
      resetForm();
      setSuccess(
        selectedStudent
          ? `Plano alimentar criado para ${selectedStudent.name}.`
          : 'Plano alimentar criado com sucesso.'
      );
      setTimeout(() => setSuccess(''), 3500);

      await loadData();
    } catch (err: any) {
      console.error('[NutritionPage] create plan error:', err);
      setError(err?.message || 'Erro ao criar plano alimentar.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(plan: NutritionPlan) {
    setError('');

    try {
      const { error: updateError } = await (supabase as any)
        .from('nutrition_plans')
        .update({
          status: 'published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', plan.id)
        .eq('coach_email', coachEmail);

      if (updateError) throw updateError;

      setSuccess('Plano publicado para o aluno!');
      setTimeout(() => setSuccess(''), 3500);
      await loadData();
    } catch (err: any) {
      console.error('[NutritionPage] publish error:', err);
      setError(err?.message || 'Erro ao publicar plano alimentar.');
    }
  }

  async function handleDelete(plan: NutritionPlan) {
    const confirmed = confirm('Deseja realmente excluir este plano alimentar?');

    if (!confirmed) return;

    try {
      const { error: deleteError } = await (supabase as any)
        .from('nutrition_plans')
        .delete()
        .eq('id', plan.id)
        .eq('coach_email', coachEmail);

      if (deleteError) throw deleteError;

      await loadData();
    } catch (err: any) {
      console.error('[NutritionPage] delete error:', err);
      setError(err?.message || 'Erro ao excluir plano alimentar.');
    }
  }

  function handleCopyPlan(plan: NutritionPlan) {
    const student = getStudent(plan.student_id || plan.studentid);
    const text = buildPlanMessage(plan, student);

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedPlanId(plan.id);
        setTimeout(() => setCopiedPlanId(null), 2000);
      })
      .catch(() => {
        setError('Não foi possível copiar o plano.');
      });
  }

  function handleSendWhatsapp(plan: NutritionPlan) {
    const student = getStudent(plan.student_id || plan.studentid);
    const phone = normalizeWhatsappPhone(student?.phone);
    const text = buildPlanMessage(plan, student);

    if (!phone) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setSuccess('Telefone não informado. Plano copiado para envio manual.');
          setTimeout(() => setSuccess(''), 3500);
        })
        .catch(() => {});

      return;
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  }

  function openDetails(plan: NutritionPlan) {
    setSelectedPlan(plan);
    setShowDetailsModal(true);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#ff2a32] border-t-transparent" />
          <p className="text-sm font-medium text-zinc-500">Carregando nutrição...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header title="Nutrição" showBack />

      <div className="mx-auto max-w-lg px-4 pb-32 pt-6">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-[#ff2a32]/20 bg-[#ff2a32]/15 text-[#ff2a32] shadow-[0_18px_45px_rgba(255,42,48,0.2)]">
                <Apple className="h-8 w-8" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                  Módulo Premium
                </p>

                <h1 className="mt-1 text-[25px] font-black uppercase italic tracking-[-0.05em] text-white">
                  Nutrição
                </h1>

                <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
                  Crie planos alimentares e publique para seus alunos.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-[#ff2a32] px-4 text-[13px] font-black text-white shadow-[0_16px_40px_rgba(255,42,48,0.28)] transition-all active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              CRIAR PLANO ALIMENTAR
            </button>
          </div>

          {success && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Planos', value: summary.total, icon: Apple, color: 'text-[#ff2a32]' },
              { label: 'Pub.', value: summary.published, icon: Send, color: 'text-emerald-400' },
              { label: 'Rasc.', value: summary.draft, icon: Sparkles, color: 'text-yellow-400' },
              { label: 'Refs.', value: summary.totalMeals, icon: Utensils, color: 'text-blue-400' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[20px] border border-white/10 bg-white/[0.035] p-3 text-center"
              >
                <stat.icon className={cn('mx-auto mb-2 h-4 w-4', stat.color)} />
                <p className="text-lg font-black text-white">{stat.value}</p>
                <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar plano, aluno ou objetivo..."
              className="w-full rounded-[20px] border border-white/10 bg-white/[0.045] py-4 pl-11 pr-4 text-sm font-medium text-white outline-none placeholder:text-zinc-600 focus:border-[#ff2a32]/40"
            />
          </div>

          {filteredPlans.length === 0 ? (
            <div className="py-10">
              <EmptyState
                icon={
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/5 bg-white/[0.03]">
                    <Apple className="h-10 w-10 text-zinc-700" />
                  </div>
                }
                title={plans.length === 0 ? 'Nenhum plano alimentar' : 'Nenhum resultado'}
                description={
                  plans.length === 0
                    ? 'Crie o primeiro plano alimentar para um aluno.'
                    : 'Tente alterar a busca.'
                }
                action={
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="mt-6 rounded-2xl bg-[#ff2a32] px-8 py-4 text-[14px] font-black text-white shadow-[0_15px_40px_rgba(255,42,48,0.3)] transition-all active:scale-95"
                  >
                    CRIAR PLANO
                  </button>
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPlans.map((plan) => {
                const student = getStudent(plan.student_id || plan.studentid);
                const avatarUrl = getStudentAvatarUrl(student);
                const mealCount = normalizeMeals(plan.meals).length;
                const status = getPlanStatus(plan);

                return (
                  <div
                    key={plan.id}
                    className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.32)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#ff2a32]/15 bg-[#ff2a32]/10 text-sm font-black text-[#ff2a32]">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={student?.name || 'Aluno'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getStudentInitials(student?.name)
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-[15px] font-black text-white">
                              {getPlanTitle(plan)}
                            </h3>

                            <p className="truncate text-[12px] font-medium text-zinc-500">
                              {student?.name || 'Aluno'} • {plan.objective || 'Objetivo geral'}
                            </p>
                          </div>

                          <StatusBadge status={status} />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-zinc-400">
                            <Utensils className="h-3 w-3" />
                            {mealCount} refeição{mealCount === 1 ? '' : 's'}
                          </span>

                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-zinc-400">
                            <Flame className="h-3 w-3" />
                            {plan.dailycalories || 0} kcal
                          </span>

                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-zinc-400">
                            <Calendar className="h-3 w-3" />
                            {plan.start_date ? formatDate(plan.start_date) : 'Hoje'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => openDetails(plan)}
                        className="flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-zinc-300 active:scale-95"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyPlan(plan)}
                        className="flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-zinc-300 active:scale-95"
                      >
                        {copiedPlanId === plan.id ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendWhatsapp(plan)}
                        className="flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-zinc-300 active:scale-95"
                      >
                        <Send className="h-4 w-4" />
                      </button>

                      {status !== 'published' ? (
                        <button
                          type="button"
                          onClick={() => handlePublish(plan)}
                          className="flex h-11 items-center justify-center rounded-xl bg-[#ff2a32] text-white active:scale-95"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDelete(plan)}
                          className="flex h-11 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 active:scale-95"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/85 px-3 backdrop-blur-xl sm:items-center">
          <button type="button" className="absolute inset-0" onClick={closeCreateModal} />

          <div className="relative flex max-h-[94vh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[34px] border border-white/10 bg-[#080808] shadow-[0_30px_100px_rgba(0,0,0,0.9)] sm:rounded-[34px]">
            <div className="shrink-0 border-b border-white/5 bg-[#080808] px-5 py-5">
              <button
                type="button"
                onClick={closeCreateModal}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>

              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                Nutrição Premium
              </p>

              <h2 className="mt-1 text-[22px] font-black uppercase italic tracking-tight text-white">
                Novo Plano Alimentar
              </h2>

              <p className="mt-1 pr-12 text-[12px] font-medium text-zinc-500">
                Escolha o aluno e monte as refeições do plano.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-5">
                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                    Aluno
                  </span>

                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                    <input
                      value={studentSearch}
                      onChange={(event) => setStudentSearch(event.target.value)}
                      placeholder="Buscar aluno..."
                      className="w-full rounded-[18px] border border-white/10 bg-white/[0.045] py-3.5 pl-11 pr-4 text-sm font-medium text-white outline-none placeholder:text-zinc-600 focus:border-[#ff2a32]/40"
                    />
                  </div>

                  <div className="max-h-40 space-y-2 overflow-y-auto">
                    {filteredStudents.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, student_id: student.id });
                          setStudentSearch(student.name);
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.98]',
                          form.student_id === student.id
                            ? 'border-[#ff2a32]/35 bg-[#ff2a32]/15'
                            : 'border-white/10 bg-white/[0.035]'
                        )}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#ff2a32]/10 text-xs font-black text-[#ff2a32]">
                          {getStudentAvatarUrl(student) ? (
                            <img
                              src={getStudentAvatarUrl(student)}
                              alt={student.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getStudentInitials(student.name)
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-white">
                            {student.name}
                          </p>

                          <p className="truncate text-[11px] text-zinc-500">
                            {student.email || formatPhone(student.phone)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Nome do plano"
                  placeholder="Ex: Plano alimentar - Emagrecimento"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />

                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                    Objetivo
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {OBJECTIVES.map((objective) => (
                      <button
                        key={objective}
                        type="button"
                        onClick={() => setForm({ ...form, objective })}
                        className={cn(
                          'min-h-11 rounded-2xl border px-3 py-2 text-[11px] font-black transition-all active:scale-[0.97]',
                          form.objective === objective
                            ? 'border-[#ff2a32]/40 bg-[#ff2a32]/15 text-[#ff2a32] shadow-[0_12px_30px_rgba(255,42,48,0.18)]'
                            : 'border-white/10 bg-white/[0.045] text-zinc-400'
                        )}
                      >
                        {objective}
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Data inicial"
                  type="date"
                  value={form.start_date}
                  onChange={(event) => setForm({ ...form, start_date: event.target.value })}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Calorias"
                    type="number"
                    placeholder="2000"
                    value={form.dailycalories}
                    onChange={(event) =>
                      setForm({ ...form, dailycalories: event.target.value })
                    }
                  />

                  <Input
                    label="Proteína (g)"
                    type="number"
                    placeholder="150"
                    value={form.dailyprotein}
                    onChange={(event) =>
                      setForm({ ...form, dailyprotein: event.target.value })
                    }
                  />

                  <Input
                    label="Carboidrato (g)"
                    type="number"
                    placeholder="220"
                    value={form.dailycarbs}
                    onChange={(event) =>
                      setForm({ ...form, dailycarbs: event.target.value })
                    }
                  />

                  <Input
                    label="Gordura (g)"
                    type="number"
                    placeholder="60"
                    value={form.dailyfats}
                    onChange={(event) =>
                      setForm({ ...form, dailyfats: event.target.value })
                    }
                  />
                </div>

                <Textarea
                  label="Orientações gerais"
                  placeholder="Ex: Beber 2L de água por dia, evitar frituras..."
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                      Refeições
                    </span>

                    <button
                      type="button"
                      onClick={addMeal}
                      className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-black text-zinc-300"
                    >
                      + Refeição
                    </button>
                  </div>

                  {meals.map((meal, index) => (
                    <div
                      key={`${meal.meal_name}-${index}`}
                      className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff2a32]/10 text-[#ff2a32]">
                            <Utensils className="h-4 w-4" />
                          </div>

                          <p className="text-sm font-black text-white">
                            Refeição {index + 1}
                          </p>
                        </div>

                        {meals.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMeal(index)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Input
                          label="Nome"
                          placeholder="Ex: Café da manhã"
                          value={meal.meal_name}
                          onChange={(event) =>
                            updateMeal(index, { meal_name: event.target.value })
                          }
                        />

                        <Input
                          label="Horário"
                          placeholder="Ex: 07:00"
                          value={meal.meal_time}
                          onChange={(event) =>
                            updateMeal(index, { meal_time: event.target.value })
                          }
                        />

                        <Textarea
                          label="Alimentos"
                          placeholder="Ex: 2 ovos, 1 banana, 30g de aveia..."
                          value={meal.foods}
                          onChange={(event) =>
                            updateMeal(index, { foods: event.target.value })
                          }
                        />

                        <Input
                          label="Porções"
                          placeholder="Ex: 1 prato médio"
                          value={meal.portions}
                          onChange={(event) =>
                            updateMeal(index, { portions: event.target.value })
                          }
                        />

                        <Input
                          label="Calorias"
                          type="number"
                          placeholder="Ex: 450"
                          value={meal.calories}
                          onChange={(event) =>
                            updateMeal(index, { calories: event.target.value })
                          }
                        />

                        <Textarea
                          label="Observações"
                          placeholder="Ex: Pode substituir banana por maçã..."
                          value={meal.notes}
                          onChange={(event) =>
                            updateMeal(index, { notes: event.target.value })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
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
                  onClick={handleCreatePlan}
                  disabled={saving}
                  className="flex-1 rounded-[18px] bg-[#ff2a32] px-4 py-4 text-[13px] font-black text-white transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {saving ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    'SALVAR PLANO'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPlan && showDetailsModal && (
        <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/85 px-3 backdrop-blur-xl sm:items-center">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setShowDetailsModal(false)}
          />

          <div className="relative flex max-h-[92vh] w-full max-w-[420px] flex-col overflow-hidden rounded-t-[34px] border border-white/10 bg-[#080808] shadow-[0_30px_100px_rgba(0,0,0,0.9)] sm:rounded-[34px]">
            <div className="shrink-0 border-b border-white/5 px-5 py-5">
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>

              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                Plano Alimentar
              </p>

              <h2 className="mt-1 pr-12 text-[22px] font-black uppercase italic tracking-tight text-white">
                {getPlanTitle(selectedPlan)}
              </h2>

              <p className="mt-1 text-[12px] font-medium text-zinc-500">
                {getStudent(selectedPlan.student_id || selectedPlan.studentid)?.name || 'Aluno'} •{' '}
                {selectedPlan.objective || 'Objetivo geral'}
              </p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
                  <p className="text-sm font-black text-white">
                    {selectedPlan.dailycalories || 0}
                  </p>
                  <p className="text-[9px] font-black uppercase text-zinc-600">Kcal</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
                  <p className="text-sm font-black text-white">
                    {selectedPlan.dailyprotein || 0}g
                  </p>
                  <p className="text-[9px] font-black uppercase text-zinc-600">Prot.</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
                  <p className="text-sm font-black text-white">
                    {selectedPlan.dailycarbs || 0}g
                  </p>
                  <p className="text-[9px] font-black uppercase text-zinc-600">Carb.</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
                  <p className="text-sm font-black text-white">
                    {selectedPlan.dailyfats || 0}g
                  </p>
                  <p className="text-[9px] font-black uppercase text-zinc-600">Gord.</p>
                </div>
              </div>

              {normalizeMeals(selectedPlan.meals).map((meal) => (
                <div
                  key={meal.id}
                  className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ff2a32]/10 text-[#ff2a32]">
                      <Utensils className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-white">
                        {meal.meal_name}
                      </h3>

                      <p className="text-[11px] font-bold text-zinc-500">
                        {meal.meal_time || 'Horário livre'}
                      </p>
                    </div>
                  </div>

                  <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                    {meal.foods}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {meal.portions && (
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-bold text-zinc-400">
                        {meal.portions}
                      </span>
                    )}

                    {meal.calories && (
                      <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-[11px] font-bold text-yellow-300">
                        {meal.calories} kcal
                      </span>
                    )}
                  </div>

                  {meal.notes && (
                    <p className="mt-3 rounded-2xl border border-white/5 bg-black/20 p-3 text-xs leading-relaxed text-zinc-500">
                      {meal.notes}
                    </p>
                  )}
                </div>
              ))}

              {selectedPlan.notes && (
                <div className="rounded-[24px] border border-[#ff2a32]/20 bg-[#ff2a32]/10 p-4">
                  <p className="text-[11px] font-black uppercase tracking-wide text-[#ff2a32]">
                    Orientações gerais
                  </p>

                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                    {selectedPlan.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-white/10 bg-[#080808] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyPlan(selectedPlan)}
                  className="h-12 rounded-[18px] border border-white/10 bg-white/[0.06] text-[12px] font-black text-white"
                >
                  COPIAR
                </button>

                <button
                  type="button"
                  onClick={() => handleSendWhatsapp(selectedPlan)}
                  className="h-12 rounded-[18px] border border-white/10 bg-white/[0.06] text-[12px] font-black text-white"
                >
                  WHATSAPP
                </button>

                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="h-12 rounded-[18px] bg-[#ff2a32] text-[12px] font-black text-white"
                >
                  FECHAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NutritionPage;