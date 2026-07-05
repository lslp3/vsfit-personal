import { motion } from 'framer-motion';
import {
  BarChart3,
  CreditCard,
  Dumbbell,
  MessageSquare,
  Users,
} from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Gestão de alunos',
    description:
      'Cadastre, acompanhe e organize seus alunos em um painel simples e prático.',
  },
  {
    icon: Dumbbell,
    title: 'Montador de treinos',
    description:
      'Crie planos por dia da semana, organize exercícios e use bi-set e drop-set.',
  },
  {
    icon: MessageSquare,
    title: 'Chat com alunos',
    description:
      'Mantenha a comunicação centralizada dentro da plataforma.',
  },
  {
    icon: CreditCard,
    title: 'Financeiro',
    description:
      'Controle cobranças, pagamentos e acompanhe a situação financeira dos alunos.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios e evolução',
    description:
      'Visualize progresso, métricas e acompanhe a evolução de forma profissional.',
  },
];

export function PersonalFeatures() {
  return (
    <section
      id="for-personal"
      className="border-y border-white/5 bg-[#080808] px-4 py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid items-start gap-12 lg:grid-cols-[0.92fr_1.08fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-vs-primary">
              Para personal trainers
            </span>

            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">
              Mais controle na rotina. Mais qualidade no atendimento.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400">
              O VSFit foi pensado para o personal que precisa organizar alunos,
              criar treinos, acompanhar resultados e manter o atendimento em um
              só lugar.
            </p>

            <div className="mt-8 space-y-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: index * 0.05 }}
                    className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-vs-primary/15">
                        <Icon className="h-5 w-5 text-vs-primary" />
                      </div>

                      <div>
                        <h3 className="text-base font-black text-white">
                          {feature.title}
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                          {feature.description}
                        </p>
                      </div>
                    </div>
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
                  Gestão de alunos
                </p>
              </div>

              <img
                src="/landing/personal-students.png"
                alt="Tela de gestão de alunos do VSFit"
                className="w-full object-cover object-top"
                loading="lazy"
              />
            </article>

            <article className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04]">
              <div className="border-b border-white/10 px-5 py-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                  Montador de treinos
                </p>
              </div>

              <img
                src="/landing/personal-workout-builder.png"
                alt="Tela do montador de treinos do VSFit"
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

export default PersonalFeatures;