import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './index.css';

// █ LOG 4 — main.tsx — corpo do módulo executado
// Neste ponto supabase.ts já foi avaliado (importado via App), createClient() já rodou.
// O _initialize() do Supabase já está em andamento (assíncrono).
console.log('[LOG 4] main.tsx — CORPO DO MÓDULO (antes de createRoot)');
console.log('[LOG 4] href:  ', window.location.href);
console.log('[LOG 4] hash:  ', window.location.hash);
console.log('[LOG 4] search:', window.location.search);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
