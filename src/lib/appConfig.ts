// ============================================================================
// VSFit Personal — Configuração pública do app
// ----------------------------------------------------------------------------
// URL pública de produção do VSFit Personal (landing + páginas /signup/:slug).
//
// NUNCA derivar links públicos de `window.location.origin`: no APK o WebView
// do Capacitor serve o app como `https://localhost` (androidScheme: 'https'
// em capacitor.config.ts) e todo link montado a partir do origin vira um link
// quebrado. A base pública é uma constante única, com override opcional via
// VITE_PUBLIC_URL (ex.: previews controlados). Sem override, o valor padrão é
// o domínio de produção.
// ============================================================================

const envPublicUrl = import.meta.env?.VITE_PUBLIC_URL;

/** Base pública do app (produção por padrão). */
export const PUBLIC_APP_URL: string =
  envPublicUrl || 'https://vsfit-personal.vercel.app';

/**
 * Monta o link público de captura: `${PUBLIC_APP_URL}/signup/${slug}`.
 * O slug é preservado intacto (apenas barras iniciais acidentais são limpas).
 */
export function getPublicSignupUrl(slug: string): string {
  const normalized = slug.replace(/^\/+/, '');
  return `${PUBLIC_APP_URL}/signup/${normalized}`;
}
