import { useEffect, useMemo, useState } from 'react';
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

type NutritionPlan = {
  id: string;
  name?: string | null;
  objective?: string | null;
  status?: string | null;
  notes?: string | null;
  start_date?: string | null;
  dailycalories?: number | string | null;
  dailyCalories?: number | string | null;
  dailyprotein?: number | string | null;
  dailyProtein?: number | string | null;
  dailycarbs?: number | string | null;
  dailyCarbs?: number | string | null;
  dailyfats?: number | string | null;
  dailyFats?: number | string | null;
  meals?: any;
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
  const first = String(name || 'Aluno').trim().split(/\s+/)[0] || 'Aluno';

  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function toNumber(value: any) {
  if (value === null || value === undefined || value === '') return null;

  const parsed = Number(String(value).replace(',', '.'));

  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: any, suffix = '') {
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

function parseMeals(value: any): any[] {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.meals)) return parsed.meals;

      return [];
    } catch {
      return [];
    }
  }

  if (Array.isArray(value?.meals)) return value.meals;

  return [];
}

function getItemsFromMeal(meal: any): any[] {
  const candidates = [
    meal?.items,
    meal?.foods,
    meal?.alimentos,
    meal?.food_items,
    meal?.meal_items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function getMealTitle(meal: any, index: number) {
  return (
    meal?.name ||
    meal?.title ||
    meal?.meal_name ||
    meal?.label ||
    meal?.tipo ||
    `Refeição ${index + 1}`
  );
}

function getMealTime(meal: any) {
  return meal?.time || meal?.hour || meal?.horario || meal?.scheduled_time || '';
}

function getMealDescription(meal: any) {
  return meal?.description || meal?.instructions || meal?.notes || meal?.observations || '';
}

function getFoodName(item: any, index: number) {
  return item?.name || item?.food || item?.food_name || item?.alimento || `Item ${index + 1}`;
}

function getFoodQuantity(item: any) {
  return item?.quantity || item?.amount || item?.portion || item?.porcao || item?.qty || '';
}

function getFoodCalories(item: any) {
  return toNumber(item?.calories || item?.kcal || item?.energia);
}

function getFoodProtein(item: any) {
  return toNumber(item?.protein || item?.proteina || item?.proteins);
}

function getFoodCarbs(item: any) {
  return toNumber(item?.carbs || item?.carbohydrates || item?.carboidratos);
}

function getFoodFats(item: any) {
  return toNumber(item?.fats || item?.fat || item?.gorduras || item?.lipids);
}

function sumItems(items: any[], getter: (item: any) => number | null) {
  return items.reduce((total, item) => {
    const value = getter(item);
    return total + (value || 0);
  }, 0);
}

function getMealCalories(meal: any) {
  const direct = toNumber(meal?.calories || meal?.kcal || meal?.totalCalories);

  if (direct !== null) return direct;

  const items = getItemsFromMeal(meal);
  const total = sumItems(items, getFoodCalories);

  return total > 0 ? total : null;
}

function getMealProtein(meal: any) {
  const direct = toNumber(meal?.protein || meal?.proteins || meal?.proteina);

  if (direct !== null) return direct;

  const items = getItemsFromMeal(meal);
  const total = sumItems(items, getFoodProtein);

  return total > 0 ? total : null;
}

function getMealCarbs(meal: any) {
  const direct = toNumber(meal?.carbs || meal?.carbohydrates || meal?.carboidratos);

  if (direct !== null) return direct;

  const items = getItemsFromMeal(meal);
  const total = sumItems(items, getFoodCarbs);

  return total > 0 ? total : null;
}

function getMealFats(meal: any) {
  const direct = toNumber(meal?.fats || meal?.fat || meal?.gorduras);

  if (direct !== null) return direct;

  const items = getItemsFromMeal(meal);
  const total = sumItems(items, getFoodFats);

  return total > 0 ? total : null;
}

function getPlanCalories(plan: NutritionPlan | null) {
  return toNumber(plan?.dailycalories ?? plan?.dailyCalories);
}

function getPlanProtein(plan: NutritionPlan | null) {
  return toNumber(plan?.dailyprotein ?? plan?.dailyProtein);
}

function getPlanCarbs(plan: NutritionPlan | null) {
  return toNumber(plan?.dailycarbs ?? plan?.dailyCarbs);
}

function getPlanFats(plan: NutritionPlan | null) {
  return toNumber(plan?.dailyfats ?? plan?.dailyFats);
}

function getPlanStatusLabel(status?: string | null) {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'published') return 'Publicado';
  if (normalized === 'active') return 'Ativo';
  if (normalized === 'draft') return 'Rascunho';

  return 'Plano alimentar';
}

function getActivePlan(plans: NutritionPlan[]) {
  const published = plans.find((plan) => {
    const status = String(plan.status || '').toLowerCase();
    return status === 'published' || status === 'active';
  });

  return published || plans[0] || null;
}

export function StudentNutritionPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [state, setState] = useState<NutritionState>({
    student: null,
    plans: [],
  });

  const [openMealKey, setOpenMealKey] = useState('');

  useEffect(() => {
    loadNutrition();
  }, []);

  async function loadNutrition() {
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      const authUser = authData.user;

      if (!authUser?.id) {
        setError('Sessão do aluno não encontrada. Faça login novamente.');
        return;
      }

      const accountResult = await studentService.getStudentAccountByAuthUser(authUser.id);
      let studentData = accountResult?.student || null;

      if (!studentData) {
        studentData = await studentService.getStudentByAuthUser(authUser.id);
      }

      if (!studentData?.id) {
        setError('Perfil do aluno não encontrado.');
        return;
      }

      const { data: plansData, error: plansError } = await supabase
        .from('nutrition_plans')
        .select('*')
        .or(`student_id.eq.${studentData.id},studentid.eq.${studentData.id}`)
        .order('updated_at', { ascending: false });

      if (plansError) throw plansError;

      const plans = (plansData || []) as NutritionPlan[];

      setState({
        student: studentData,
        plans,
      });

      const activePlan = getActivePlan(plans);
      const meals = parseMeals(activePlan?.meals);

      if (meals.length > 0) {
        setOpenMealKey(`meal-0`);
      }
    } catch (err: any) {
      console.error('[StudentNutritionPage] loadNutrition error:', err);
      setError(err?.message || 'Erro ao carregar nutrição.');
    } finally {
      setLoading(false);
    }
  }

  const activePlan = useMemo(() => getActivePlan(state.plans), [state.plans]);

  const meals = useMemo(() => parseMeals(activePlan?.meals), [activePlan]);

  const totalMeals = meals.length;

  const planCalories = getPlanCalories(activePlan);
  const planProtein = getPlanProtein(activePlan);
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
            <p className="text-sm font-black text-white">Carregando nutrição...</p>
            <p className="mt-1 text-xs text-zinc-500">Buscando seu plano alimentar.</p>
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

          <h1 className="mt-5 text-xl font-black text-white">Não foi possível carregar</h1>

          <p className="mt-2 text-sm leading-relaxed text-red-200/80">{error}</p>

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
              Sem plano ainda
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              Quando seu personal criar um plano alimentar, ele aparecerá aqui.
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
                  {getFirstName(state.student)}, siga seu plano com consistência.
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
                    {activePlan.name || 'Plano alimentar'}
                  </h2>

                  <p className="mt-1 text-xs font-medium text-zinc-500">
                    {getPlanStatusLabel(activePlan.status)}
                  </p>
                </div>

                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300">
                  Ativo
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <SmallInfo
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Início"
                  value={formatDateSafe(activePlan.start_date || activePlan.created_at)}
                />

                <SmallInfo
                  icon={<Utensils className="h-4 w-4" />}
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
            value={planCalories !== null ? formatNumber(planCalories, ' kcal') : '—'}
            accent="red"
          />

          <MacroCard
            icon={<Beef className="h-5 w-5" />}
            label="Proteína"
            value={planProtein !== null ? formatNumber(planProtein, 'g') : '—'}
            accent="emerald"
          />

          <MacroCard
            icon={<Wheat className="h-5 w-5" />}
            label="Carboidratos"
            value={planCarbs !== null ? formatNumber(planCarbs, 'g') : '—'}
            accent="yellow"
          />

          <MacroCard
            icon={<Salad className="h-5 w-5" />}
            label="Gorduras"
            value={planFats !== null ? formatNumber(planFats, 'g') : '—'}
            accent="blue"
          />
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2a32]">
                Refeições
              </p>

              <h2 className="mt-1 text-xl font-black text-white">Seu dia alimentar</h2>
            </div>

            <Utensils className="h-5 w-5 text-[#ff2a32]" />
          </div>

          {meals.length > 0 ? (
            <div className="space-y-3">
              {meals.map((meal, index) => {
                const key = `meal-${index}`;
                const isOpen = openMealKey ? openMealKey === key : index === 0;
                const items = getItemsFromMeal(meal);
                const calories = getMealCalories(meal);
                const protein = getMealProtein(meal);
                const carbs = getMealCarbs(meal);
                const fats = getMealFats(meal);
                const description = getMealDescription(meal);

                return (
                  <div
                    key={key}
                    className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenMealKey(isOpen ? '' : key)}
                      className="flex w-full items-center justify-between gap-3 p-4 text-left"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff2a32]/10 text-[#ff2a32]">
                          <Utensils className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black text-white">
                            {getMealTitle(meal, index)}
                          </h3>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-zinc-500">
                            {getMealTime(meal) && (
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="h-3 w-3" />
                                {getMealTime(meal)}
                              </span>
                            )}

                            {calories !== null && <span>{formatNumber(calories, ' kcal')}</span>}
                          </div>
                        </div>
                      </div>

                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="border-t border-white/10 px-4 pb-4 pt-3">
                        <div className="mb-3 grid grid-cols-4 gap-2">
                          <MiniMacro label="Kcal" value={calories !== null ? formatNumber(calories) : '—'} />
                          <MiniMacro label="Prot." value={protein !== null ? formatNumber(protein, 'g') : '—'} />
                          <MiniMacro label="Carb." value={carbs !== null ? formatNumber(carbs, 'g') : '—'} />
                          <MiniMacro label="Gord." value={fats !== null ? formatNumber(fats, 'g') : '—'} />
                        </div>

                        {description && (
                          <div className="mb-3 rounded-2xl border border-white/5 bg-white/[0.035] p-3">
                            <p className="text-xs leading-relaxed text-zinc-400">
                              {description}
                            </p>
                          </div>
                        )}

                        {items.length > 0 ? (
                          <div className="space-y-2">
                            {items.map((item, itemIndex) => {
                              const itemCalories = getFoodCalories(item);
                              const itemProtein = getFoodProtein(item);
                              const itemCarbs = getFoodCarbs(item);
                              const itemFats = getFoodFats(item);

                              return (
                                <div
                                  key={`${key}-item-${itemIndex}`}
                                  className="rounded-2xl border border-white/5 bg-white/[0.035] p-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-black text-white">
                                        {getFoodName(item, itemIndex)}
                                      </p>

                                      {getFoodQuantity(item) && (
                                        <p className="mt-1 text-xs font-semibold text-zinc-500">
                                          {getFoodQuantity(item)}
                                        </p>
                                      )}
                                    </div>

                                    {itemCalories !== null && (
                                      <span className="shrink-0 rounded-full bg-[#ff2a32]/10 px-2.5 py-1 text-[10px] font-black text-[#ff2a32]">
                                        {formatNumber(itemCalories, ' kcal')}
                                      </span>
                                    )}
                                  </div>

                                  {(itemProtein !== null || itemCarbs !== null || itemFats !== null) && (
                                    <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-black text-zinc-500">
                                      <span>Prot: {itemProtein !== null ? formatNumber(itemProtein, 'g') : '—'}</span>
                                      <span>Carb: {itemCarbs !== null ? formatNumber(itemCarbs, 'g') : '—'}</span>
                                      <span>Gord: {itemFats !== null ? formatNumber(itemFats, 'g') : '—'}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-4 text-center">
                            <p className="text-xs font-semibold text-zinc-500">
                              Nenhum alimento detalhado nessa refeição.
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
              <h3 className="mt-4 text-lg font-black text-white">Sem refeições cadastradas</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                O plano existe, mas ainda não possui refeições detalhadas.
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
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-3">
      <div className="flex items-center gap-2 text-[#ff2a32]">{icon}</div>

      <p className="mt-2 text-[10px] font-black uppercase tracking-wide text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function MacroCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: 'red' | 'emerald' | 'yellow' | 'blue';
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
      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${accentClass}`}>
        {icon}
      </div>

      <p className="text-2xl font-black tracking-[-0.04em] text-white">{value}</p>

      <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-600">
        {label}
      </p>
    </div>
  );
}

function MiniMacro({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.035] p-2 text-center">
      <p className="text-[9px] font-black uppercase tracking-wide text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-[11px] font-black text-white">{value}</p>
    </div>
  );
}

export default StudentNutritionPage;