import { createClient } from '@supabase/supabase-js';

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

export const supabase = createClient(supabaseUrl, supabaseKey);
