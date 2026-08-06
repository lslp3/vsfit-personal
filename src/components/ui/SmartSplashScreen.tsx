import { motion } from 'framer-motion';

import { BrandMark } from '../brand/BrandMark';

interface SmartSplashScreenProps {
  /**
   * SPRINT 17 · ETAPA 2 — status de conectividade (preparação).
   * A tela dedicada de offline chega na ETAPA 8; aqui apenas informamos.
   */
  online?: boolean;
}

/**
 * SPRINT 17 · ETAPA 2 — Splash Screen Inteligente.
 *
 * Primeira tela visível ao abrir o aplicativo (após a splash nativa do
 * Capacitor). Mantém a identidade visual atual (logo + Dark Luxury) com
 * animação simples e elegante. Durante a exibição o App.executa a
 * verificação de sessão Supabase, conectividade e carregamentos mínimos.
 *
 * Duração aproximada de 1–2s — controlada pelo chamador (App.tsx), que
 * garante um tempo mínimo de exposição sem atrasar desnecessariamente.
 */
export function SmartSplashScreen({ online = true }: SmartSplashScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#050505]">
      {/* Glow suave (identidade Dark Luxury) */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff2a32]/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.86, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center"
      >
        <div className="flex h-24 w-24 items-center justify-center">
          <BrandMark
            size="xl"
            className="rounded-[24px] shadow-[0_20px_60px_rgba(255,42,50,0.25)]"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6, ease: 'easeOut' }}
          className="mt-8 text-center"
        >
          <h1 className="text-[22px] font-black tracking-[-0.04em] text-white">
            VSFit Personal
          </h1>

          <p className="mt-2 text-[13px] font-medium leading-relaxed text-zinc-400">
            Seu treino.
            <br />
            Seus alunos.
            <br />
            Sua evolução.
          </p>
        </motion.div>
      </motion.div>

      {/* Barra de progresso discreta */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-12 left-1/2 h-[3px] w-24 -translate-x-1/2 overflow-hidden rounded-full bg-white/10"
      >
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
          className="h-full w-1/2 rounded-full bg-[#ff2a32]"
        />
      </motion.div>

      {/* Indicador discreto de conectividade (ETAPA 2 — verificação) */}
      <div className="absolute bottom-24 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            online ? 'bg-emerald-400/80' : 'bg-amber-400/80'
          }`}
        />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          {online ? 'Conectando' : 'Sem conexão'}
        </span>
      </div>
    </div>
  );
}

export default SmartSplashScreen;