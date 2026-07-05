import { motion } from 'framer-motion';
import {
  Camera,
  MessageSquare,
  TimerReset,
  TrendingUp,
  Trophy,
} from 'lucide-react';

const items = [
  {
    icon: TimerReset,
    label: 'Cronômetro de treino',
  },
  {
    icon: TrendingUp,
    label: 'Histórico de exercícios',
  },
  {
    icon: Camera,
    label: 'Fotos de evolução',
  },
  {
    icon: MessageSquare,
    label: 'Chat com o personal',
  },
  {
    icon: Trophy,
    label: 'Conquistas e sequência',
  },
];

export function StudentFeatures() {
  return (
    <section
      id="for-student"
      className="px-4 py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-vs-primary">
              Para alunos
            </span>

            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">
              Seu acompanhamento na palma da mão.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400">
              O aluno recebe treinos, acompanha a evolução, visualiza o plano
              e conversa com o personal em um ambiente simples, organizado e
              fácil de usar.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {items.map((item, index) => {
                const Icon = item.icon;

                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-vs-primary/15">
                      <Icon className="h-5 w-5 text-vs-primary" />
                    </div>

                    <span className="text-sm font-bold text-white">
                      {item.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="grid gap-6 md:grid-cols-2"
          >
            <article className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04]">
              <div className="border-b border-white/10 px-5 py-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                  Home do aluno
                </p>
              </div>

              <img
                src="/landing/student-home.png"
                alt="Tela inicial do aluno no VSFit"
                className="w-full object-cover object-top"
                loading="lazy"
              />
            </article>

            <article className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04]">
              <div className="border-b border-white/10 px-5 py-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                  Progresso
                </p>
              </div>

              <img
                src="/landing/student-progress.png"
                alt="Tela de progresso do aluno no VSFit"
                className="w-full object-cover object-top"
                loading="lazy"
              />
            </article>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default StudentFeatures;