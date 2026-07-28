import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { useAuthStore } from '../store/authStore';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { supabase } from '../lib/supabase';

export function App() {
  const { isLoading, initialize } = useAuthStore();

  useEffect(() => {
    const runRecoveryHandling = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash');
      const otpType = searchParams.get('type') || hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (tokenHash && otpType === 'recovery') {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });

        if (!error && data.session) {
          window.history.replaceState(null, '', '/auth/reset-password');
        }

        return;
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error) {
          window.history.replaceState(null, '', '/auth/reset-password');
        }
      }
    };

    void runRecoveryHandling();
    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        return;
      }

      if (event === 'SIGNED_OUT') {
        useAuthStore.getState().logoutFromEvent();
      } else if (
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
        session?.user
      ) {
        void useAuthStore.getState().initialize();
      }
    });

    return () => subscription?.unsubscribe();
  }, [initialize]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <RouterProvider router={router} />;
}
