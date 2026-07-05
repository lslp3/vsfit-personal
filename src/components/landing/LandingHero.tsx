import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  TrendingUp,
  Users,
} from 'lucide-react';

const WHATSAPP_NUMBER = '5534988398567';

const WHATSAPP_MESSAGE =
  'Olá! Gostaria de saber mais sobre o VSFit Personal.';

const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE
)}`;

export function LandingHero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-28 md:pb-28 md:pt-36">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,42,50,0.16),transparent_34%)]" />
      <div className="pointer-events-none absolute right-0 top-0 h-[520px] w-[520px] rounded-full bg-vs-primary/[0.08] blur-[130px]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-vs-primary" />
            Plataforma fitness completa
          </div>

          <h1 className="mt-6 text-5xl font-black leading-[0.95] tracking-[-0.06em] text-white md:text-7xl">
            Treinos,{' '}
            <span className="text-vs-primary">evolução</span> e gestão em um só
            lugar.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl">
            O VSFit conecta personal trainers e alunos com treinos
            personalizados, acompanhamento de progresso, comunicação e gestão em
            uma única plataforma.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#install"
              className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-vs-primary px-7 text-sm font-black text-white transition-all hover:bg-red-600 active:scale-[0.98]"
            >
              Instalar no celular
              <ArrowRight className="h-4 w-4" />
            </a>

            <a
              href="/auth/login"
              className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-7 text-sm font-black text-white transition-all hover:bg-white/[0.09] active:scale-[0.98]"
            >
              Acessar versão web
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
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

          <p className="mt-8 text-sm italic text-zinc-500">
            Desenvolvido para personal trainers que desejam profissionalizar o
            atendimento.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1 }}
          className="relative"
        >
          <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] p-3 shadow-[0_25px_100px_rgba(0,0,0,0.35)]">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
              <img
                src="/landing/personal-dashboard.png"
                alt="Dashboard do VSFit Personal"
                className="w-full object-cover object-top"
                loading="eager"
              />
            </div>
          </div>

          <div className="pointer-events-none absolute -left-4 top-8 hidden w-48 rounded-[22px] border border-white/10 bg-black/85 p-4 backdrop-blur-md md:block">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-vs-primary/15">
                <Users className="h-5 w-5 text-vs-primary" />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                  Gestão
                </p>
                <p className="text-sm font-bold text-white">
                  Alunos, treinos e planos
                </p>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute -bottom-6 right-2 hidden w-52 rounded-[22px] border border-white/10 bg-black/85 p-4 backdrop-blur-md md:block">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-vs-primary/15">
                <TrendingUp className="h-5 w-5 text-vs-primary" />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                  Evolução
                </p>
                <p className="text-sm font-bold text-white">
                  Acompanhe resultados reais
                </p>
              </div>
            </div>
          </div>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/75 px-4 py-2 text-xs font-black text-white backdrop-blur-md transition-all hover:bg-black"
          >
            <MessageCircle className="h-4 w-4 text-[#25d366]" />
            Suporte via WhatsApp
          </a>
        </motion.div>
      </div>
    </section>
  );
}

export default LandingHero;