import { Capacitor, registerPlugin } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface InsetsPluginApi {
  getInsets(): Promise<SafeAreaInsets>;
  addListener(
    eventName: 'insetsChange',
    listener: (data: SafeAreaInsets) => void,
  ): Promise<{ remove: () => void }>;
}

/** Proxy oficial do plugin nativo `InsetsPlugin` (registerPlugin do Capacitor). */
const Insets = registerPlugin<InsetsPluginApi>('Insets');

const INSET_CSS_VARS: Array<{ var: string; key: keyof SafeAreaInsets }> = [
  { var: '--safe-area-inset-top', key: 'top' },
  { var: '--safe-area-inset-bottom', key: 'bottom' },
  { var: '--safe-area-inset-left', key: 'left' },
  { var: '--safe-area-inset-right', key: 'right' },
];

function apply(insets: SafeAreaInsets): void {
  const style = document.documentElement.style;
  for (const { var: cssVar, key } of INSET_CSS_VARS) {
    style.setProperty(cssVar, `${insets[key]}px`);
  }
}

/**
 * Bootstrap único de safe-area para todo o app.
 *
 * - Executa APENAS em device nativo (`Capacitor.isNativePlatform()`).
 *   Na web / Desktop / Vercel não faz nada: por lá as variáveis
 *   `--safe-area-inset-*` permanecem sem definição e o CSS usa o fallback
 *   `env(safe-area-inset-*)` (ou 0), exatamente como hoje.
 * - Em nativo, obtém os valores reais das WindowInsets do Android pelo plugin
 *   `InsetsPlugin` (APIs AndroidX oficiais — sem heurística, sem valores
 *   fixos) e os popula em `:root`. Todas as telas já consomem essas variáveis,
 *   portanto passam a respeitar a área segura automaticamente.
 * - Assina `insetsChange` para reagir a rotação, teclado, gestos, cutout e
 *   mudança de configuração.
 * - Ajusta também o estilo da status bar (ícones claros sobre o fundo-dark).
 */
export function initSafeArea(): void {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  void StatusBar.setStyle({ style: Style.Dark }).catch(() => {
    // StatusBar pode não estar disponível no web preview; sem erro em runtime.
  });

  void Insets.getInsets()
    .then(apply)
    .catch(() => {
      // Fallback intencional: plugin nativo indisponível (bridge não registrada)
      // → mantém só o fallback do CSS; nenhum valor é inventado.
    });

  void Insets.addListener('insetsChange', apply).catch(() => {
    // Sem listener → o getInsets() inicial já popular as variáveis.
  });
}