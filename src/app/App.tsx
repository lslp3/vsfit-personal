import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { useAuthStore } from '../store/authStore';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { supabase } from '../lib/supabase';

export function App() {
  const { isLoading, initialize } = useAuthStore();

  useEffect(() => {
    // ============================================================
    // FLUXO MANUAL DE RECUPERAÇÃO DE SENHA
    // detectSessionInUrl=false → o Supabase NÃO consumiu o hash.
    // Nós vamos ler manualmente e chamar setSession().
    // ============================================================

    const hash = window.location.hash;
    const query = window.location.search;

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  DEBUG RECOVERY — CAPTURA MANUAL DO HASH');
    console.log('═══════════════════════════════════════════════════');
    console.log('URL COMPLETA:', window.location.href);
    console.log('HASH BRUTO:', hash);
    console.log('QUERY BRUTO:', query);

    // Parsear os parâmetros do hash
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');

    console.log('');
    console.log('--- PARÂMETROS DO HASH ---');
    console.log('access_token:', accessToken ? accessToken.slice(0, 30) + '...' : 'NÃO ENCONTRADO');
    console.log('refresh_token:', refreshToken ? refreshToken.slice(0, 30) + '...' : 'NÃO ENCONTRADO');
    console.log('type:', type || 'NÃO ENCONTRADO');
    console.log('error:', error || 'nenhum');
    console.log('error_description:', errorDescription || 'nenhum');
    console.log('');

    // Se houver erro no hash, logar e não prosseguir
    if (error) {
      console.error('⚠️  ERRO NO LINK DE RECOVERY:', error, errorDescription);
      console.log('═══════════════════════════════════════════════════');
    }

    const runRecoveryHandling = async () => {
      // Se tem access_token e refresh_token no hash, usar setSession
      if (accessToken && refreshToken) {
        console.log('→ Chamando supabase.auth.setSession() com os tokens do hash...');
        console.log('→ access_token (início):', accessToken.slice(0, 30) + '...');
        console.log('→ refresh_token (início):', refreshToken.slice(0, 30) + '...');

        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        console.log('');
        console.log('═══ RESULTADO DO setSession ═══');
        console.log('SUCESSO:', !!data?.session);
        console.log('session?.user:', data?.session?.user?.email || 'NULO');

        if (sessionError) {
          console.error('ERRO no setSession:', sessionError);
          console.error('ERRO message:', sessionError.message);
          console.error('ERRO status:', (sessionError as any)?.status);
        }

        if (data?.session) {
          console.log('access_token salvo (início):', data.session.access_token.slice(0, 30) + '...');
          console.log('refresh_token salvo (início):', data.session.refresh_token?.slice(0, 30) + '...');
          // Sinalizar que estamos em recovery
          useAuthStore.getState().setRecovering(true);
          // Limpar o hash da URL
          window.history.replaceState(null, '', window.location.pathname);
          console.log('→ Hash limpo via replaceState');
        }

        console.log('═══════════════════════════════════════════════════');
        console.log('');
        return;
      }

      console.log('→ NENHUM access_token+refresh_token no hash. Tentando getSession()...');

      // Fallback: verificar se já existe sessão no localStorage
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        console.log('→ Sessão encontrada via getSession()');
        console.log('→ user:', data.session.user.email);
        useAuthStore.getState().setRecovering(true);
      } else {
        console.log('→ Nenhuma sessão encontrada. O link pode ser inválido.');
      }

      console.log('═══════════════════════════════════════════════════');
      console.log('');
    };

    const init = async () => {
      console.log('→ Iniciando fluxo de recovery manual...');
      await runRecoveryHandling();

      console.log('→ Chamando initialize() do authStore...');
      await initialize();
      console.log('→ initialize() COMPLETOU');
      console.log('');
    };

    init();

    // Monitorar eventos de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AUTH EVENT] ${event} — user: ${session?.user?.email || 'none'}`);
      console.log(`[AUTH EVENT] path: ${window.location.pathname}`);

      if (event === 'PASSWORD_RECOVERY') {
        console.log('🎯 EVENTO PASSWORD_RECOVERY RECEBIDO!');
        useAuthStore.getState().setRecovering(true);
        return;
      }

      if (event === 'SIGNED_IN') {
        console.log('🎯 EVENTO SIGNED_IN RECEBIDO!');
        if (window.location.pathname === '/auth/reset-password') {
          console.log('→ Estamos na página de reset, ignorando SIGNED_IN (deixar PASSWORD_RECOVERY lidar)');
          return;
        }
        useAuthStore.getState().setRecovering(false);
        void useAuthStore.getState().initialize();
      }

      if (event === 'SIGNED_OUT') {
        console.log('🚪 EVENTO SIGNED_OUT');
        useAuthStore.getState().logoutFromEvent();
      }
    });

    return () => subscription?.unsubscribe();
  }, [initialize]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <RouterProvider router={router} />;
}