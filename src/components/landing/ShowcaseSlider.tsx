import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Dumbbell, LayoutDashboard, TrendingUp, MessageSquare, CreditCard, Utensils, User, Play } from 'lucide-react';

interface ShowcaseItem {
  id: string;
  title: string;
  description: string;
  gradient: string;
  icon: React.ReactNode;
  accent: string;
}

const SCREENS: ShowcaseItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Visão geral do seu progresso com métricas e indicadores em tempo real.',
    gradient: 'from-red-900/40 via-red-800/20 to-black',
    accent: '#FF2D2D',
    icon: <LayoutDashboard className="h-8 w-8" />,
  },
  {
    id: 'workouts',
    title: 'Treinos',
    description: 'Treinos personalizados organizados por dia da semana com exercícios detalhados.',
    gradient: 'from-red-800/30 via-red-700/15 to-black',
    accent: '#FF2D2D',
    icon: <Dumbbell className="h-8 w-8" />,
  },
  {
    id: 'execution',
    title: 'Execução de Treino',
    description: 'Cronômetro, séries, cargas e repetições — acompanhe cada exercício em tempo real.',
    gradient: 'from-red-700/30 via-red-600/15 to-black',
    accent: '#FF2D2D',
    icon: <Play className="h-8 w-8" />,
  },
  {
    id: 'evolution',
    title: 'Evolução',
    description: 'Fotos de progresso, medidas corporais e histórico completo de resultados.',
    gradient: 'from-red-900/35 via-red-700/15 to-black',
    accent: '#FF2D2D',
    icon: <TrendingUp className="h-8 w-8" />,
  },
  {
    id: 'chat',
    title: 'Chat',
    description: 'Comunicação direta com seu personal trainer, tudo centralizado na plataforma.',
    gradient: 'from-red-800/30 via-red-600/10 to-black',
    accent: '#FF2D2D',
    icon: <MessageSquare className="h-8 w-8" />,
  },
  {
    id: 'financial',
    title: 'Financeiro',
    description: 'Controle de pagamentos, planos e situação financeira de forma organizada.',
    gradient: 'from-red-900/40 via-red-700/20 to-black',
    accent: '#FF2D2D',
    icon: <CreditCard className="h-8 w-8" />,
  },
  {
    id: 'nutrition',
    title: 'Nutrição',
    description: 'Planos alimentares, refeições e orientações nutricionais do seu personal.',
    gradient: 'from-red-700/25 via-red-600/10 to-black',
    accent: '#FF2D2D',
    icon: <Utensils className="h-8 w-8" />,
  },
  {
    id: 'profile',
    title: 'Perfil & Conquistas',
    description: 'Seu perfil completo, conquistas, sequência de treinos e métricas pessoais.',
    gradient: 'from-red-800/35 via-red-700/15 to-black',
    accent: '#FF2D2D',
    icon: <User className="h-8 w-8" />,
  },
];

function PhoneMockup({ screen, onClick }: { screen: ShowcaseItem; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ scale: 1.05 }}
      className="group relative flex w-[280px] shrink-0 snap-start flex-col overflow-hidden rounded-3xl border transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,45,45,0.25)]"
      style={{ borderColor: '#2A2A2A', backgroundColor: '#111111' }}
    >
      {/* Phone screen mockup */}
      <div className="relative h-[380px] w-full overflow-hidden">
        {/* Gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-b ${screen.gradient}`} />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Glow behind icon */}
        <div
          className="absolute left-1/2 top-1/3 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[50px] transition-all duration-500 group-hover:blur-[70px]"
          style={{ backgroundColor: 'rgba(255,45,45,0.2)' }}
        />

        {/* Icon */}
        <div className="absolute left-1/2 top-1/3 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center text-white/80 transition-all duration-500 group-hover:text-red-400 group-hover:scale-110">
          {screen.icon}
        </div>

        {/* Top notch mockup */}
        <div className="absolute left-1/2 top-2 h-3 w-20 -translate-x-1/2 rounded-full bg-black/40" />

        {/* Status bar dots */}
        <div className="absolute right-3 top-2 flex gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
          <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
          <div className="h-1.5 w-1.5 rounded-full bg-white/10" />
        </div>

        {/* Bottom indicator */}
        <div className="absolute bottom-3 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-white/10" />
      </div>

      {/* Card footer */}
      <div className="border-t border-white/5 px-5 py-4 text-left" style={{ borderColor: '#2A2A2A' }}>
        <h3 className="text-base font-black text-white">
          {screen.title}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          {screen.description}
        </p>
      </div>
    </motion.button>
  );
}

function Modal({
  screens,
  currentIndex,
  onClose,
}: {
  screens: ShowcaseItem[];
  currentIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(currentIndex);
  const current = screens[index];

  const goNext = useCallback(() => {
    setIndex((prev) => (prev + 1) % screens.length);
  }, [screens.length]);

  const goPrev = useCallback(() => {
    setIndex((prev) => (prev - 1 + screens.length) % screens.length);
  }, [screens.length]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-12 right-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Phone mockup (large) */}
          <div
            className="relative overflow-hidden rounded-[32px] border"
            style={{ borderColor: '#2A2A2A', backgroundColor: '#111111' }}
          >
            <div className="relative h-[520px] w-full overflow-hidden">
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-b ${current.gradient}`} />

              {/* Grid */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                  backgroundSize: '20px 20px',
                }}
              />

              {/* Central glow */}
              <div
                className="absolute left-1/2 top-1/3 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[60px]"
                style={{ backgroundColor: 'rgba(255,45,45,0.3)' }}
              />

              {/* Icon */}
              <div className="absolute left-1/2 top-1/3 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center text-red-400">
                <div className="scale-150">{current.icon}</div>
              </div>

              {/* Notch */}
              <div className="absolute left-1/2 top-2 h-3 w-24 -translate-x-1/2 rounded-full bg-black/50" />
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-5 text-center" style={{ borderColor: '#2A2A2A' }}>
              <h3 className="text-xl font-black text-white">
                {current.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {current.description}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={goPrev}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border transition-all hover:bg-white/5"
              style={{ borderColor: '#2A2A2A' }}
            >
              <ChevronLeft className="h-5 w-5 text-white/70" />
            </button>

            {/* Progress dots */}
            <div className="flex gap-2">
              {screens.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className="transition-all duration-300"
                  style={{
                    width: i === index ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: i === index
                      ? '#FF2D2D'
                      : 'rgba(255,255,255,0.15)',
                  }}
                />
              ))}
            </div>

            <button
              onClick={goNext}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border transition-all hover:bg-white/5"
              style={{ borderColor: '#2A2A2A' }}
            >
              <ChevronRight className="h-5 w-5 text-white/70" />
            </button>
          </div>

          {/* Counter */}
          <p className="mt-4 text-center text-xs font-bold text-zinc-500">
            {index + 1} / {screens.length}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function ShowcaseSlider() {
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="overflow-hidden px-4 py-24">
      <div className="mx-auto max-w-7xl">
        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="mb-14 text-center"
        >
          <span className="mb-3 block text-[11px] font-black uppercase tracking-[0.22em] text-vs-primary">
            Conheça o VSFit
          </span>
          <h2 className="text-3xl font-black tracking-[-0.04em] text-white md:text-5xl">
            VSFit Personal{' '}
            <span className="text-vs-primary">por dentro</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
            Explore as principais telas do aplicativo e descubra como o VSFit transforma a gestão de treinos e alunos.
          </p>
        </motion.div>

        {/* Slider */}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-4"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <style>{`
            div::-webkit-scrollbar { display: none; }
          `}</style>

          {SCREENS.map((screen) => (
            <PhoneMockup
              key={screen.id}
              screen={screen}
              onClick={() => setModalIndex(SCREENS.indexOf(screen))}
            />
          ))}
        </div>

        {/* Scroll hint */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-6 text-center text-xs font-semibold text-zinc-600 md:hidden"
        >
          Arraste para o lado para ver mais telas →
        </motion.p>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalIndex !== null && (
          <Modal
            screens={SCREENS}
            currentIndex={modalIndex}
            onClose={() => setModalIndex(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

export default ShowcaseSlider;