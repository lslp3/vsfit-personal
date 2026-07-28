import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function getAppBaseUrl() {
  const envUrl = import.meta.env.VITE_AUTH_REDIRECT_URL;
  if (envUrl) return envUrl;
  // Usa o domínio atual do navegador (funciona em produção e preview)
  return window.location.origin;
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

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    detectSessionInUrl: false,
  },
});