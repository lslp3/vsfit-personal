/**
 * TEMPORÁRIO — Diagnóstico do retorno do file picker no Capacitor.
 * Esses logs provam se o WebView recarrega a página (novo documento) ou se
 * apenas o componente React remonta. NÃO COMMITAR — remover ao final.
 *
 * DISCRIMINADORES:
 * - window.__VSDIAG_DOC.id  : muda quando o WebView recarrega (novo documento);
 *                             permanece se for apenas remount do React.
 * - performance.timeOrigin  : muda a cada navegação/reload completo da página.
 * - contador localInstance  : module-scoped → zera em reload (volta a 1);
 *                             vai subindo se for só remount (mesmo documento).
 *
 * Prefixo de todos os logs: [CHAT-DIAG]  → filtro fácil no logcat.
 */

type DiagWindow = Window & {
  __VSDIAG_DOC?: { id: string; firstTimeOrigin: number; docInstance: number };
};

let localInstance = 0;
let listenersHooked = false;

export function diagChatSession() {
  const w = window as DiagWindow;
  if (!w.__VSDIAG_DOC) {
    w.__VSDIAG_DOC = {
      id: crypto.randomUUID(),
      firstTimeOrigin: performance.timeOrigin,
      docInstance: 0,
    };
  }
  return w.__VSDIAG_DOC;
}

export function diagChatMount(tag: string, ...extra: unknown[]) {
  localInstance += 1;
  const sess = diagChatSession();
  sess.docInstance += 1;
  console.log(
    '[CHAT-DIAG] MOUNT',
    tag,
    '| localInstance=',
    localInstance,
    '| docId=',
    sess.id,
    '| docInstance=',
    sess.docInstance,
    '| timeOrigin=',
    performance.timeOrigin,
    '| msSinceDocLoad=',
    Math.round(performance.now()),
    ...extra
  );
  return localInstance;
}

export function diagChatUnmount(tag: string, localInstanceAtMount: number) {
  console.log('[CHAT-DIAG] UNMOUNT', tag, '| localInstance=', localInstanceAtMount);
}

export function diagChatLog(tag: string, ...args: unknown[]) {
  console.log('[CHAT-DIAG]', tag, '| docId=', diagChatSession().id, ...args);
}

/** Registra ouvintes globais UMA vez (appStateChange, pageshow, ...). */
export function diagChatInit(eventScope: unknown) {
  if (listenersHooked) return;
  listenersHooked = true;

  const log = (label: string, ...extra: unknown[]) => {
    const sess = diagChatSession();
    console.log(
      '[CHAT-DIAG][EVENT]',
      label,
      '| docId=',
      sess.id,
      '| timeOrigin=',
      performance.timeOrigin,
      '| ms=',
      Math.round(performance.now()),
      ...extra
    );
  };

  log('listeners-registered (fresh doc load)');

  window.addEventListener('pageshow', (e) => log('pageshow persisted=' + e.persisted));
  window.addEventListener('pagehide', () => log('pagehide'));
  window.addEventListener('visibilitychange', () =>
    log('visibilitychange=' + document.visibilityState)
  );

  // appStateChange só existe em plataforma nativa (Capacitor). Em web, vira NO-OP.
  try {
    // Evita import estático para não inflar chunk; ~/prefixo de identificação no log envolve eventScope.
    void eventScope;
    // @capacitor/core carregado dinamicamente abaixo.
    import('@capacitor/core')
      .then(({ Capacitor }) => {
        if (!Capacitor.isNativePlatform()) {
          log('capacitor=web (appStateChange indisponível)');
          return;
        }
        log('capacitor=listening appStateChange');
        // Cast p/ contornar overload de tipagem do @capacitor/core (código descartável).
        (Capacitor as unknown as {
          addListener: (
            eventName: string,
            cb: (s: { isActive: boolean }) => void
          ) => unknown;
        }).addListener('appStateChange', (s: { isActive: boolean }) => {
          log('capacitor appStateChange isActive=' + s.isActive);
        });
      })
      .catch((err) => log('capacitor-import-fail', String(err)));
  } catch (err) {
    log('capacitor-init-fail', String(err));
  }
}