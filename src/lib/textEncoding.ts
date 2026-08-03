/**
 * Correção de encoding de texto legado (mojibake latin-1 → utf-8).
 * Consolidado na Sprint 10.1 — antes duplicado em NotificationsView.tsx
 * e StudentNotificationsPage.tsx.
 * Fonte canônica dos bytes: src/components/NotificationsView.tsx.
 */

export function fixTextEncoding(value?: string | null) {
  if (!value) return '';

  return String(value)
    .replace(/Ã¡/g, 'á')
    .replace(/Ã /g, 'à')
    .replace(/Ã¢/g, 'â')
    .replace(/Ã£/g, 'ã')
    .replace(/Ã©/g, 'é')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ã´/g, 'ô')
    .replace(/Ãµ/g, 'õ')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã§/g, 'ç')
    .replace(/Ã/g, 'Á')
    .replace(/Ã€/g, 'À')
    .replace(/Ã‚/g, 'Â')
    .replace(/Ãƒ/g, 'Ã')
    .replace(/Ã‰/g, 'É')
    .replace(/ÃŠ/g, 'Ê')
    .replace(/Ã/g, 'Í')
    .replace(/Ã“/g, 'Ó')
    .replace(/Ã”/g, 'Ô')
    .replace(/Ã•/g, 'Õ')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã‡/g, 'Ç');
}

export function cleanNotificationMessage(value?: string | null) {
  const text = fixTextEncoding(value || 'Sem descrição.');

  return text
    // Remove Log antigo
    .replace(/\s*Log:\s*[0-9a-f-]{20,}\.?/gi, '')

    // Remove datas ISO antigas completas
    .replace(/\s*Início:\s*\d{4}-\d{2}-\d{2}T[^\s.]+(?:\.\d+)?Z?\.?/gi, '')
    .replace(/\s*Inicio:\s*\d{4}-\d{2}-\d{2}T[^\s.]+(?:\.\d+)?Z?\.?/gi, '')
    .replace(/\s*Finalizado:\s*\d{4}-\d{2}-\d{2}T[^\s.]+(?:\.\d+)?Z?\.?/gi, '')

    // Remove qualquer resto de ISO que tenha sobrado
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/gi, '')

    // Corrige resto tipo: min.103Z
    .replace(/min\.\d+Z\.?/gi, 'min.')

    // Limpa espaços e pontuação sobrando
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\./g, '.')
    .trim();
}
