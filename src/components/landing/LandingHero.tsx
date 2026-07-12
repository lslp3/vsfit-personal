import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export function LandingHero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-28 text-center md:pb-28 md:pt-36">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,42,50,0.12),transparent_50%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-vs-primary/[0.05] blur-[150px]" />

      <div className="relative mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-vs-primary" />
            Plataforma fitness completa
          </div>

          <h1 className="mt-8 text-6xl font-black leading-[0.9] tracking-[-0.06em] text-white md:text-8xl">
            Treinos,{' '}
            <span className="text-vs-primary">evolução</span> e gestão em um só
            lugar.
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl">
            O VSFit conecta personal trainers e alunos com treinos
            personalizados, acompanhamento de progresso, comunicação e gestão em
            uma única plataforma.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#install"
              className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-vs-primary px-8 text-sm font-black text-white transition-all hover:bg-red-600 active:scale-[0.98]"
            >
              Instalar no celular
              <ArrowRight className="h-4 w-4" />
            </a>

            <a
              href="/auth/login"
              className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-8 text-sm font-black text-white transition-all hover:bg-white/[0.09] active:scale-[0.98]"
            >
              Acessar versão web
            </a>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {[
              'Treinos personalizados',
              'Progresso em tempo real',
              'Comunicação direta',
            ].map((item) => (
              <div
                key={item}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-zinc-300"
              >
                <CheckCircle2 className="h-4 w-4 text-vs-primary" />
                {item}
              </div>
            ))}
          </div>

          <p className="mt-12 text-sm italic text-zinc-500">
            Desenvolvido para personal trainers que desejam profissionalizar o
            atendimento.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export default LandingHero;