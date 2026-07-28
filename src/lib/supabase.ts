import { createClient } from '@supabase/supabase-js';

// █ LOG 1 — Primeiríssimo momento possível (avaliação do módulo)
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

// █ LOG 2 — ANTES de createClient()
console.log('[LOG 2] supabase.ts — ANTES de createClient()');
console.log('[LOG 2] href:  ', window.location.href);
console.log('[LOG 2] hash:  ', window.location.hash);
console.log('[LOG 2] search:', window.location.search);

// ★ detectSessionInUrl: false → Supabase NÃO consome o hash automaticamente
// Vamos ler o hash manualmente em App.tsx
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    detectSessionInUrl: false,
  },
});

// █ LOG 3 — APÓS createClient()
console.log('[LOG 3] supabase.ts — APÓS createClient() (detectSessionInUrl=false)');
console.log('[LOG 3] href:  ', window.location.href);
console.log('[LOG 3] hash:  ', window.location.hash);
console.log('[LOG 3] search:', window.location.search);