/**
 * Otimiza imagens grandes do projeto VSFit Personal (FASE 2 — item 13).
 *
 * Engine: jimp (100% JS, sem binário nativo) — roda no Termux/Android arm64,
 * onde o sharp nao publica prebuilds (causa raiz documentada na FASE 2).
 *
 * - src/assets/brand/vsfit-logo.png  → redimensiona para 512px (logo bundled)
 * - public/favicon.png               → redimensiona para 64px
 * - public/apple-touch-icon.png      → redimensiona para 180px
 * - public/images/workout-card-muscle.png → redimensiona para 1200px
 * - public/screenshots/*.jpg         → recompressão JPEG q72 (mantém dimensões)
 *
 * Uso: node scripts/optimize-images.mjs
 * Reversível via git (os originais estão versionados).
 */
import { readdirSync, statSync, renameSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Jimp from 'jimp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Redimensiona (fit inside, sem enlarging) e/ou recompacta uma imagem.
 * Mantém o mesmo caminho: escreve em <arquivo>.tmp e renomeia por cima.
 */
async function optimizeFile(filePath, { maxWidth, maxHeight, jpegQuality }) {
  const before = statSync(filePath).size;
  const tmpPath = `${filePath}.tmp`;

  const img = await Jimp.read(filePath);

  // fit 'inside' + withoutEnlargement (equivalente ao sharp)
  if (maxWidth || maxHeight) {
    const w = img.getWidth();
    const h = img.getHeight();
    const scale = Math.min(
      maxWidth ? maxWidth / w : Infinity,
      maxHeight ? maxHeight / h : Infinity,
      1
    );
    if (scale < 1) {
      img.resize(
        Math.max(1, Math.round(w * scale)),
        Math.max(1, Math.round(h * scale)),
        Jimp.RESIZE_BICUBIC
      );
    }
  }

  if (jpegQuality) {
    img.quality(jpegQuality);
  }

  const mime = jpegQuality ? Jimp.MIME_JPEG : Jimp.MIME_PNG;
  const buf = await img.getBufferAsync(mime);
  writeFileSync(tmpPath, buf);
  renameSync(tmpPath, filePath);

  const after = statSync(filePath).size;
  console.log(
    `  ${filePath.replace(ROOT + '/', '')}: ${formatBytes(before)} -> ${formatBytes(after)}`
  );
}

function existsSyncSafe(p) {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('=== Otimizando imagens ===');

  const targets = [
    { path: join(ROOT, 'src/assets/brand/vsfit-logo.png'), maxWidth: 512, maxHeight: 512 },
    { path: join(ROOT, 'public/favicon.png'), maxWidth: 64, maxHeight: 64 },
    { path: join(ROOT, 'public/apple-touch-icon.png'), maxWidth: 180, maxHeight: 180 },
    { path: join(ROOT, 'public/images/workout-card-muscle.png'), maxWidth: 1200, maxHeight: 1200 },
  ];

  for (const target of targets) {
    if (!existsSyncSafe(target.path)) {
      console.log(`  (pulando, nao existe: ${target.path.replace(ROOT + '/', '')})`);
      continue;
    }
    await optimizeFile(target.path, target);
  }

  const screenshotsDir = join(ROOT, 'public/screenshots');
  if (!existsSyncSafe(screenshotsDir)) {
    console.log(`\n  (pulando, pasta nao existe: public/screenshots)`);
  } else {
    const jpgs = readdirSync(screenshotsDir).filter((f) => f.endsWith('.jpg'));
    console.log(`\n=== Screenshots (${jpgs.length}) ===`);
    for (const f of jpgs) {
      await optimizeFile(join(screenshotsDir, f), { jpegQuality: 72 });
    }
  }

  console.log('\n=== Concluido ===');
}

main().catch((err) => {
  console.error('Falha na otimizacao:', err);
  process.exit(1);
});
