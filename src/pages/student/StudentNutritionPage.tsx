import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Apple,
  Beef,
  CalendarDays,
  ChevronDown,
  Clock3,
  Flame,
  Loader2,
  Salad,
  Target,
  Utensils,
  Wheat,
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import * as studentService from '../../services/studentService';

type NutritionMeal = {
  id?: string | null;
  meal_name?: string | null;
  meal_time?: string | null;
  foods?: unknown;
  portions?: string | null;
  notes?: string | null;
  calories?: number | string | null;
  protein?: number | string | null;
  carbs?: number | string | null;
  fats?: number | string | null;
  sort_order?: number | string | null;

  name?: string | null;
  title?: string | null;
  time?: string | null;
  hour?: string | null;
  description?: string | null;
  instructions?: string | null;
  items?: unknown;
  food_items?: unknown;
  meal_items?: unknown;
};

type NutritionPlan = {
  id: string;
  studentid?: string | null;
  student_id?: string | null;
  coach_email?: string | null;
  name?: string | null;
  objective?: string | null;
  status?: string | null;
  notes?: string | null;
  start_date?: string | null;
  dailycalories?: number | string | null;
  dailyprotein?: number | string | null;
  dailycarbs?: number | string | null;
  dailyfats?: number | string | null;
  meals?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
};

type NutritionState = {
  student: any | null;
  plans: NutritionPlan[];
};

function getStudentName(student: any) {
  return student?.name || student?.full_name || 'Aluno';
}

function getFirstName(student: any) {
  const name = getStudentName(student);
  const first =
    String(name || 'Aluno').trim().split(/\s+/)[0] || 'Aluno';

  return (
    first.charAt(0).toUpperCase() +
    first.slice(1).toLowerCase()
  );
}

function toNumber(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const parsed = Number(String(value).replace(',', '.'));

  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: unknown, suffix = '') {
  const parsed = toNumber(value);

  if (parsed === null) return '—';

  return `${parsed.toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
  })}${suffix}`;
}

function formatDateSafe(value?: string | null) {
  if (!value) return '—';

  const dateOnly = String(value).slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const [year, month, day] = dateOnly.split('-');

    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) return '—';

  return date.toLocaleDateString('pt-BR');
}

function getTimestamp(value?: string | null) {
  if (!value) return 0;

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function parseMeals(value: unknown): NutritionMeal[] {
  let meals: NutritionMeal[] = [];

  if (Array.isArray(value)) {
    meals = value as NutritionMeal[];
  } else if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        meals = parsed as NutritionMeal[];
      } else if (Array.isArray(parsed?.meals)) {
        meals = parsed.meals as NutritionMeal[];
      }
    } catch {
      meals = [];
    }
  } else if (
    value &&
    typeof value === 'object' &&
    Array.isArray((value as any).meals)
  ) {
    meals = (value as any).meals;
  }

  return [...meals].sort((mealA, mealB) => {
    const orderA = toNumber(mealA?.sort_order) ?? 0;
    const orderB = toNumber(mealB?.sort_order) ?? 0;

    return orderA - orderB;
  });
}

function getMealKey(meal: NutritionMeal, index: number) {
  return String(meal?.id || `meal-${index}`);
}

function getStructuredItems(meal: NutritionMeal): any[] {
  const candidates = [
    meal?.items,
    meal?.food_items,
    meal?.meal_items,
  ];

  if (Array.isArray(meal?.foods)) {
    candidates.unshift(meal.foods);
  }

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function cleanFoodsText(value: unknown) {
  if (typeof value !== 'string') return '';

  return value
    .split(/[;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(' • ');
}

function getMealFoodsText(meal: NutritionMeal) {
  return cleanFoodsText(meal?.foods);
}

function getMealPortions(meal: NutritionMeal) {
  return String(
    meal?.portions ||
      (meal as any)?.portion ||
      (meal as any)?.serving ||
      ''
  ).trim();
}

function getMealTitle(
  meal: NutritionMeal,
  index: number
) {
  return (
    meal?.meal_name ||
    meal?.name ||
    meal?.title ||
    (meal as any)?.label ||
    (meal as any)?.tipo ||
    `Refeição ${index + 1}`
  );
}

function getMealTime(meal: NutritionMeal) {
  return String(
    meal?.meal_time ||
      meal?.time ||
      meal?.hour ||
      (meal as any)?.horario ||
      (meal as any)?.scheduled_time ||
      ''
  ).trim();
}

function getMealDescription(meal: NutritionMeal) {
  return String(
    meal?.notes ||
      meal?.description ||
      meal?.instructions ||
      (meal as any)?.observations ||
      ''
  ).trim();
}

function getFoodName(item: any, index: number) {
  if (typeof item === 'string') {
    return item;
  }

  return (
    item?.name ||
    item?.food ||
    item?.food_name ||
    item?.alimento ||
    `Item ${index + 1}`
  );
}

function getFoodQuantity(item: any) {
  if (!item || typeof item === 'string') return '';

  return (
    item?.quantity ||
    item?.amount ||
    item?.portion ||
    item?.porcao ||
    item?.qty ||
    ''
  );
}

function getFoodCalories(item: any) {
  return toNumber(
    item?.calories ||
      item?.kcal ||
      item?.energia
  );
}

function getFoodProtein(item: any) {
  return toNumber(
    item?.protein ||
      item?.proteina ||
      item?.proteins
  );
}

function getFoodCarbs(item: any) {
  return toNumber(
    item?.carbs ||
      item?.carbohydrates ||
      item?.carboidratos
  );
}

function getFoodFats(item: any) {
  return toNumber(
    item?.fats ||
      item?.fat ||
      item?.gorduras ||
      item?.lipids
  );
}

function sumItems(
  items: any[],
  getter: (item: any) => number | null
) {
  return items.reduce((total, item) => {
    const value = getter(item);

    return total + (value ?? 0);
  }, 0);
}

function getMealCalories(meal: NutritionMeal) {
  const direct = toNumber(
    meal?.calories ||
      (meal as any)?.kcal ||
      (meal as any)?.totalCalories
  );

  if (direct !== null) return direct;

  const items = getStructuredItems(meal);
  const total = sumItems(items, getFoodCalories);

  return total > 0 ? total : null;
}

function getMealProtein(meal: NutritionMeal) {
  const direct = toNumber(
    meal?.protein ||
      (meal as any)?.proteins ||
      (meal as any)?.proteina
  );

  if (direct !== null) return direct;

  const total = sumItems(
    getStructuredItems(meal),
    getFoodProtein
  );

  return total > 0 ? total : null;
}

function getMealCarbs(meal: NutritionMeal) {
  const direct = toNumber(
    meal?.carbs ||
      (meal as any)?.carbohydrates ||
      (meal as any)?.carboidratos
  );

  if (direct !== null) return direct;

  const total = sumItems(
    getStructuredItems(meal),
    getFoodCarbs
  );

  return total > 0 ? total : null;
}

function getMealFats(meal: NutritionMeal) {
  const direct = toNumber(
    meal?.fats ||
      (meal as any)?.fat ||
      (meal as any)?.gorduras
  );

  if (direct !== null) return direct;

  const total = sumItems(
    getStructuredItems(meal),
    getFoodFats
  );

  return total > 0 ? total : null;
}

function getPlanCalories(plan: NutritionPlan | null) {
  return toNumber(plan?.dailycalories);
}

function getPlanProtein(plan: NutritionPlan | null) {
  return toNumber(plan?.dailyprotein);
}

function getPlanCarbs(plan: NutritionPlan | null) {
  return toNumber(plan?.dailycarbs);
}

function getPlanFats(plan: NutritionPlan | null) {
  return toNumber(plan?.dailyfats);
}

function getPlanStatusLabel(status?: string | null) {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'published') return 'Publicado';
  if (normalized === 'active') return 'Ativo';
  if (normalized === 'draft') return 'Rascunho';

  return 'Plano alimentar';
}

function getActivePlan(plans: NutritionPlan[]) {
  return (
    plans.find((plan) => {
      const status = String(
        plan.status || ''
      ).toLowerCase();

      return (
        status === 'published' ||
        status === 'active'
      );
    }) || null
  );
}

async function loadPlansByStudent(
  studentId: string
): Promise<NutritionPlan[]> {
  const [modernResult, legacyResult] =
    await Promise.allSettled([
      supabase
        .from('nutrition_plans')
        .select('*')
        .eq('student_id', studentId)
        .order('updated_at', { ascending: false }),

      supabase
        .from('nutrition_plans')
        .select('*')
        .eq('studentid', studentId)
        .order('updated_at', { ascending: false }),
    ]);

  const plans: NutritionPlan[] = [];
  const errors: any[] = [];
  let successfulQuery = false;

  for (const result of [modernResult, legacyResult]) {
    if (result.status === 'rejected') {
      errors.push(result.reason);
      continue;
    }

    if (result.value.error) {
      errors.push(result.value.error);
      continue;
    }

    successfulQuery = true;

    if (Array.isArray(result.value.data)) {
      plans.push(
        ...(result.value.data as NutritionPlan[])
      );
    }
  }

  if (!successfulQuery && errors.length > 0) {
    throw errors[0];
  }

  const uniquePlans = new Map<
    string,
    NutritionPlan
  >();

  plans.forEach((plan) => {
    if (!plan?.id) return;

    const current = uniquePlans.get(plan.id);

    if (!current) {
      uniquePlans.set(plan.id, plan);
      return;
    }

    const currentDate = getTimestamp(
      current.updated_at || current.created_at
    );

    const newDate = getTimestamp(
      plan.updated_at || plan.created_at
    );

    if (newDate > currentDate) {
      uniquePlans.set(plan.id, plan);
    }
  });

  return [...uniquePlans.values()].sort(
    (planA, planB) => {
      const dateA = getTimestamp(
        planA.updated_at || planA.created_at
      );

      const dateB = getTimestamp(
        planB.updated_at || planB.created_at
      );

      return dateB - dateA;
    }
  );
}

export function StudentNutritionPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [state, setState] =
    useState<NutritionState>({
      student: null,
      plans: [],
    });

  const [openMealKey, setOpenMealKey] =
    useState('');

  useEffect(() => {
    void loadNutrition();
  }, []);

  async function loadNutrition() {
    setLoading(true);
    setError('');

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      const authUser = authData.user;

      if (!authUser?.id) {
        setError(
          'Sessão do aluno não encontrada. Faça login novamente.'
        );

        return;
      }

      const accountResult =
        await studentService.getStudentAccountByAuthUser(
          authUser.id
        );

      let studentData =
        accountResult?.student || null;

      if (!studentData) {
        studentData =
          await studentService.getStudentByAuthUser(
            authUser.id
          );
      }

      if (!studentData?.id) {
        setError(
          'Perfil do aluno não encontrado.'
        );

        return;
      }

      const plans = await loadPlansByStudent(
        studentData.id
      );

      setState({
        student: studentData,
        plans,
      });

      const activePlan = getActivePlan(plans);
      const planMeals = parseMeals(
        activePlan?.meals
      );

      if (planMeals.length > 0) {
        setOpenMealKey(
          getMealKey(planMeals[0], 0)
        );
      } else {
        setOpenMealKey('');
      }
    } catch (loadError: any) {
      console.error(
        '[StudentNutritionPage] loadNutrition error:',
        loadError
      );

      setError(
        loadError?.message ||
          'Erro ao carregar nutrição.'
      );
    } finally {
      setLoading(false);
    }
  }

  const activePlan = useMemo(
    () => getActivePlan(state.plans),
    [state.plans]
  );

  const meals = useMemo(
    () => parseMeals(activePlan?.meals),
    [activePlan]
  );

  const totalMeals = meals.length;

  const planCalories =
    getPlanCalories(activePlan);

  const planProtein =
    getPlanProtein(activePlan);

  const planCarbs = getPlanCarbs(activePlan);
  const planFats = getPlanFats(activePlan);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-88px)] items-center justify-center bg-[#050505] px-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/25 bg-[#ff2a32]/15 shadow-[0_18px_45px_rgba(255,42,48,0.22)]">
            <Loader2 className="h-9 w-9 animate-spin text-[#ff2a32]" />
          </div>

          <div>
            <p className="text-sm font-black text-white">
              Carregando nutrição...
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Buscando seu plano alimentar.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] px-4 pb-28 pt-8 text-white">
        <div className="mx-auto max-w-lg rounded-[30px] border border-red-500/20 bg-red-500/10 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-300">
            <AlertCircle className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-xl font-black text-white">
            Não foi possível carregar
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-red-200/80">
            {error}
          </p>

          <button
            type="button"
            onClick={loadNutrition}
            className="mt-6 h-12 w-full rounded-2xl bg-[#ff2a32] text-sm font-black text-white"
          >
            TENTAR NOVAMENTE
          </button>
        </div>
      </div>
    );
  }

  if (!activePlan) {
    return (
      <div className="min-h-screen bg-[#050505] px-4 pb-32 pt-6 text-white">
        <div className="mx-auto max-w-lg space-y-5">
          <section className="rounded-[34px] border border-white/10 bg-white/[0.045] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/20 bg-[#ff2a32]/15 text-[#ff2a32]">
              <Apple className="h-10 w-10" />
            </div>

            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-[#ff2a32]">
              Nutrição
            </p>

            <h1 className="mt-2 text-[27px] font-black uppercase italic tracking-[-0.06em] text-white">
              Sem plano ativo
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              Quando seu personal publicar um
              plano alimentar, ele aparecerá
              aqui.
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 pb-32 pt-6 text-white">
      <div className="mx-auto max-w-lg space-y-5">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        >
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#ff2a32]/20 to-transparent" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff2a32]">
                  Nutrição
                </p>

                <h1 className="mt-1 text-[28px] font-black uppercase italic tracking-[-0.06em] text-white">
                  Plano alimentar
                </h1>

                <p className="mt-1 text-[12px] font-medium text-zinc-500">
                  {getFirstName(state.student)},
                  siga seu plano com
                  consistência.
                </p>
              </div>

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-[#ff2a32]/20 bg-[#ff2a32]/15 text-[#ff2a32]">
                <Apple className="h-7 w-7" />
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-black text-white">
                    {activePlan.name ||
                      'Plano alimentar'}
                  </h2>

                  <p className="mt-1 text-xs font-medium text-zinc-500">
                    {getPlanStatusLabel(
                      activePlan.status
                    )}
                  </p>
                </div>

                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300">
                  Ativo
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <SmallInfo
                  icon={
                    <CalendarDays className="h-4 w-4" />
                  }
                  label="Início"
                  value={formatDateSafe(
                    activePlan.start_date ||
                      activePlan.created_at
                  )}
                />

                <SmallInfo
                  icon={
                    <Utensils className="h-4 w-4" />
                  }
                  label="Refeições"
                  value={`${totalMeals}`}
                />
              </div>

              {activePlan.objective && (
                <div className="mt-3 rounded-2xl border border-white/5 bg-white/[0.035] p-3">
                  <div className="flex items-start gap-3">
                    <Target className="mt-0.5 h-4 w-4 shrink-0 text-[#ff2a32]" />

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-600">
                        Objetivo
                      </p>

                      <p className="mt-1 text-sm font-semibold text-zinc-200">
                        {activePlan.objective}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <section className="grid grid-cols-2 gap-3">
          <MacroCard
            icon={<Flame className="h-5 w-5" />}
            label="Calorias"
            value={
              planCalories !== null
                ? formatNumber(
                    planCalories,
                    ' kcal'
                  )
                : '—'
            }
            accent="red"
          />

          <MacroCard
            icon={<Beef className="h-5 w-5" />}
            label="Proteína"
            value={
              planProtein !== null
                ? formatNumber(planProtein, 'g')
                : '—'
            }
            accent="emerald"
          />

          <MacroCard
            icon={<Wheat className="h-5 w-5" />}
            label="Carboidratos"
            value={
              planCarbs !== null
                ? formatNumber(planCarbs, 'g')
                : '—'
            }
            accent="yellow"
          />

          <MacroCard
            icon={<Salad className="h-5 w-5" />}
            label="Gorduras"
            value={
              planFats !== null
                ? formatNumber(planFats, 'g')
                : '—'
            }
            accent="blue"
          />
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                Refeições
              </p>

              <h2 className="mt-1 text-xl font-black text-white">
                Seu dia alimentar
              </h2>
            </div>

            <Utensils className="h-5 w-5 text-[#ff2a32]" />
          </div>

          {meals.length > 0 ? (
            <div className="space-y-3">
              {meals.map((meal, index) => {
                const key = getMealKey(
                  meal,
                  index
                );

                const isOpen =
                  openMealKey === key;

                const structuredItems =
                  getStructuredItems(meal);

                const foodsText =
                  getMealFoodsText(meal);

                const portions =
                  getMealPortions(meal);

                const calories =
                  getMealCalories(meal);

                const protein =
                  getMealProtein(meal);

                const carbs =
                  getMealCarbs(meal);

                const fats =
                  getMealFats(meal);

                const description =
                  getMealDescription(meal);

                return (
                  <div
                    key={key}
                    className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMealKey(
                          isOpen ? '' : key
                        )
                      }
                      className="flex w-full items-center justify-between gap-3 p-4 text-left"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff2a32]/10 text-[#ff2a32]">
                          <Utensils className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black text-white">
                            {getMealTitle(
                              meal,
                              index
                            )}
                          </h3>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-zinc-500">
                            {getMealTime(meal) && (
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="h-3 w-3" />
                                {getMealTime(meal)}
                              </span>
                            )}

                            {calories !== null && (
                              <span>
                                {formatNumber(
                                  calories,
                                  ' kcal'
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform ${
                          isOpen
                            ? 'rotate-180'
                            : ''
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="border-t border-white/10 px-4 pb-4 pt-3">
                        <div className="mb-3 grid grid-cols-4 gap-2">
                          <MiniMacro
                            label="Kcal"
                            value={
                              calories !== null
                                ? formatNumber(
                                    calories
                                  )
                                : '—'
                            }
                          />

                          <MiniMacro
                            label="Prot."
                            value={
                              protein !== null
                                ? formatNumber(
                                    protein,
                                    'g'
                                  )
                                : '—'
                            }
                          />

                          <MiniMacro
                            label="Carb."
                            value={
                              carbs !== null
                                ? formatNumber(
                                    carbs,
                                    'g'
                                  )
                                : '—'
                            }
                          />

                          <MiniMacro
                            label="Gord."
                            value={
                              fats !== null
                                ? formatNumber(
                                    fats,
                                    'g'
                                  )
                                : '—'
                            }
                          />
                        </div>

                        {foodsText && (
                          <div className="mb-3 rounded-2xl border border-white/5 bg-white/[0.035] p-4">
                            <p className="text-[10px] font-black uppercase tracking-wide text-[#ff2a32]">
                              Alimentos
                            </p>

                            <p className="mt-2 text-sm font-semibold leading-relaxed text-white">
                              {foodsText}
                            </p>

                            {portions && (
                              <div className="mt-3 border-t border-white/5 pt-3">
                                <p className="text-[10px] font-black uppercase tracking-wide text-zinc-600">
                                  Porção
                                </p>

                                <p className="mt-1 text-xs font-semibold text-zinc-400">
                                  {portions}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {description && (
                          <div className="mb-3 rounded-2xl border border-white/5 bg-white/[0.035] p-3">
                            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-600">
                              Observação
                            </p>

                            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                              {description}
                            </p>
                          </div>
                        )}

                        {structuredItems.length > 0 && (
                          <div className="space-y-2">
                            {structuredItems.map(
                              (
                                item,
                                itemIndex
                              ) => {
                                const itemCalories =
                                  getFoodCalories(
                                    item
                                  );

                                const itemProtein =
                                  getFoodProtein(
                                    item
                                  );

                                const itemCarbs =
                                  getFoodCarbs(
                                    item
                                  );

                                const itemFats =
                                  getFoodFats(item);

                                return (
                                  <div
                                    key={`${key}-item-${itemIndex}`}
                                    className="rounded-2xl border border-white/5 bg-white/[0.035] p-3"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-black text-white">
                                          {getFoodName(
                                            item,
                                            itemIndex
                                          )}
                                        </p>

                                        {getFoodQuantity(
                                          item
                                        ) && (
                                          <p className="mt-1 text-xs font-semibold text-zinc-500">
                                            {getFoodQuantity(
                                              item
                                            )}
                                          </p>
                                        )}
                                      </div>

                                      {itemCalories !==
                                        null && (
                                        <span className="shrink-0 rounded-full bg-[#ff2a32]/10 px-2.5 py-1 text-[10px] font-black text-[#ff2a32]">
                                          {formatNumber(
                                            itemCalories,
                                            ' kcal'
                                          )}
                                        </span>
                                      )}
                                    </div>

                                    {(itemProtein !==
                                      null ||
                                      itemCarbs !==
                                        null ||
                                      itemFats !==
                                        null) && (
                                      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-black text-zinc-500">
                                        <span>
                                          Prot:{' '}
                                          {itemProtein !==
                                          null
                                            ? formatNumber(
                                                itemProtein,
                                                'g'
                                              )
                                            : '—'}
                                        </span>

                                        <span>
                                          Carb:{' '}
                                          {itemCarbs !==
                                          null
                                            ? formatNumber(
                                                itemCarbs,
                                                'g'
                                              )
                                            : '—'}
                                        </span>

                                        <span>
                                          Gord:{' '}
                                          {itemFats !==
                                          null
                                            ? formatNumber(
                                                itemFats,
                                                'g'
                                              )
                                            : '—'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            )}
                          </div>
                        )}

                        {!foodsText &&
                          structuredItems.length ===
                            0 && (
                            <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-4 text-center">
                              <p className="text-xs font-semibold text-zinc-500">
                                Nenhum alimento
                                detalhado nesta
                                refeição.
                              </p>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-6 text-center">
              <Utensils className="mx-auto h-10 w-10 text-zinc-700" />

              <h3 className="mt-4 text-lg font-black text-white">
                Sem refeições cadastradas
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                O plano existe, mas ainda não
                possui refeições detalhadas.
              </p>
            </div>
          )}
        </section>

        {activePlan.notes && (
          <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
              Observações
            </p>

            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              {activePlan.notes}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

function SmallInfo({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-3">
      <div className="flex items-center gap-2 text-[#ff2a32]">
        {icon}
      </div>

      <p className="mt-2 text-[10px] font-black uppercase tracking-wide text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-white">
        {value}
      </p>
    </div>
  );
}

function MacroCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent:
    | 'red'
    | 'emerald'
    | 'yellow'
    | 'blue';
}) {
  const accentClass =
    accent === 'red'
      ? 'bg-[#ff2a32]/10 text-[#ff2a32]'
      : accent === 'emerald'
        ? 'bg-emerald-400/10 text-emerald-300'
        : accent === 'yellow'
          ? 'bg-yellow-400/10 text-yellow-300'
          : 'bg-blue-400/10 text-blue-300';

  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
      <div
        className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${accentClass}`}
      >
        {icon}
      </div>

      <p className="text-2xl font-black tracking-[-0.04em] text-white">
        {value}
      </p>

      <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
        {label}
      </p>
    </div>
  );
}

function MiniMacro({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.035] p-2 text-center">
      <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-[11px] font-black text-white">
        {value}
      </p>
    </div>
  );
}

export default StudentNutritionPage;