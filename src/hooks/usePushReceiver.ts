import { useEffect, useRef, useState } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import {
  PushNotifications,
  type ActionPerformed,
  type PushNotification,
} from '@capacitor/push-notifications';

import { router } from '../app/routes';
import { useAuthStore } from '../store/authStore';

/**
 * Sprint 12 — ETAPA 6: recebimento de push e navegação por deep link.
 *
 * Ponto ÚNICO de tratamento de notificações recebidas:
 *  - Foreground (app aberto): não mostra a notificação padrão do sistema;
 *    registra um banner interno (PushBanner). Ao tocar → navega.
 *  - Background / terminated (toque na notificação do Android): abre o app e
 *    navega automaticamente para a rota do payload.
 *
 * Toda a navegação usa EXCLUSIVAMENTE o payload recebido (route + event_type
 * + ids) — sem lógica duplicada. No web/Preview o hook é no-op (push nativo
 * não existe fora do Android).
 */

export interface ReceivedPush {
  title: string;
  body: string;
  route: string;
  event_type?: string;
}

type Role = 'personal' | 'student' | 'admin' | undefined;

/** Resolve a rota genérica do payload para a rota real do papel logado. */
function resolveRoute(genericRoute: string | undefined, role: Role): string {
  const base = genericRoute || '/';

  if (role === 'student') {
    return base.startsWith('/') ? `/student${base}` : `/student/${base}`;
  }

  if (role === 'personal') {
    return base.startsWith('/') ? `/personal${base}` : `/personal/${base}`;
  }

  // admin / sem papel: usa a rota como veio (fallback).
  return base;
}

function extractPayload(notification: PushNotification): {
  event_type?: string;
  route?: string;
} {
  const data = notification.data ?? ({} as Record<string, string>);
  return {
    event_type: data.event_type ?? undefined,
    route: data.route ?? undefined,
  };
}

export function usePushReceiver() {
  const [activePush, setActivePush] = useState<ReceivedPush | null>(null);
  const dimissTimer = useRef<number | null>(null);

  const isNative = Capacitor.isNativePlatform();

  const clearDismissTimer = () => {
    if (dimissTimer.current !== null) {
      window.clearTimeout(dimissTimer.current);
      dimissTimer.current = null;
    }
  };

  useEffect(() => {
    if (!isNative) return;

    let active = true;
    let receivedListener: PluginListenerHandle | null = null;
    let actionListener: PluginListenerHandle | null = null;

    const navigateByPayload = (payload: { route?: string; event_type?: string }) => {
      // Cold start (terminated): o perfil pode ainda não ter carregado quando
      // o evento de toque dispara — aguarda o papel ficar disponível.
      const tryNavigate = (attempt = 0) => {
        const role = useAuthStore.getState().profile?.role;

        if (!role && attempt < 12) {
          window.setTimeout(() => tryNavigate(attempt + 1), 150);
          return;
        }

        const resolved = resolveRoute(payload.route, role);
        void router.navigate(resolved);
      };

      tryNavigate();
    };

    // Foreground: app aberto — registra banner interno (sem notificação do
    // sistema). Tocar no banner navega para a mesma rota do payload.
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      if (!active) return;

      const payload = extractPayload(notification);
      const role = useAuthStore.getState().profile?.role;

      clearDismissTimer();

      setActivePush({
        title: notification.title ?? 'Notificação',
        body: notification.body ?? '',
        route: resolveRoute(payload.route, role),
        event_type: payload.event_type,
      });

      dimissTimer.current = window.setTimeout(() => {
        if (active) setActivePush(null);
      }, 5000);
    }).then((handle) => {
      receivedListener = handle;
    });

    // Background / terminated: toque na notificação → abre e navega.
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      if (!active) return;
      navigateByPayload(extractPayload(action.notification));
    }).then((handle) => {
      actionListener = handle;
    });

    return () => {
      active = false;
      clearDismissTimer();
      // Evita listeners duplicados / vazamento de memória em remounts.
      receivedListener?.remove();
      actionListener?.remove();
    };
  }, [isNative]);

  const navigateFromPush = (push: ReceivedPush) => {
    setActivePush(null);
    void router.navigate(push.route);
  };

  const dismissPush = () => {
    setActivePush(null);
  };

  return {
    activePush,
    navigateFromPush,
    dismissPush,
  };
}