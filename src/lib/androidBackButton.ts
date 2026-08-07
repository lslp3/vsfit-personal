import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * Botão físico "voltar" (Android) — integração oficial Capacitor 8 com o
 * histórico do React Router. Um ÚNICO listener global, registrado apenas em
 * plataforma nativa (na web/Desktop não existe botão físico).
 *
 * Comportamento:
 * - canGoBack === true  → window.history.back(): o React Router (data router
 *   com history API) reverte para a tela anterior (ex.: Chat → Dashboard).
 * - canGoBack === false → já está na tela inicial do app (sem histórico):
 *   fecha o aplicativo (App.exitApp()), comportamento padrão do Android.
 *
 * Nenhum hack, nenhuma navegação paralela: apenas o histórico do browser.
 */
export function initAndroidBackButton(): void {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  void App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      void App.exitApp();
    }
  });
}