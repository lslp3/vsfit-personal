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
        <div className="flex flex-col gap-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-vs-primary">
              Para alunos
            </span>

            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white md:text-6xl">
              Seu acompanhamento <br />
              na palma da mão.
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
              O aluno recebe treinos, acompanha a evolução, visualiza o plano
              e conversa com o personal em um ambiente simples, organizado e
              fácil de usar.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => {
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex items-center gap-4 rounded-[24px] border border-white/5 bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04] hover:border-white/10"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-vs-primary/10 text-vs-primary">
                    <Icon className="h-6 w-6" />
                  </div>

                  <span className="text-base font-bold text-white">
                    {item.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default StudentFeatures;