import { supabase } from '../lib/supabase';
import { PLAN_LIMITS, normalizePlanSlug, type PlanSlug } from '../lib/planLimits';

export interface Subscription {
  id?: string;
  trainer_id: string;
  plan_slug: string;
  status: string;
  payment_provider?: string | null;
  mercadopago_preapproval_id?: string | null;
  mercadopago_plan_id?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SubscriptionPlanWithLimits {
  id?: string;
  slug: PlanSlug;
  name: string;
  description?: string | null;
  price_monthly: number;
  student_limit: number;
  features: string[] | string;
  is_active?: boolean;
}

const FALLBACK_PLANS: SubscriptionPlanWithLimits[] = [
  {
    slug: 'free',
    name: 'Free',
    description: 'Para começar com 1 aluno',
    price_monthly: 0,
    student_limit: 1,
    features: ['1 aluno', 'Biblioteca de exercícios', 'Montador de treinos'],
    is_active: true,
  },
  {
    slug: 'pro',
    name: 'Pro',
    description: 'Para personal que está começando a crescer',
    price_monthly: 49.9,
    student_limit: 3,
    features: [
      'Até 3 alunos',
      'Biblioteca completa',
      'Montador de treinos',
      'Chat com alunos',
      'Financeiro básico',
      'Captação de alunos (3 links)',
    ],
    is_active: true,
  },
  {
    slug: 'premium',
    name: 'Premium',
    description: 'Para personal que quer escala total',
    price_monthly: 99.9,
    student_limit: 999999,
    features: [
      'Alunos ilimitados',
      'Biblioteca completa',
      'Montador de treinos',
      'Chat completo',
      'Financeiro completo',
      'Captação ilimitada',
      'Relatórios avançados',
      'Recursos premium',
    ],
    is_active: true,
  },
];

function isActiveStatus(status?: string | null) {
  const normalized = String(status || '').toLowerCase();
  return normalized === 'active' || normalized === 'trialing' || normalized === 'authorized';
}

function normalizeDbPlanSlug(value?: string | null): PlanSlug {
  return normalizePlanSlug(String(value || 'free'));
}

export async function getCurrentSubscription(trainerId: string): Promise<Subscription | null> {
  try {
    if (!trainerId) return null;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('trainer_id', trainerId);

    if (error) {
      console.error('[SubscriptionService] getCurrentSubscription error:', error);
      return null;
    }

    console.log('[SubscriptionService] Assinaturas encontradas no banco:', {
      trainerId,
      data,
    });

    if (!data || data.length === 0) {
      return null;
    }

    const activeSubscriptions = data.filter((item: any) => isActiveStatus(item.status));

    if (activeSubscriptions.length === 0) {
      return null;
    }

    const premium = activeSubscriptions.find(
      (item: any) => normalizeDbPlanSlug(item.plan_slug) === 'premium'
    );

    if (premium) return premium as Subscription;

    const pro = activeSubscriptions.find(
      (item: any) => normalizeDbPlanSlug(item.plan_slug) === 'pro'
    );

    if (pro) return pro as Subscription;

    return activeSubscriptions[0] as Subscription;
  } catch (error) {
    console.error('[SubscriptionService] getCurrentSubscription exception:', error);
    return null;
  }
}

export async function getCurrentPlanSlug(trainerId: string): Promise<PlanSlug> {
  try {
    const subscription = await getCurrentSubscription(trainerId);

    if (!subscription) {
      console.warn('[SubscriptionService] Nenhuma assinatura ativa encontrada:', trainerId);
      return 'free';
    }

    const planSlug = normalizeDbPlanSlug(subscription.plan_slug);

    console.log('[SubscriptionService] Plano atual encontrado:', {
      trainerId,
      planSlug,
      status: subscription.status,
      subscription,
    });

    return planSlug;
  } catch (error) {
    console.error('[SubscriptionService] getCurrentPlanSlug exception:', error);
    return 'free';
  }
}

export async function getAllSubscriptionPlans(): Promise<SubscriptionPlanWithLimits[]> {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*');

    if (error) {
      console.warn('[SubscriptionService] getAllSubscriptionPlans usando fallback:', error);
      return FALLBACK_PLANS;
    }

    if (!data || data.length === 0) {
      return FALLBACK_PLANS;
    }

    const plans = data.map((plan: any) => {
      const slug = normalizeDbPlanSlug(plan.slug);
      const limits = PLAN_LIMITS[slug];

      return {
        id: plan.id,
        slug,
        name: plan.name || (slug === 'premium' ? 'Premium' : slug === 'pro' ? 'Pro' : 'Free'),
        description: plan.description || null,
        price_monthly:
          Number(plan.price_monthly ?? plan.price ?? (slug === 'premium' ? 99.9 : slug === 'pro' ? 49.9 : 0)),
        student_limit:
          Number(
            plan.student_limit ??
              plan.max_students ??
              (limits.students === Infinity ? 999999 : limits.students)
          ),
        features: plan.features || limits.features || [],
        is_active: plan.is_active ?? true,
      } as SubscriptionPlanWithLimits;
    });

    return plans.sort((a, b) => {
      const order: Record<string, number> = {
        free: 1,
        pro: 2,
        premium: 3,
      };

      return order[a.slug] - order[b.slug];
    });
  } catch (error) {
    console.error('[SubscriptionService] getAllSubscriptionPlans exception:', error);
    return FALLBACK_PLANS;
  }
}

export async function createCheckoutSession(planSlug: 'pro' | 'premium') {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      throw new Error('Usuário não autenticado. Faça login novamente.');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/create-mercadopago-subscription`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planSlug,
      }),
    });

    const text = await response.text();

    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      console.error('[SubscriptionService] Mercado Pago checkout raw error:', {
        status: response.status,
        text,
        data,
      });

      throw new Error(data?.error || text || `Erro HTTP ${response.status} ao criar checkout.`);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Erro ao criar assinatura no Mercado Pago.');
    }

    if (!data?.url) {
      throw new Error('Mercado Pago não retornou o link de checkout.');
    }

    return data.url as string;
  } catch (error) {
    console.error('[SubscriptionService] createCheckoutSession exception:', error);
    throw error;
  }
}

export async function refreshSubscription(trainerId: string): Promise<Subscription | null> {
  return await getCurrentSubscription(trainerId);
}

export async function canCreateStudent(
  trainerId: string,
  currentStudentCount: number
): Promise<boolean> {
  try {
    const planSlug = await getCurrentPlanSlug(trainerId);
    const limits = PLAN_LIMITS[planSlug];

    if (limits.students === Infinity) return true;

    return currentStudentCount < limits.students;
  } catch (error) {
    console.error('[SubscriptionService] canCreateStudent exception:', error);
    return false;
  }
}