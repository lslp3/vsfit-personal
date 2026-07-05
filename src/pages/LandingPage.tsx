import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronRight,
  ExternalLink,
  Globe2,
  Infinity as InfinityIcon,
  AtSign,
  MessageCircle,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from 'lucide-react';

import { BrandMark } from '../components/brand/BrandMark';
import { LandingHeader } from '../components/landing/LandingHeader';
import { LandingHero } from '../components/landing/LandingHero';
import { PersonalFeatures } from '../components/landing/PersonalFeatures';
import { StudentFeatures } from '../components/landing/StudentFeatures';
import { DynamicInstallGuide } from '../components/landing/DynamicInstallGuide';
import {
  LandingFAQ,
  LandingSecurity,
} from '../components/landing/LandingFAQ';

type Plan = {
  name: string;
  price: string;
  description: string;
  studentLimit: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
};

const SCREENSHOTS = [
  {
    src: '/landing/personal-dashboard.png',
    title: 'Dashboard do personal',
    description:
      'Visão geral de alunos, treinos, pagamentos, notificações e atividades.',
    tag: 'Gestão',
  },
  {
    src: '/landing/personal-students.png',
    title: 'Gestão de alunos',
    description:
      'Organize alunos, acompanhe status, acesso, treinos e informações importantes.',
    tag: 'Alunos',
  },
  {
    src: '/landing/personal-workout-builder.png',
    title: 'Montador de treinos',
    description:
      'Crie treinos por dia, configure séries, cargas, descanso, bi-set e drop-set.',
    tag: 'Treinos',
  },
  {
    src: '/landing/student-home.png',
    title: 'Aplicativo do aluno',
    description:
      'Treino do dia, sequência semanal, atalhos e acompanhamento em um só lugar.',
    tag: 'Aluno',
  },
  {
    src: '/landing/student-progress.png',
    title: 'Progresso e evolução',
    description:
      'Medidas, peso, fotos e histórico para acompanhar os resultados de verdade.',
    tag: 'Evolução',
  },
];

const PLANS: Plan[] = [
  {
    name: 'Free',
    price: 'R$ 0',
    description:
      'Para começar a organizar o atendimento com um aluno.',
    studentLimit: '1 aluno',
    features: [
      '1 aluno ativo',
      'Biblioteca de exercícios',
      'Montador de treinos',
      'Acesso à plataforma web',
    ],
  },
  {
    name: 'Pro',
    price: 'R$ 49,90',
    description:
      'Para o personal que está começando a ampliar sua carteira.',
    studentLimit: 'Até 3 alunos',
    features: [
      'Até 3 alunos ativos',
      'Biblioteca completa',
      'Montador de treinos',
      'Chat com alunos',
      'Financeiro básico',
      'Captação de alunos com até 3 links',
    ],
    highlighted: true,
    badge: 'Mais escolhido',
  },
  {
    name: 'Premium',
    price: 'R$ 99,90',
    description:
      'Para quem precisa de liberdade, escala e recursos completos.',
    studentLimit: 'Alunos ilimitados',
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
    badge: 'Completo',
  },
];

const WHATSAPP_NUMBER = '5534988398567';

const WHATSAPP_MESSAGE =
  'Olá! Gostaria de saber mais sobre o VSFit Personal.';

const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE
)}`;

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto mb-12 max-w-3xl text-center md:mb-16">
      <span className="mb-3 block text-[11px] font-black uppercase tracking-[0.22em] text-vs-primary">
        {eyebrow}
      </span>

      <h2 className="text-3xl font-black tracking-[-0.04em] text-white md:text-5xl">
        {title}
      </h2>

      <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-vs-muted md:text-base">
        {description}
      </p>
    </div>
  );
}

function ScreenshotCard({
  screenshot,
  index,
}: {
  screenshot: (typeof SCREENSHOTS)[number];
  index: number;
}) {
  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 24,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.2,
      }}
      transition={{
        duration: 0.5,
        delay: index * 0.06,
      }}
      className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035]"
    >
      <div className="relative overflow-hidden border-b border-white/10 bg-[#080808]">
        <div className="absolute left-4 top-4 z-10 rounded-full border border-white/10 bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md">
          {screenshot.tag}
        </div>

        <img
          src={screenshot.src}
          alt={screenshot.title}
          loading="lazy"
          className="aspect-[9/16] w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      <div className="p-5">
        <h3 className="text-base font-black text-white">
          {screenshot.title}
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          {screenshot.description}
        </p>
      </div>
    </motion.article>
  );
}

function PlanCard({
  plan,
}: {
  plan: Plan;
}) {
  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 24,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.2,
      }}
      className={
        plan.highlighted
          ? 'relative flex h-full flex-col rounded-[30px] border border-vs-primary/50 bg-gradient-to-b from-vs-primary/15 via-white/[0.045] to-white/[0.025] p-6 shadow-[0_30px_100px_rgba(255,42,50,0.15)]'
          : 'relative flex h-full flex-col rounded-[30px] border border-white/10 bg-white/[0.035] p-6'
      }
    >
      {plan.badge && (
        <span
          className={
            plan.highlighted
              ? 'absolute right-5 top-5 rounded-full bg-vs-primary px-3 py-1 text-[9px] font-black uppercase tracking-wider text-white'
              : 'absolute right-5 top-5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-zinc-300'
          }
        >
          {plan.badge}
        </span>
      )}

      <div>
        <p className="text-sm font-black uppercase tracking-[0.16em] text-zinc-400">
          {plan.name}
        </p>

        <div className="mt-5 flex items-end gap-2">
          <span className="text-4xl font-black tracking-[-0.05em] text-white">
            {plan.price}
          </span>

          {plan.price !== 'R$ 0' && (
            <span className="pb-1 text-xs text-zinc-500">
              /mês
            </span>
          )}
        </div>

        <p className="mt-4 min-h-[60px] text-sm leading-relaxed text-zinc-400">
          {plan.description}
        </p>
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
        {plan.studentLimit ===
        'Alunos ilimitados' ? (
          <InfinityIcon className="h-5 w-5 text-vs-primary" />
        ) : (
          <Users className="h-5 w-5 text-vs-primary" />
        )}

        <span className="text-sm font-black text-white">
          {plan.studentLimit}
        </span>
      </div>

      <div className="mt-6 flex-1 space-y-3">
        {plan.features.map(
          (feature) => (
            <div
              key={feature}
              className="flex items-start gap-3"
            >
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-vs-primary/15">
                <Check className="h-3 w-3 text-vs-primary" />
              </div>

              <span className="text-sm leading-relaxed text-zinc-300">
                {feature}
              </span>
            </div>
          )
        )}
      </div>

      <a
        href="/auth/register"
        className={
          plan.highlighted
            ? 'mt-7 flex h-13 min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-vs-primary px-5 text-sm font-black text-white transition-all hover:bg-red-600 active:scale-[0.98]'
            : 'mt-7 flex h-13 min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-sm font-black text-white transition-all hover:bg-white/[0.1] active:scale-[0.98]'
        }
      >
        Começar agora
        <ArrowRight className="h-4 w-4" />
      </a>
    </motion.article>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] text-white selection:bg-vs-primary/30">
      <LandingHeader />

      <main>
        <LandingHero />

        <section className="border-y border-white/5 bg-[#080808] px-4 py-6">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-4">
              <ShieldCheck className="h-5 w-5 text-vs-primary" />

              <span className="text-xs font-bold text-zinc-300">
                Dados protegidos
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-4">
              <MonitorSmartphone className="h-5 w-5 text-vs-primary" />

              <span className="text-xs font-bold text-zinc-300">
                Web, Android e iPhone
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-4">
              <Sparkles className="h-5 w-5 text-vs-primary" />

              <span className="text-xs font-bold text-zinc-300">
                Feito para personal trainers
              </span>
            </div>
          </div>
        </section>

        <PersonalFeatures />

        <section
          id="features"
          className="border-y border-white/5 bg-[#090909] px-4 py-24"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Conheça a plataforma"
              title="Telas reais. Recursos que fazem parte da rotina."
              description="Veja como o VSFit organiza o trabalho do personal e entrega uma experiência simples para o aluno."
            />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {SCREENSHOTS.map(
                (screenshot, index) => (
                  <ScreenshotCard
                    key={
                      screenshot.src
                    }
                    screenshot={
                      screenshot
                    }
                    index={index}
                  />
                )
              )}
            </div>
          </div>
        </section>

        <StudentFeatures />

        <section
          id="plans"
          className="relative overflow-hidden px-4 py-24"
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-vs-primary/[0.06] blur-[140px]" />

          <div className="relative mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Planos"
              title="Escolha o plano que acompanha sua fase profissional."
              description="Comece gratuitamente e mude de plano quando precisar de mais alunos e recursos."
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <PlanCard
                  key={plan.name}
                  plan={plan}
                />
              ))}
            </div>

            <p className="mt-6 text-center text-xs text-zinc-600">
              Assinaturas mensais. Sem plano anual e sem período de teste.
            </p>
          </div>
        </section>

        <section
          id="install"
          className="border-y border-white/5 bg-[#0d0d0f] px-4 py-24"
        >
          <div className="mx-auto max-w-5xl">
            <SectionHeading
              eyebrow="Use em qualquer dispositivo"
              title="Android, iPhone ou navegador."
              description="Escolha a forma de acesso mais conveniente para sua rotina."
            />

            <DynamicInstallGuide />

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-vs-primary/15 text-vs-primary">
                  <Smartphone className="h-5 w-5" />
                </div>

                <h3 className="mt-4 font-black">
                  Android
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  O APK oficial será disponibilizado nesta página.
                </p>

                <span className="mt-4 inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-[10px] font-black uppercase text-yellow-300">
                  Em breve
                </span>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-vs-primary/15 text-vs-primary">
                  <ExternalLink className="h-5 w-5" />
                </div>

                <h3 className="mt-4 font-black">
                  iPhone
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Abra pelo Safari e adicione o VSFit à tela de início.
                </p>

                <a
                  href="#install"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-vs-primary"
                >
                  Ver instruções
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-vs-primary/15 text-vs-primary">
                  <Globe2 className="h-5 w-5" />
                </div>

                <h3 className="mt-4 font-black">
                  Acesso web
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Entre pelo navegador no computador, tablet ou celular.
                </p>

                <a
                  href="/auth/login"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-vs-primary"
                >
                  Entrar na plataforma
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <LandingFAQ />

        <LandingSecurity />

        <section className="relative overflow-hidden px-4 py-24">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-vs-primary/[0.05] to-transparent" />

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            className="relative mx-auto max-w-5xl overflow-hidden rounded-[36px] border border-vs-primary/20 bg-gradient-to-br from-vs-primary/15 via-white/[0.04] to-white/[0.02] px-6 py-12 text-center md:px-12 md:py-16"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-vs-primary text-white shadow-[0_20px_60px_rgba(255,42,50,0.3)]">
              <Sparkles className="h-8 w-8" />
            </div>

            <h2 className="mx-auto mt-7 max-w-3xl text-3xl font-black tracking-[-0.04em] text-white md:text-5xl">
              Profissionalize seu atendimento sem complicar sua rotina.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
              Crie sua conta gratuita, cadastre seu primeiro aluno e comece a organizar treinos, evolução e atendimento em um único lugar.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="/auth/register"
                className="flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-vs-primary px-8 text-sm font-black text-white transition-all hover:bg-red-600 active:scale-[0.98]"
              >
                Criar conta gratuita
                <ArrowRight className="h-4 w-4" />
              </a>

              <a
                href="/auth/login"
                className="flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-8 text-sm font-black text-white transition-all hover:bg-white/[0.1] active:scale-[0.98]"
              >
                Já tenho uma conta
              </a>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-[#080808] px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <BrandMark size="sm" />

                <div>
                  <p className="font-black text-white">
                    VSFit Personal
                  </p>

                  <p className="text-xs text-zinc-500">
                    Uberlândia, Minas Gerais
                  </p>
                </div>
              </div>

              <p className="mt-5 max-w-md text-sm leading-relaxed text-zinc-500">
                Plataforma para personal trainers organizarem alunos, treinos, progresso, comunicação e financeiro.
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-zinc-500">
                Acessos
              </p>

              <div className="mt-4 flex flex-col gap-3 text-sm">
                <a
                  href="/auth/register"
                  className="text-zinc-300 transition-colors hover:text-white"
                >
                  Criar conta
                </a>

                <a
                  href="/auth/login"
                  className="text-zinc-300 transition-colors hover:text-white"
                >
                  Login do personal
                </a>

                <a
                  href="/auth/student-login"
                  className="text-zinc-300 transition-colors hover:text-white"
                >
                  Login do aluno
                </a>

                <a
                  href="#plans"
                  className="text-zinc-300 transition-colors hover:text-white"
                >
                  Planos
                </a>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-zinc-500">
                Contato
              </p>

              <div className="mt-4 flex flex-col gap-3 text-sm">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-zinc-300 transition-colors hover:text-white"
                >
                  <MessageCircle className="h-4 w-4 text-vs-primary" />
                  (34) 9 8839-8567
                </a>

                <a
                  href="https://instagram.com/vsfit.personal"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-zinc-300 transition-colors hover:text-white"
                >
                  <AtSign className="h-4 w-4 text-vs-primary" />
                  @vsfit.personal
                </a>

                <a
                  href="mailto:tatys2759@gmail.com"
                  className="break-all text-zinc-300 transition-colors hover:text-white"
                >
                  tatys2759@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-white/5 pt-6 text-center text-xs text-zinc-600 md:flex-row md:items-center md:justify-between md:text-left">
            <p>
              © {new Date().getFullYear()} VSFit Personal. Todos os direitos reservados.
            </p>

            <p>
              Responsável: Verônica Silva
            </p>
          </div>
        </div>
      </footer>

      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Falar com o VSFit pelo WhatsApp"
        className="fixed bottom-5 right-4 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_18px_50px_rgba(37,211,102,0.35)] transition-transform hover:scale-105 active:scale-95 md:bottom-7 md:right-7"
      >
        <MessageCircle className="h-7 w-7" />
      </a>
    </div>
  );
}