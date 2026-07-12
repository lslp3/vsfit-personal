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
        <div className="flex flex-col gap-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-vs-primary">
              Para personal trainers
            </span>

            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white md:text-6xl">
              Mais controle na rotina.<br />
              Mais qualidade no atendimento.
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
              O VSFit foi pensado para o personal que precisa organizar alunos,
              criar treinos, acompanhar resultados e manter o atendimento em um
              só lugar.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="group rounded-[30px] border border-white/10 bg-white/[0.02] p-8 transition-all hover:bg-white/[0.04] hover:border-white/20"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-vs-primary/10 text-vs-primary transition-colors group-hover:bg-vs-primary group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="mt-6 text-xl font-black text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PersonalFeatures;