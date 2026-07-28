import { createClient } from '@supabase/supabase-js';

// █ LOG 1 — Primeiríssimo momento possível (avaliação do módulo)
// Antes de qualquer lógica de auth. O supabase.ts é o PRIMEIRO módulo avaliado.
console.log('[LOG 1] supabase.ts — INÍCIO DO MÓDULO');
console.log('[LOG 1] href:  ', window.location.href);
console.log('[LOG 1] hash:  ', window.location.hash);
console.log('[LOG 1] search:', window.location.search);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function getAppBaseUrl() {
  // TEMP: usar domínio Preview da Vercel para testar fluxo de reset de senha
  return 'https://vsfit-personal-git-test-auth-fixes-lslp3s-projects.vercel.app';
}

export function getAuthRedirectUrl(path = '/auth/reset-password') {
  const baseUrl = getAppBaseUrl();

  if (!baseUrl) {
    return path;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  try {
    return new URL(path.startsWith('/') ? path : `/${path}`, baseUrl).toString();
  } catch {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
  }
}

// █ LOG 2 — IMEDIATAMENTE ANTES de createClient()
console.log('[LOG 2] supabase.ts — ANTES de createClient()');
console.log('[LOG 2] href:  ', window.location.href);
console.log('[LOG 2] hash:  ', window.location.hash);
console.log('[LOG 2] search:', window.location.search);

export const supabase = createClient(supabaseUrl, supabaseKey);

// █ LOG 3 — IMEDIATAMENTE APÓS createClient()
// O construtor chama this.initialize() → _initialize() de forma assíncrona.
// Este log captura ANTES do _initialize() completar (hash ainda deve estar presente).
console.log('[LOG 3] supabase.ts — APÓS createClient()');
console.log('[LOG 3] href:  ', window.location.href);
console.log('[LOG 3] hash:  ', window.location.hash);
console.log('[LOG 3] search:', window.location.search);

// █ MONITOR — rastreia o hash nos próximos ticks para ver QUANDO ele desaparece
// Se o Supabase _initialize() limpar window.location.hash, veremos aqui.
setTimeout(() => {
  console.log('[TIMER 0ms] APÓS createClient() + setTimeout(0)');
  console.log('[TIMER 0ms] hash:', window.location.hash);
}, 0);

setTimeout(() => {
  console.log('[TIMER 50ms] APÓS createClient() + setTimeout(50)');
  console.log('[TIMER 50ms] hash:', window.location.hash);
  console.log('[TIMER 50ms] session in localStorage:', !!window.localStorage.getItem('supabase.auth.token'));
}, 50);

setTimeout(() => {
  console.log('[TIMER 500ms] APÓS createClient() + setTimeout(500)');
  console.log('[TIMER 500ms] hash:', window.location.hash);
  console.log('[TIMER 500ms] session in localStorage:', !!window.localStorage.getItem('supabase.auth.token'));
}, 500);
