import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { useAuthStore } from '../store/authStore';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { supabase } from '../lib/supabase';

export function App() {
  const { isLoading, initialize } = useAuthStore();

  // █ LOG 5 — App() component function body (primeiro render do React)
  // LOG 5A: ANTES de qualquer hook/efeito (síncrono, durante o render)
  console.log('[LOG 5] App() — FUNÇÃO COMPONENTE (durante render)');
  console.log('[LOG 5] href:  ', window.location.href);
  console.log('[LOG 5] hash:  ', window.location.hash);
  console.log('[LOG 5] search:', window.location.search);

  useEffect(() => {
    // █ LOG 6 — useEffect montou (assíncrono, APÓS o primeiro render)
    console.log('[LOG 6] App() — useEffect iniciou');
    console.log('[LOG 6] href:  ', window.location.href);
    console.log('[LOG 6] hash:  ', window.location.hash);
    console.log('[LOG 6] search:', window.location.search);
    const runRecoveryHandling = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash');
      const otpType = searchParams.get('type') || hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      // Log do que foi encontrado no hash
      console.log('[RRH] tokenHash:', tokenHash);
      console.log('[RRH] otpType:', otpType);
      console.log('[RRH] accessToken:', accessToken ? accessToken.slice(0, 20) + '...' : 'null');
      console.log('[RRH] refreshToken:', refreshToken ? refreshToken.slice(0, 20) + '...' : 'null');
      console.log('[RRH] hashParams entries:', [...hashParams.entries()].map(e => e[0] + '=' + e[1].slice(0, 20)).join(', '));

      if (tokenHash && otpType === 'recovery') {
        console.log('[RRH] → chamando verifyOtp() (token_hash path)...');
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        console.log('[RRH] verifyOtp result:', error ? 'ERROR' : 'OK', 'session:', !!data?.session);

        if (!error && data.session) {
          useAuthStore.getState().setRecovering(true);
          window.history.replaceState(null, '', window.location.pathname);
          console.log('[RRH] hash limpo via replaceState (verifyOtp path)');
        }

        return;
      }

      if (accessToken && refreshToken) {
        console.log('[RRH] → chamando setSession() (access_token path)...');
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        console.log('[RRH] setSession result:', error ? 'ERROR: ' + error.message : 'OK');

        if (!error) {
          useAuthStore.getState().setRecovering(true);
          window.history.replaceState(null, '', window.location.pathname);
          console.log('[RRH] hash limpo via replaceState (setSession path)');
        }
        return;
      }

      console.log('[RRH] NENHUM token encontrado no hash ou search. Pulando recuperação manual.');
    };

    const init = async () => {
      console.log('[LOG 6a] useEffect — INÍCIO de init()');
      console.log('[LOG 6a] hash:', window.location.hash);
      console.log('[LOG 6a] search:', window.location.search);
      console.log('[LOG 6a]  → chamando runRecoveryHandling()...');
      await runRecoveryHandling();
      console.log('[LOG 6b]  → runRecoveryHandling() COMPLETOU');
      console.log('[LOG 6b] hash:', window.location.hash);
      console.log('[LOG 6b] search:', window.location.search);
      console.log('[LOG 6c]  → chamando initialize() (authStore)...');
      await initialize();
      console.log('[LOG 6d]  → initialize() (authStore) COMPLETOU');
      console.log('[LOG 6d] hash:', window.location.hash);
      console.log('[LOG 6d] search:', window.location.search);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH EVENT]', event, 'path:', window.location.pathname, 'session:', !!session?.user);
      const isResetPasswordRoute = window.location.pathname === '/auth/reset-password';

      if (event === 'PASSWORD_RECOVERY') {
        useAuthStore.getState().setRecovering(true);
        return;
      }

      if (event === 'SIGNED_OUT') {
        useAuthStore.getState().logoutFromEvent();
        return;
      }

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        if (isResetPasswordRoute) {
          return;
        }
        useAuthStore.getState().setRecovering(false);
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
