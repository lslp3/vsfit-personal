import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Dumbbell, LayoutDashboard, TrendingUp, MessageSquare, Utensils, Play } from 'lucide-react';

interface ShowcaseItem {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  icon: React.ReactNode;
}

const SCREENS: ShowcaseItem[] = [
  {
    id: 'timer',
    title: 'Cronômetro',
    description: 'Timer inteligente para acompanhar séries, descanso e intensidade dos treinos.',
    imageSrc: '/screenshots/01-timer.jpg',
    icon: <Play className="h-8 w-8" />,
  },
  {
    id: 'evolution',
    title: 'Evolução',
    description: 'Fotos de progresso, medidas corporais e histórico completo de resultados.',
    imageSrc: '/screenshots/02-evolution.jpg',
    icon: <TrendingUp className="h-8 w-8" />,
  },
  {
    id: 'nutrition',
    title: 'Plano Alimentar',
    description: 'Planos alimentares, refeições e orientações nutricionais do seu personal.',
    imageSrc: '/screenshots/03-nutrition.jpg',
    icon: <Utensils className="h-8 w-8" />,
  },
  {
    id: 'exercicios',
    title: 'Exercícios',
    description: 'Biblioteca completa de exercícios com vídeos, descrições e execução correta.',
    imageSrc: '/screenshots/04-exercicios.jpg',
    icon: <Dumbbell className="h-8 w-8" />,
  },
  {
    id: 'chat',
    title: 'Chat',
    description: 'Comunicação direta com seu personal trainer, tudo centralizado na plataforma.',
    imageSrc: '/screenshots/05-chat.jpg',
    icon: <MessageSquare className="h-8 w-8" />,
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Visão geral do seu progresso com métricas e indicadores em tempo real.',
    imageSrc: '/screenshots/06-dashboard.jpg',
    icon: <LayoutDashboard className="h-8 w-8" />,
  },
  {
    id: 'execucao',
    title: 'Execução de Treino',
    description: 'Cronômetro, séries, cargas e repetições — acompanhe cada exercício em tempo real.',
    imageSrc: '/screenshots/07-execucao.jpg',
    icon: <Play className="h-8 w-8" />,
  },
  {
    id: 'treinos',
    title: 'Treinos',
    description: 'Treinos personalizados organizados por dia da semana com exercícios detalhados.',
    imageSrc: '/screenshots/08-treinos.jpg',
    icon: <Dumbbell className="h-8 w-8" />,
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
      {/* Phone screen image */}
      <div className="relative h-[380px] w-full overflow-hidden bg-black">
        <img
          src={screen.imageSrc}
          alt={screen.title}
          loading="lazy"
          className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
        />
        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#111111] via-[#111111]/80 to-transparent" />
        {/* Glow overlay */}
        <div className="absolute inset-0 bg-black/0 transition-all duration-500 group-hover:bg-black/10" />
      </div>

      {/* Card footer */}
      <div className="border-t px-5 py-4 text-left" style={{ borderColor: '#2A2A2A' }}>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center text-red-400">{screen.icon}</div>
          <h3 className="text-base font-black text-white">{screen.title}</h3>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">{screen.description}</p>
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

          {/* Phone image (large) */}
          <div
            className="relative overflow-hidden rounded-[32px] border"
            style={{ borderColor: '#2A2A2A', backgroundColor: '#111111' }}
          >
            <div className="relative h-[520px] w-full overflow-hidden bg-black">
              <img
                src={current.imageSrc}
                alt={current.title}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-5 text-center" style={{ borderColor: '#2A2A2A' }}>
              <div className="flex items-center justify-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center text-red-400">{current.icon}</div>
                <h3 className="text-xl font-black text-white">{current.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{current.description}</p>
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