import { useEffect, useState } from 'react';

/**
 * Detecta se o teclado (IME) está visível comparando a altura atual do
 * viewport com a altura "cheia" (linha de base). É a fonte de decisão do
 * padding inferior dos composers do Chat — NÃO usa foco do input, porque
 * no Android o foco não corresponde à visibilidade do teclado (o teclado
 * pode fechar mantendo o textarea focado).
 *
 * Como funciona (cobre os dois modelos de ajuste do WebView):
 * - adjustResize → o WebView encolhe e `visualViewport.height` /
 *   `window.innerHeight` caem bem abaixo da linha de base;
 * - adjustPan → `visualViewport.height` encolhe abaixo de `window.innerHeight`.
 * Em ambos, a PORCENTAGEM da altura visível despenca ao abrir o teclado.
 *
 * Linha de base = máximo de altura observado (estado "sem teclado"),
 * recalculado apenas na rotação de tela. Threshold evita falso positivo
 * de pequenas reconfigurações (barras/insets que mudam em alguns px).
 */
export function useKeyboardVisible(threshold = 100): boolean {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport ?? null;

    // Elemento-alvo dos eventos: o visualViewport quando existir, senão a janela.
    const target: EventTarget = viewport ?? window;

    // Altura "visível" atual sob qualquer modelo (resize ou pan).
    function currentHeight(): number {
      if (viewport && typeof viewport.height === 'number') {
        return viewport.height;
      }
      return window.innerHeight;
    }

    // Linha de base = maior altura vista (estado sem teclado). Nunca desce
    // sozinha, então não "esquece" que o teclado estava fechado.
    let baseline = currentHeight();

    function update(): void {
      const ref = currentHeight();
      if (ref > baseline) baseline = ref;
      const dropped = baseline - ref;
      setKeyboardVisible(dropped >= threshold);
    }

    function resetOnRotate(): void {
      baseline = currentHeight();
      update();
    }

    // Primeiro valor síncrono no mount (evita flash de estado errado).
    update();

    // `resize` no visualViewport cobre a abertura/fechamento do IME.
    target.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    // Limpa a linha de base em rotação (altura muda por motivo que não é IME).
    window.addEventListener('orientationchange', resetOnRotate);

    return () => {
      target.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', resetOnRotate);
    };
  }, [threshold]);

  return keyboardVisible;
}