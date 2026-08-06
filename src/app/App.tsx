import { useEffect, useRef, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { useAuthStore } from '../store/authStore';
import { SmartSplashScreen } from '../components/ui/SmartSplashScreen';
import { OfflineScreen } from '../components/ui/OfflineScreen';
import { OnboardingFlow } from '../components/onboarding/OnboardingFlow';
import { useOnboardingStore } from '../store/onboardingStore';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { usePushReceiver } from '../hooks/usePushReceiver';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { PushBanner } from '../components/ui/PushBanner';

// Sprint 17 · ETAPA 2 — tempo mínimo de exposição da Splash (1–2s).
const SPLASH_MIN_MS = 1500;

export function App() {
  const { isLoading, isAuthenticated, initialize } = useAuthStore();
  const { online } = useOnlineStatus();

  // Sprint 17 · ETAPA 8 — Fase B: Recuperação automática ao reconectar.
  // Quando o dispositivo fica online de novo (transição offline→online,
  // NÃO no mount), se ainda não há sessão autenticada, re-incializa o auth
  // de forma leve — sem apagar sessão existente, sem chamar logout e sem
  // causar flicker de splash (o efeito só age na transição, e só quando já
  // não está carregando e não está autenticado).
  const prevOnline = useRef(online);
  useEffect(() => {
    const wasOffline = prevOnline.current === false && online === true;
    prevOnline.current = online;
    if (!wasOffline) return;

    const state = useAuthStore.getState();
    if (!state.isLoading && !state.isAuthenticated) {
      void state.initialize();
    }
  }, [online]);

  // Sprint 17 · ETAPA 4 — primeiro acesso: só usuários NÃO autenticados e
  // com onboarding pendente veem o fluxo. Existentes/autenticados seguem
  // direto (comportamento inalterado).
  const {
    onboardingDone,
    markOnboardingDone,
    chooseRole,
  } = useOnboardingStore();

  // Garante que a Splash fique visível pelo menos ~1.5s mesmo quando a
  // inicialização da sessão termina antes (ex.: sessão rápida restaurada).
  const [splashElapsed, setSplashElapsed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSplashElapsed(true), SPLASH_MIN_MS);
    return () => window.clearTimeout(timer);
  }, []);

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

  // Sprint 17 · ETAPA 2 — Splash Screen Inteligente: exibida durante a
  // verificação da sessão (e por um tempo mínimo de exposição). Ela apenas
  // decide/prepara o próximo destino — onboarding e escolha de perfil são
  // implementados nas próximas etapas.
  if (isLoading || !splashElapsed) {
    return (
      <SmartSplashScreen online={online} />
    );
  }

  // Sprint 17 · ETAPA 4 → ETAPA 7 — Onboarding Inicial. Restaurado como
  // Landing pública na raiz:
  // - WEB (Vercel): "/" é a Landing pública (chega no router →
  //   AuthAwareLandingPage → LandingPage). O OnboardingFlow só é acionado
  //   quando o visitante entra no fluxo do aplicativo (login/cadastro).
  //   Recovery (/auth/reset-password, forgot-password) e convites públicos
  //   (/signup/*) sempre abrem direto — nunca interceptados.
  // - NATIVO (Capacitor/APK): comportamento Sprint 17 inalterado — "/" de um
  //   primeiro acesso entra direto no OnboardingFlow.
  const isNative = Capacitor.isNativePlatform();
  const isAuthPath = window.location.pathname.startsWith('/auth');
  const isSignupPath = window.location.pathname.startsWith('/signup');
  const isAppEntry =
    window.location.pathname === '/auth/login' ||
    window.location.pathname === '/auth/register' ||
    window.location.pathname === '/auth/student-login';
  const isRecoveryPath =
    window.location.pathname.startsWith('/auth/reset-password') ||
    window.location.pathname.startsWith('/auth/forgot-password');

  const shouldShowOnboarding =
    !isAuthenticated && !onboardingDone &&
    (isNative ? !isAuthPath && !isSignupPath : isAppEntry && !isRecoveryPath);

  if (shouldShowOnboarding) {
    return (
      <OnboardingFlow
        onSelectRole={(role) => {
          chooseRole(role);
          markOnboardingDone();
        }}
      />
    );
  }

  // Sprint 17 · ETAPA 8 — Fase A: Gate Offline Global. Quando o dispositivo
  // está sem conexão, mostra a tela offline no lugar de qualquer rota
  // (inclusive /auth e /signup — ambos exigem rede), sem chamar logout e
  // preservando a sessão existente. Ao reconectar, `online` volta a true e o
  // fluxo normal (splash → sessão → onboarding → router) é restaurado
  // automaticamente.
  if (!online) {
    return <OfflineScreen />;
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