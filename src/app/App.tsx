import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { useAuthStore } from '../store/authStore';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { supabase } from '../lib/supabase';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { usePushReceiver } from '../hooks/usePushReceiver';
import { PushBanner } from '../components/ui/PushBanner';

export function App() {
  const { isLoading, initialize } = useAuthStore();

  // Sprint 12 — Push Notifications: registro de dispositivo (permissão +
  // token FCM) em plataforma nativa; no-op na web/Preview.
  usePushNotifications();

  // Sprint 12 — ETAPA 6: recebimento e navegação por push (foreground banner,
  // background/terminated). Ponto único de tratamento; no-op na web/Preview.
  const { activePush, navigateFromPush, dismissPush } = usePushReceiver();

  useEffect(() => {
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');

    const runRecoveryHandling = async () => {
      if (accessToken && refreshToken && type === 'recovery') {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!sessionError) {
          useAuthStore.getState().setRecovering(true);
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    };

    const init = async () => {
      await runRecoveryHandling();
      await initialize();
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'PASSWORD_RECOVERY') {
        useAuthStore.getState().setRecovering(true);
        return;
      }

      if (event === 'SIGNED_IN') {
        if (window.location.pathname === '/auth/reset-password') {
          return;
        }
        useAuthStore.getState().setRecovering(false);
        void useAuthStore.getState().initialize();
      }

      if (event === 'SIGNED_OUT') {
        useAuthStore.getState().logoutFromEvent();
      }
    });

    return () => subscription?.unsubscribe();
  }, [initialize]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <PushBanner
        push={activePush}
        onOpen={() => {
          if (activePush) navigateFromPush(activePush);
        }}
        onClose={dismissPush}
      />
    </ErrorBoundary>
  );
}