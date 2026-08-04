import { create } from 'zustand';

/**
 * Sprint 13 — Chat Media (Correção A): estado de mídia FORA da árvore React.
 *
 * Contexto: o ChatPage/useChatMedia pode ser desmontado e remontado pelo
 * fluxo de auth (App.tsx alterna <RouterProvider/> ↔ <LoadingScreen/> via
 * isLoading). Como o documento NÃO recarrega nesse fluxo (docId/timeOrigin
 * iguais), um store module-singleton (Zustand) SOBREVIVE ao remount: o File
 * selecionado, a preview e a legenda continuam disponíveis após o remount.
 *
 * Regras de ciclo de vida:
 * - resetMedia() limpa o anexo (mantém caption);
 * - a objectURL é revogada em selectFile (novo arquivo) e clear (envio),
 *   NUNCA no unmount do hook — revogar no unmount mataria o preview no
 *   remount;
 * - o store é module-scoped: um reload completo de página zera tudo.
 */

export interface ChatMediaState {
  selectedFile: File | null;
  previewUrl: string | null;
  mime: string;
  mediaSize: number;
  extension: string;
  caption: string;
  validationError: string | null;

  setSelectedFile: (file: File | null) => void;
  setPreviewUrl: (url: string | null) => void;
  setMime: (mime: string) => void;
  setMediaSize: (size: number) => void;
  setExtension: (ext: string) => void;
  setCaption: (caption: string) => void;
  setValidationError: (error: string | null) => void;

  /** Limpa o anexo e erros de validação (mantém caption). */
  resetMedia: () => void;
}

export const useChatMediaStore = create<ChatMediaState>((set) => ({
  selectedFile: null,
  previewUrl: null,
  mime: '',
  mediaSize: 0,
  extension: '',
  caption: '',
  validationError: null,

  setSelectedFile: (file) => set({ selectedFile: file }),
  setPreviewUrl: (url) => set({ previewUrl: url }),
  setMime: (mime) => set({ mime }),
  setMediaSize: (size) => set({ mediaSize: size }),
  setExtension: (ext) => set({ extension: ext }),
  setCaption: (caption) => set({ caption }),
  setValidationError: (error) => set({ validationError: error }),

  resetMedia: () =>
    set({
      selectedFile: null,
      previewUrl: null,
      mime: '',
      mediaSize: 0,
      extension: '',
      validationError: null,
    }),
}));
