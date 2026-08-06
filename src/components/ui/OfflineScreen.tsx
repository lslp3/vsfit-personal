import { useState } from 'react';
import { motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';

interface OfflineScreenProps {
  /**
   * Chamado quando o usuário clica em "Tentar novamente" e a verificação
   * local confirma que há conexão de volta. Opcional: o App já remove a
   * tela automaticamente pelo estado reativo de conectividade.
   */
  onRetry?: () => void;
}

/**
 * SPRINT 17 · ETAPA 8 — Fase A: Tela Offline Global.
 *
 * Exibida quando o dispositivo detecta que está sem conexão, substituindo
 * qualquer rota (inclusive /auth/* e /signup/:slug, que exigem rede).
 *
 * - Segue o padrão Dark Luxury do app (fundo #050505, acento #ff2a32).
 * - Respeita a safe-area do Capacitor (top + bottom).
 * - Não faz NENHUMA chamada de rede/Supabase (decisão escopo ETAPA 8).
 * - Botão "Tentar novamente": re-verifica a conectividade local após um
 *   pequeno intervalo; se voltou, chama `onRetry` (o App derruba a tela).
 */
export function OfflineScreen({ onRetry }: OfflineScreenProps) {
  const [checking, setChecking] = useState(false);

  const handleRetry = () => {
    if (checking) return;
    setChecking(true);

    // Pequeno intervalo para dar tempo de eventos Browser 'online' chegarem,
    // depois re-verifica a conectividade local (sem chamar a backend).
    window.setTimeout(() => {
      setChecking(false);

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        onRetry?.();
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#050505] px-6 pt-[var(--safe-area-inset-top, env(safe-area-inset-top, 0px))] pb-[var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full flex-col items-center text-center"
      >
        {/* Ícone — conexão perdida */}
        <div className="flex h-24 w-24 items-center justify-center rounded-[32px] border border-[#ff2a32]/25 bg-[#ff2a32]/15">
          <WifiOff className="h-11 w-11 text-[#ff2a32]" strokeWidth={1.75} />
        </div>

        <h1 className="mt-8 text-[22px] font-black tracking-[-0.04em] text-white">
          Sem conexão
        </h1>

        <p className="mt-3 max-w-[300px] text-[13px] font-medium leading-relaxed text-zinc-400">
          É necessário estar conectado à internet para carregar seus dados.
          Verifique sua conexão e tente novamente.
        </p>

        <button
          type="button"
          onClick={handleRetry}
          disabled={checking}
          className="mt-9 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#ff2a32] px-8 text-[15px] font-black text-black transition-opacity active:opacity-80 disabled:opacity-60"
        >
          {checking && (
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          )}
          {checking ? 'Verificando...' : 'Tentar novamente'}
        </button>
      </motion.div>
    </div>
  );
}

export default OfflineScreen;