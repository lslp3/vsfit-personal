import { useEffect, useState } from 'react';

/**
 * SPRINT 17 · ETAPA 2 — Detecção de conectividade.
 *
 * Expõe `navigator.onLine` como estado reativo (listeners online/offline).
 * Hoje é apenas verificação/preparação (consumida pela Splash inteligente);
 * a tela offline dedicada chega na ETAPA 8.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { online };
}

export default useOnlineStatus;