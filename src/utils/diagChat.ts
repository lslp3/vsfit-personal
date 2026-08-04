/**
 * TEMPORÁRIO — Diagnóstico in-app do retorno do file picker no Capacitor.
 * Captura os eventos [CHAT-DIAG] e PERSISTE num buffer (localStorage), com
 * leitura/limpeza exposta em window. Usado apenas para investigar se o WebView
 * recarrega (novo documento) ou se há remount do React. NÃO COMMITAR na
 * entrega final — remover antes de fechar a Sprint 13.
 *
 * DISCRIMINADORES por evento:
 * - localInstance : contador module-scoped. Zera (volta a 1) num reload de
 *                   página; sobe (2,3,...) em remount React do mesmo documento.
 * - docId         : UUID da janela (window.__VSDIAG_DOC.id). Novo docId num
 *                   evento = novo documento = WebView recarregou.
 * - timeOrigin    : performance.timeOrigin. Muda a cada reload completo.
 * - msSinceDocLoad: performance.now() — pequeno logo após um reload.
 *
 * localStorage SOBREVIVE ao reload do WebView (mesmo origin), então o buffer
 * mostra eventos ANTES e DEPOIS da recriação — permitindo comparar os
 * marcadores e fechar o cenário.
 */

const LS_KEY = '__VSDIAG_LOG';
const LS_CAP = 300;

export interface DiagEntry {
  ts: number; // epoch ms
  iso: string; // ISO timestamp (legível no aparelho)
  ev: string; // evento
  tag?: string; // ChatPage | useChatMedia | capacitor | window
  localInstance?: number;
  docId?: string;
  timeOrigin?: number;
  msSinceDocLoad?: number;
  detail?: string;
}

type DiagWindow = Window & {
  __VSDIAG_DOC?: { id: string; firstTimeOrigin?: number; docInstance: number };
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

function readLogs(): DiagEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DiagEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function push(ev: string, fields: Partial<DiagEntry> = {}) {
  const sess = diagChatSession();
  const entry: DiagEntry = {
    ts: Date.now(),
    iso: new Date().toISOString(),
    ev,
    docId: sess.id,
    timeOrigin: performance.timeOrigin,
    msSinceDocLoad: Math.round(performance.now()),
    ...fields,
  };

  const arr = readLogs();
  arr.push(entry);
  if (arr.length > LS_CAP) {
    // Mantém só os últimos LS_CAP eventos.
    arr.splice(0, arr.length - LS_CAP);
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
  } catch {
    /* quota cheia: ignora (não deve derrubar o app) */
  }

  // Mantém o console.log como redundância (caso o logcat esteja legível).
  console.log('[CHAT-DIAG]', ev, JSON.stringify(fields));
}

export function diagChatMount(tag: string, ...extra: unknown[]) {
  localInstance += 1;
  const sess = diagChatSession();
  sess.docInstance += 1;
  push('MOUNT', {
    tag,
    localInstance,
    detail: extra.join(' '),
  });
  return localInstance;
}

export function diagChatUnmount(tag: string, localInstanceAtMount: number) {
  push('UNMOUNT', { tag, localInstance: localInstanceAtMount });
}

export function diagChatLog(tag: string, ...args: unknown[]) {
  push('LOG', { tag, detail: args.join(' ') });
}

export function diagChatInit(_eventScope?: unknown) {
  // Expõe leitura/limpeza para o painel in-app (via window).
  const w = window as unknown as {
    __diagChatDump: () => DiagEntry[];
    __diagChatClear: () => void;
  };
  w.__diagChatDump = () =>
    readLogs()
      .slice()
      .reverse(); // mais recentes primeiro
  w.__diagChatClear = () => {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* noop */
    }
  };

  if (listenersHooked) return;
  listenersHooked = true;

  push('APP_READY', { tag: 'window' });

  window.addEventListener('pageshow', (ev) =>
    push('pageshow', { tag: 'window', detail: 'persisted=' + ev.persisted })
  );
  window.addEventListener('pagehide', () => push('pagehide', { tag: 'window' }));
  window.addEventListener('visibilitychange', () =>
    push('visibilitychange', { tag: 'window', detail: document.visibilityState })
  );

  // appStateChange só existe em plataforma nativa (Capacitor).
  try {
    import('@capacitor/core')
      .then(({ Capacitor }) => {
        if (!Capacitor.isNativePlatform()) {
          push('capacitor=web (appStateChange indisponível)', { tag: 'capacitor' });
          return;
        }
        push('capacitor=listening appStateChange', { tag: 'capacitor' });
        (Capacitor as unknown as {
          addListener: (
            eventName: string,
            cb: (s: { isActive: boolean }) => void
          ) => unknown;
        }).addListener('appStateChange', (s: { isActive: boolean }) => {
          push('appStateChange', {
            tag: 'capacitor',
            detail: 'isActive=' + s.isActive,
          });
        });
      })
      .catch((err) => push('capacitor-import-fail', { tag: 'capacitor', detail: String(err) }));
  } catch (err) {
    push('capacitor-init-fail', { tag: 'capacitor', detail: String(err) });
  }
}