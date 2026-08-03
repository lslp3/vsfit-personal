import { useEffect, useState } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

import { supabase } from '../lib/supabase';

/**
 * Sprint 12 — Push Notifications (ETAPA 2/3): ciclo de vida do token FCM.
 *
 * - Somente plataforma nativa (Android) — web/Preview não usa FCM nativo.
 * - A cada login (INITIAL_SESSION/SIGNED_IN): solicita permissão e registra
 *   o dispositivo; o token FCM fica disponível via estado.
 * - Atualização automática de token: listener 'registration' do plugin
 *   (dispara em refresh) atualiza o estado.
 * - Logout (SIGNED_OUT): limpa o token local.
 *
 * A PERSISTÊNCIA do token no Supabase (upsert) e a remoção no logout são
 * responsabilidade da ETAPA 3 (pushService) — o hook apenas expõe o token.
 */
export function usePushNotifications() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!isNative) return;

    let active = true;
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
      }
    });

    // Token FCM (inclui refresh automático do Firebase).
    PushNotifications.addListener('registration', (registration) => {
      if (active) {
        setToken(registration.value);
      }
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
  }, [isNative]);

  return {
    permissionGranted,
    token,
    error,
  };
}
