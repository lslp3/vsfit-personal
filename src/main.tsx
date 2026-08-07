import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { GlobalChatFileInput } from './components/chat/GlobalChatFileInput';
import { reloadForStaleChunk } from './utils/chunkReload';
import './index.css';
import { initSafeArea } from './lib/safeArea';

// Fallback global: se o navegador tentar importar um chunk de um deploy
// antigo (PWA) e ele não existir mais, recarrega a página uma vez.
window.addEventListener('error', (event) => {
  reloadForStaleChunk(event.error ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  reloadForStaleChunk(event.reason);
});

initSafeArea();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalChatFileInput />
    <App />
  </StrictMode>
);
