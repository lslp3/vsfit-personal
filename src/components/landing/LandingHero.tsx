import { motion } from 'framer-motion';
import { ArrowRight, Smartphone, Monitor } from 'lucide-react';

export function LandingHero() {
  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-24 text-center md:pb-32 md:pt-32">
      {/* Background depth */}
      <div className="pointer-events-none absolute inset-0 bg-[#050505]" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/10 blur-[200px]" />
      <div className="pointer-events-none absolute left-1/4 top-0 h-[400px] w-[400px] rounded-full bg-red-500/5 blur-[150px]" />
      <div className="pointer-events-none absolute -right-1/4 bottom-0 h-[500px] w-[500px] rounded-full bg-red-500/5 blur-[150px]" />

      {/* Hero glow behind title */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 bg-red-500/20 blur-[120px]" />

      <div className="relative mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-vs-primary" />
            Plataforma fitness completa
          </div>

          {/* Title with gradient on "evolução" */}
          <h1 className="mx-auto mt-8 max-w-xl text-5xl font-black leading-tight tracking-[-0.06em] text-white md:text-6xl lg:text-7xl">
            Treinos,{' '}
            <span className="bg-gradient-to-r from-red-500 to-red-400 bg-clip-text text-transparent">
              evolução
            </span>{' '}
            e gestão em um só lugar.
          </h1>

          {/* Professional description */}
          <p className="mx-auto mt-8 max-w-[560px] text-base leading-relaxed text-gray-300 md:text-lg">
            A plataforma completa para personal trainers e alunos acompanharem treinos,
            evolução física, comunicação, pagamentos e gestão de forma simples, moderna
            e eficiente.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#install"
              className="group inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 px-8 text-sm font-black text-white shadow-lg shadow-red-500/30 transition-all duration-300 hover:scale-105 hover:shadow-red-500/50 active:scale-[0.98] sm:w-auto"
            >
              <Smartphone className="h-5 w-5" />
              Baixar APK agora
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>

            <a
              href="/auth/login"
              className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-8 text-sm font-black text-white backdrop-blur-sm transition-all duration-300 hover:border-red-500/40 hover:bg-white/5 active:scale-[0.98] sm:w-auto"
            >
              <Monitor className="h-5 w-5" />
              Abrir versão web
            </a>
          </div>

          {/* Benefits cards grid */}
          <div className="mx-auto mt-16 grid max-w-3xl gap-4 sm:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ),
                title: 'Treinos inteligentes',
                desc: 'Treinos personalizados com acompanhamento completo do aluno.',
              },
              {
                icon: (
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                ),
                title: 'Evolução em tempo real',
                desc: 'Fotos, medidas, progresso e histórico de resultados.',
              },
              {
                icon: (
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                  </svg>
                ),
                title: 'Gestão profissional',
                desc: 'Controle alunos, pagamentos, planos e comunicação em um único sistema.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
                  {item.icon}
                </div>
                <h3 className="mt-4 text-sm font-black text-white">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Feature pills */}
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
                <svg className="h-4 w-4 text-vs-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {item}
              </div>
            ))}
          </div>

          <p className="mt-12 text-sm italic text-zinc-500">
            Desenvolvido para personal trainers que desejam profissionalizar o atendimento.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export default LandingHero;