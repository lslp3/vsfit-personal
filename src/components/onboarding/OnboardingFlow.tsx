import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CalendarIcon,
  Dumbbell,
  LineChart,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';

import { BrandMark } from '../brand/BrandMark';
import { cn } from '../../lib/utils';

/**
 * SPRINT 17 · ETAPA 4 — Onboarding Inicial (máx. 3 telas).
 *
 * Fluxo de primeira abertura. Ao finalizar, registra a escolha de perfil
 * (Personal | Aluno) e encerra o onboarding — SEM disparar fluxos de
 * cadastro (implementados nas ETAPAS 5–6). Visual premium Dark Luxury,
 * animações Framer Motion, indicador de progresso e navegação voltar/avançar.
 */

interface OnboardingFlowProps {
  /** Chamado ao escolher o perfil. Persiste onboardingDone + chosenRole. */
  onSelectRole: (role: 'personal' | 'student') => void;
}

type Step = {
  title: string;
  message: string;
  tagline: string;
  icon: typeof Dumbbell;
  highlights: {
    label: string;
    icon: typeof Dumbbell;
  }[];
};

const STEPS: Step[] = [
  {
    title: 'Tudo em um só lugar',
    message:
      'Gerencie seus alunos, treinos e pagamentos em um só lugar.',
    tagline: 'Organize sua carteira com facilidade',
    icon: CalendarIcon,
    highlights: [
      { label: 'Alunos', icon: Users },
      { label: 'Treinos', icon: Dumbbell },
      { label: 'Evolução', icon: TrendingUp },
    ],
  },
  {
    title: 'Profissionalize seus treinos',
    message:
      'Crie treinos profissionais e acompanhe resultados.',
    tagline: 'Ferramentas completas de prescrição',
    icon: Dumbbell,
    highlights: [
      { label: 'Execução de treino', icon: Sparkles },
      { label: 'Técnicas avançadas', icon: LineChart },
      { label: 'Histórico', icon: TrendingUp },
    ],
  },
];

const STEP_X = {
  initial: { opacity: 0, x: 60 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

export function OnboardingFlow({ onSelectRole }: OnboardingFlowProps) {
  const [stepIndex, setStepIndex] = useState(0);

  const isLast = stepIndex >= STEPS.length - 1;
  const step = STEPS[stepIndex];

  const next = () => {
    if (isLast) return;
    setStepIndex((i) => i + 1);
  };

  const back = () => {
    if (stepIndex === 0) return;
    setStepIndex((i) => i - 1);
  };

  const chooseRole = (role: 'personal' | 'student') => {
    onSelectRole(role);
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#050505] text-white">
      {/* Glow de fundo (identidade Dark Luxury) */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-[#ff2a32]/8 blur-[130px]" />

      {/* Header: logo + indicador de progresso */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-6">
        <div className="flex items-center gap-2.5">
          <BrandMark size="sm" />
          <span className="text-sm font-black tracking-[-0.02em]">
            VSFit Personal
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {STEPS.map((_, index) => (
            <span
              key={index}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                index === stepIndex
                  ? 'w-6 bg-[#ff2a32]'
                  : index < stepIndex
                    ? 'w-3 bg-[#ff2a32]/50'
                    : 'w-3 bg-white/15'
              )}
            />
          ))}
        </div>
      </header>

      {/* Ícone de voltar (quando aplicável) */}
      <button
        onClick={back}
        disabled={stepIndex === 0}
        aria-label="Voltar"
        className={cn(
          'absolute left-4 z-10 mt-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-300 transition-all',
          stepIndex === 0
            ? 'pointer-events-none opacity-0'
            : 'opacity-100 hover:bg-white/[0.08]'
        )}
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Conteúdo animado */}
      <main className="relative z-[5] flex flex-1 flex-col justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.section
            key={stepIndex}
            {...STEP_X}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="text-center"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] border border-[#ff2a32]/25 bg-[#ff2a32]/12 shadow-[0_18px_50px_rgba(255,42,50,0.18)]">
              <step.icon className="h-9 w-9 text-[#ff2a32]" />
            </div>

            <p className="mt-6 text-[11px] font-black uppercase tracking-[0.24em] text-[#ff2a32]">
              {step.tagline}
            </p>

            <h2 className="mx-auto mt-3 max-w-xs text-[26px] font-black leading-tight tracking-[-0.04em]">
              {step.message}
            </h2>

            <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
              {step.title}
            </p>
          </motion.section>
        </AnimatePresence>

        {/* Highlights da tela */}
        {!isLast && (
          <div className="mt-8 flex flex-col gap-2.5">
            {step.highlights.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.08 }}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3.5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff2a32]/12 text-[#ff2a32]">
                  <item.icon className="h-4.5 w-4.5" />
                </div>
                <span className="text-sm font-semibold text-zinc-200">
                  {item.label}
                </span>
              </motion.div>
            ))}
          </div>
        )}

        {/* Tela 3: escolha de perfil */}
        {isLast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-8 flex flex-col gap-3"
          >
            <button
              onClick={() => chooseRole('personal')}
              className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl bg-[#ff2a32] px-5 py-4 text-left transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                  <Dumbbell className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[15px] font-black">Sou Personal Trainer</p>
                  <p className="text-[11px] font-medium text-white/70">
                    Gerencie alunos, treinos e resultados
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-white transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => chooseRole('student')}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-left transition-all hover:bg-white/[0.07] active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/8 text-white">
                  <LineChart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[15px] font-black">Sou Aluno</p>
                  <p className="text-[11px] font-medium text-zinc-400">
                    Segue daí o plano do(a) Personal
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-zinc-400 transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>
        )}
      </main>

      {/* Rodapé de avançar */}
      <footer className="relative z-10 px-6 pb-8 pt-4">
        {!isLast ? (
          <button
            onClick={next}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#ff2a32] text-sm font-black uppercase tracking-wide transition-all hover:bg-red-600 active:scale-[0.98]"
          >
            Avançar
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <p className="text-center text-[11px] font-medium text-zinc-600">
            Você poderá alterar o perfil mais tarde nas configurações.
          </p>
        )}
      </footer>
    </div>
  );
}

export default OnboardingFlow;