import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Crown,
  Loader2,
  Lock,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import * as subscriptionService from '../../services/subscriptionService';
import type { SubscriptionPlanWithLimits } from '../../services/subscriptionService';
import {
  getPlanLimits,
  normalizePlanSlug,
  type PlanSlug,
} from '../../lib/planLimits';

function formatMoney(value?: number) {
  const price = Number(value || 0);

  if (price <= 0) return 'Grátis';

  return price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function normalizeFeatures(features: SubscriptionPlanWithLimits['features']): string[] {
  if (Array.isArray(features)) return features;

  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function getPlanIcon(slug: string) {
  if (slug === 'premium') return Crown;
  if (slug === 'pro') return Zap;
  return Star;
}

function getPlanSubtitle(slug: string, limit?: number) {
  if (slug === 'premium') return 'Alunos ilimitados';
  if (slug === 'pro') return 'Até 3 alunos';
  return `Até ${limit || 1} aluno`;
}

function getPlanTone(slug: string, isCurrent: boolean) {
  if (slug === 'premium') {
    return {
      icon: 'bg-[#ff2a32]/12 text-[#ff2a32] border-[#ff2a32]/20',
      card: isCurrent
        ? 'border-[#ff2a32]/35 bg-[#120809]'
        : 'border-white/10 bg-white/[0.045]',
      check: 'text-[#ff2a32]',
      button: 'bg-[#ff2a32] text-white',
    };
  }

  if (slug === 'pro') {
    return {
      icon: 'bg-blue-500/12 text-blue-400 border-blue-400/20',
      card: isCurrent
        ? 'border-blue-400/25 bg-blue-500/[0.06]'
        : 'border-white/10 bg-white/[0.045]',
      check: 'text-blue-400',
      button: 'bg-white text-black',
    };
  }

  return {
    icon: 'bg-white/[0.08] text-zinc-300 border-white/10',
    card: isCurrent
      ? 'border-emerald-400/25 bg-emerald-500/[0.06]'
      : 'border-white/10 bg-white/[0.045]',
    check: 'text-zinc-300',
    button: 'bg-white/[0.06] text-white border border-white/10',
  };
}

export function SubscriptionPage() {
  const navigate = useNavigate();
  const { trainerProfile } = useAuthStore();

  const [plans, setPlans] = useState<SubscriptionPlanWithLimits[]>([]);
  const [currentPlanSlug, setCurrentPlanSlug] = useState<PlanSlug>('free');
  const [studentCount, setStudentCount] = useState(0);
  const [signupLinkCount, setSignupLinkCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const currentLimits = useMemo(() => getPlanLimits(currentPlanSlug), [currentPlanSlug]);

  useEffect(() => {
    loadData();
  }, [trainerProfile?.id]);

  async function loadData() {
    if (!trainerProfile?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const [plansData, planSlug] = await Promise.all([
        subscriptionService.getAllSubscriptionPlans(),
        subscriptionService.getCurrentPlanSlug(trainerProfile.id),
      ]);

      setPlans(plansData);
      setCurrentPlanSlug(normalizePlanSlug(planSlug));

      const [{ count: studentsTotal }, { count: linksTotal }] = await Promise.all([
        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('trainer_id', trainerProfile.id),
        supabase
          .from('signup_links')
          .select('id', { count: 'exact', head: true })
          .eq('trainer_id', trainerProfile.id),
      ]);

      setStudentCount(studentsTotal || 0);
      setSignupLinkCount(linksTotal || 0);
    } catch (error) {
      console.error('[SubscriptionPage] load error:', error);
      setErrorMessage('Não foi possível carregar os planos. Usando dados padrão.');
      const fallback = await subscriptionService.getAllSubscriptionPlans();
      setPlans(fallback);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout(planSlug: string) {
    const normalized = normalizePlanSlug(planSlug);

    if (normalized === 'free' || normalized === currentPlanSlug) return;

    try {
      setCheckoutPlan(normalized);
      setErrorMessage('');

      const checkoutUrl = await subscriptionService.createCheckoutSession(
        normalized as 'pro' | 'premium'
      );

      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('[SubscriptionPage] checkout error:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao abrir checkout. Verifique a Edge Function do Stripe.';

      setErrorMessage(message);
    } finally {
      setCheckoutPlan(null);
    }
  }

  function renderCurrentUsage() {
    const studentLimit = currentLimits.students;
    const linkLimit = currentLimits.signupLinks;

    return (
      <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
        <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">
          Resumo do plano atual
        </h3>

        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[14px] font-medium text-zinc-400">Alunos</span>
            <span className="text-[14px] font-black text-white">
              {studentLimit === Infinity ? 'Ilimitados' : `${studentCount}/${studentLimit}`}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-[14px] font-medium text-zinc-400">Links de captação</span>
            <span className="text-[14px] font-black text-white">
              {linkLimit === 0
                ? 'Bloqueado'
                : linkLimit === Infinity
                ? 'Ilimitados'
                : `${signupLinkCount}/${linkLimit}`}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-[14px] font-medium text-zinc-400">Financeiro</span>
            <span
              className={`text-[14px] font-black ${
                currentLimits.financial ? 'text-emerald-400' : 'text-zinc-500'
              }`}
            >
              {currentLimits.financial ? 'Liberado' : 'Bloqueado'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-[14px] font-medium text-zinc-400">
              Relatórios avançados
            </span>
            <span
              className={`text-[14px] font-black ${
                currentLimits.reports ? 'text-emerald-400' : 'text-zinc-500'
              }`}
            >
              {currentLimits.reports ? 'Liberado' : 'Bloqueado'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <div className="flex h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#ff2a32]" />
            <p className="text-[13px] font-bold text-zinc-500">Carregando planos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] pb-28 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#050505]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[64px] max-w-lg items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-[20px] font-black tracking-[-0.04em] text-white">
              Assinatura
            </h1>
            <p className="text-[11px] font-semibold text-zinc-500">
              Planos do personal
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-4 pt-6">
        {errorMessage && (
          <div className="rounded-[20px] border border-red-500/20 bg-red-500/10 p-4 text-[13px] font-bold leading-relaxed text-red-300">
            {errorMessage}
          </div>
        )}

        <section className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#ff2a32]/20 bg-[#ff2a32]/10 text-[#ff2a32]">
              <Crown className="h-8 w-8" />
            </div>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">
                Plano atual
              </p>
              <h2 className="mt-1 text-[24px] font-black capitalize tracking-[-0.04em] text-white">
                {currentPlanSlug}
              </h2>

              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-300">
                <Check className="h-3.5 w-3.5" />
                Ativo
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          {plans.map((plan) => {
            const slug = normalizePlanSlug(plan.slug);
            const isCurrent = slug === currentPlanSlug;
            const Icon = getPlanIcon(slug);
            const tone = getPlanTone(slug, isCurrent);
            const features = normalizeFeatures(plan.features);
            const price = Number(plan.price_monthly || 0);
            const isPaid = slug === 'pro' || slug === 'premium';
            const isProcessing = checkoutPlan === slug;

            return (
              <article
                key={slug}
                className={`relative overflow-visible rounded-[30px] border p-6 shadow-[0_18px_50px_rgba(0,0,0,0.45)] ${tone.card}`}
              >
                {slug === 'premium' && (
                  <div className="mb-4 inline-flex rounded-full bg-[#ff2a32] px-4 py-1.5 text-[10px] font-black uppercase tracking-wide text-white">
                    Mais escolhido
                  </div>
                )}

                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border ${tone.icon}`}
                    >
                      <Icon className="h-7 w-7" />
                    </div>

                    <div>
                      <h3 className="text-[22px] font-black tracking-[-0.04em] text-white">
                        {plan.name}
                      </h3>
                      <p className="mt-0.5 text-[12px] font-semibold text-zinc-500">
                        {getPlanSubtitle(slug, Number(plan.student_limit || 1))}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[22px] font-black tracking-[-0.04em] text-white">
                      {formatMoney(price)}
                    </p>
                    {price > 0 && (
                      <p className="text-[11px] font-medium text-zinc-500">/mês</p>
                    )}
                  </div>
                </div>

                <ul className="mt-6 space-y-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className={`h-4 w-4 shrink-0 ${tone.check}`} />
                      <span className="text-[14px] font-semibold text-white">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={isCurrent || !isPaid || isProcessing}
                  onClick={() => handleCheckout(slug)}
                  className={`mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-[20px] text-[14px] font-black uppercase tracking-wide transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-80 ${
                    isCurrent
                      ? 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                      : isPaid
                      ? tone.button
                      : 'border border-white/10 bg-white/[0.06] text-white'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Redirecionando...
                    </>
                  ) : isCurrent ? (
                    <>
                      <Check className="h-4 w-4" />
                      Plano atual
                    </>
                  ) : isPaid ? (
                    <>
                      Assinar agora
                      <ChevronRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Plano gratuito
                      <Lock className="h-4 w-4" />
                    </>
                  )}
                </button>
              </article>
            );
          })}
        </section>

        {renderCurrentUsage()}

        <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.06] text-zinc-300">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-[15px] font-black text-white">Upgrade seguro</h3>
              <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-500">
                O checkout abre pelo Mercado Pago. Depois do pagamento, o plano é liberado automático.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default SubscriptionPage;