import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function getAppBaseUrl() {
  const configuredUrl = import.meta.env.VITE_SITE_URL || import.meta.env.VITE_APP_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return '';
}

export function getAuthRedirectUrl(path = '/auth/reset-password') {
  const baseUrl = getAppBaseUrl();

  if (!baseUrl) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${baseUrl}${normalizedPath}`;
}

export const supabase = createClient(supabaseUrl, supabaseKey);
