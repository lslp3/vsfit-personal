// ============================================================================
// VSFit Personal — Testes unitários da GERAÇÃO DO LINK PÚBLICO DE CAPTURA
// ----------------------------------------------------------------------------
// Cobre o bug do APK: os links eram montados com `window.location.origin`,
// que no WebView do Capacitor (androidScheme: 'https') é "https://localhost"
// — gerando "https://localhost/signup/{slug}" (link quebrado). A base pública
// agora é uma constante centralizada (src/lib/appConfig.ts) que NUNCA depende
// do origin do WebView/navegador.
//
// Cenários (pedido do usuário):
//   1. slug "veronica-personal" → https://vsfit-personal.vercel.app/signup/veronica-personal
//   2. slug "laercio-personal"  → https://vsfit-personal.vercel.app/signup/laercio-personal
//   3. nenhum link gerado contém "localhost"
//   4. slug preservado intacto na URL
//   5. base pública é o domínio de produção (sem override de env)
//
// Execução: `npm test` (node --test, Node type stripping, zero dependências).
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PUBLIC_APP_URL,
  getPublicSignupUrl,
} from '../../src/lib/appConfig.ts';

const EXPECTED_BASE = 'https://vsfit-personal.vercel.app';

// ---------------------------------------------------------------------------
// 5. Base pública é a URL de produção (nunca o origin do WebView)
// ---------------------------------------------------------------------------

test('PUBLIC_APP_URL é o domínio público de produção', () => {
  assert.equal(PUBLIC_APP_URL, EXPECTED_BASE);
  assert.ok(!PUBLIC_APP_URL.includes('localhost'));
});

// ---------------------------------------------------------------------------
// 1. e 2. Links gerados para os slugs exigidos
// ---------------------------------------------------------------------------

test('link de captura do slug "veronica-personal"', () => {
  assert.equal(
    getPublicSignupUrl('veronica-personal'),
    'https://vsfit-personal.vercel.app/signup/veronica-personal'
  );
});

test('link de captura do slug "laercio-personal"', () => {
  assert.equal(
    getPublicSignupUrl('laercio-personal'),
    'https://vsfit-personal.vercel.app/signup/laercio-personal'
  );
});

// ---------------------------------------------------------------------------
// 3. Nenhum link gerado contém "localhost"
// ---------------------------------------------------------------------------

test('nenhum link gerado contém "localhost"', () => {
  for (const slug of ['veronica-personal', 'laercio-personal', 'a', 'x-y-z']) {
    const url = getPublicSignupUrl(slug);
    assert.ok(!url.includes('localhost'), `"${url}" não pode conter localhost`);
    assert.ok(url.startsWith(`${EXPECTED_BASE}/signup/`), `"${url}" usa a base pública`);
  }
});

// ---------------------------------------------------------------------------
// 4. Slug preservado intacto
// ---------------------------------------------------------------------------

test('slug é preservado intacto na URL gerada', () => {
  for (const slug of ['veronica-personal', 'laercio-personal']) {
    const url = getPublicSignupUrl(slug);
    assert.equal(url.split('/signup/')[1], slug, `slug "${slug}" preservado`);
  }
});

test('slug com barra inicial acidental é normalizada sem corromper o slug', () => {
  assert.equal(
    getPublicSignupUrl('/veronica-personal'),
    'https://vsfit-personal.vercel.app/signup/veronica-personal'
  );
});
