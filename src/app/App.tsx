import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { useAuthStore } from '../store/authStore';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { supabase } from '../lib/supabase';

export function App() {
  const { isLoading, initialize } = useAuthStore();

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
    </ErrorBoundary>
  );
}