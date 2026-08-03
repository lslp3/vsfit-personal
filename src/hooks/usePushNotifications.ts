import { useEffect, useState } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

import { supabase } from '../lib/supabase';
import { updateToken as persistUpdateToken, upsertToken as persistUpsertToken, removeAllTokens } from '../services/pushService';

/**
 * Sprint 12 — Push Notifications (ETAPA 2/3): ciclo de vida do token FCM.
 *
 * - Somente plataforma nativa (Android) — web/Preview não usa FCM nativo.
 * - A cada login (INITIAL_SESSION/SIGNED_IN): solicita permissão e registra
 *   o dispositivo; o token FCM fica disponível via estado.
 * - Atualização automática de token: listener 'registration' do plugin
 *   (dispara em refresh) — persistido via pushService.updateToken/upsert.
 * - Logout (SIGNED_OUT): limpa o token local e remove todos os tokens do
 *   usuário no Supabase (best-effort).
 */
export function usePushNotifications() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  useEffect(() => {
    if (!isNative) return;

    let active = true;
    let previousToken: string | null = null;
    let registrationListener: PluginListenerHandle | null = null;
    let registrationErrorListener: PluginListenerHandle | null = null;

    async function register() {
      try {
        const permission = await PushNotifications.requestPermissions();

        if (!active) return;

        setPermissionGranted(permission.receive === 'granted');

        if (permission.receive !== 'granted') {
          setError('Permissão de notificação negada.');
          return;
        }

        setError(null);
        await PushNotifications.register();
      } catch (registerError) {
        if (active) {
          setError(String(registerError));
          console.warn('[usePushNotifications] register error:', registerError);
        }
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        void register();
      }

      if (event === 'SIGNED_OUT') {
        setToken(null);
        previousToken = null;
        // Remove todos os tokens do usuário no Supabase (best-effort).
        void removeAllTokens().catch(() => {});
      }
    });

    // Token FCM (inclui refresh automático do Firebase).
    PushNotifications.addListener('registration', (registration) => {
      if (!active) return;

      const nextToken = registration.value;
      setToken(nextToken);

      // Persistência: refresh troca a linha antiga pela nova (evita
      // duplicatas); primeiro token faz upsert. Tudo por pushService.
      if (previousToken && previousToken !== nextToken) {
        void persistUpdateToken(previousToken, nextToken).catch((e) =>
          console.warn('[usePushNotifications] update token error:', e)
        );
      } else {
        void persistUpsertToken(nextToken, platform).catch((e) =>
          console.warn('[usePushNotifications] upsert token error:', e)
        );
      }

      previousToken = nextToken;
    }).then((handle) => {
      registrationListener = handle;
    });

    PushNotifications.addListener('registrationError', (registrationError) => {
      if (active) {
        setError(registrationError.error);
        console.warn('[usePushNotifications] registration error:', registrationError.error);
      }
    }).then((handle) => {
      registrationErrorListener = handle;
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
      registrationListener?.remove();
      registrationErrorListener?.remove();
    };
  }, [isNative, platform]);

  return {
    permissionGranted,
    token,
    error,
  };
}
