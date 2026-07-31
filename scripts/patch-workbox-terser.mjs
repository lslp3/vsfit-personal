/**
 * Reaplica o patch do workbox-build que força maxWorkers: 1 no
 * @rollup/plugin-terser durante a geração do Service Worker.
 *
 * MOTIVO: no Termux (Android arm64), o pool multi-worker do
 * @rollup/plugin-terser trava indefinidamente (7 workers simultâneos
 * esgotam recursos da plataforma). Com maxWorkers: 1 o minify roda
 * normalmente (verificado: ~5s para 1MB).
 *
 * O npm install / npm ci recria node_modules e apaga este patch —
 * rode este script de novo nesses casos. O CI (linux x64) NÃO precisa
 * do patch (workers funcionam normalmente lá).
 *
 * Uso: node scripts/patch-workbox-terser.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = path.join(__dirname, '..', 'node_modules', 'workbox-build', 'build', 'lib', 'bundle.js');

const MARKER = 'maxWorkers: 1,';
const TARGET = `plugins.push((0, plugin_terser_1.default)({`;
const PATCHED = `plugins.push((0, plugin_terser_1.default)({\n            maxWorkers: 1,`;

if (!fs.existsSync(bundlePath)) {
  console.error(`[patch] NAO ENCONTRADO: ${bundlePath}`);
  console.error('[patch] Rode `npm ci`/`npm install` antes deste script.');
  process.exit(1);
}

const source = fs.readFileSync(bundlePath, 'utf8');

if (source.includes(MARKER)) {
  console.log('[patch] maxWorkers: 1 ja presente — nada a fazer (idempotente).');
  process.exit(0);
}

if (!source.includes(TARGET)) {
  console.error('[patch] Ponto de insercao nao encontrado no bundle.js.');
  console.error('[patch] Versao do workbox-build mudou? Abortando sem alterar nada.');
  process.exit(1);
}

const patched = source.replace(TARGET, PATCHED);
fs.writeFileSync(bundlePath, patched);
console.log('[patch] OK — maxWorkers: 1 inserido em workbox-build/build/lib/bundle.js');
