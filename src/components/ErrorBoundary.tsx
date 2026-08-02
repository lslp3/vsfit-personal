import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

import { isChunkLoadError } from '../utils/chunkReload';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] erro capturado:', error, info?.componentStack || '');
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isChunkError = isChunkLoadError(
        this.state.error
      );

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-6 text-center text-white">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-[#ff2a32]/25 bg-[#ff2a32]/15">
            <AlertTriangle className="h-9 w-9 text-[#ff2a32]" />
          </div>

          <h1 className="mt-5 text-xl font-black">Algo deu errado</h1>

          <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
            {isChunkError
              ? 'Uma nova versão da aplicação foi publicada. Recarregue para atualizar.'
              : 'Ocorreu um erro inesperado. Recarregue a aplicação ou tente novamente.'}
          </p>

          {this.state.error?.message && (
            <p className="mt-3 max-w-sm truncate rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-zinc-500">
              {this.state.error.message}
            </p>
          )}

          <button
            type="button"
            onClick={
              isChunkError
                ? () => window.location.reload()
                : this.handleReset
            }
            className="mt-6 flex h-12 items-center gap-2 rounded-2xl bg-[#ff2a32] px-6 text-sm font-black text-white active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            {isChunkError
              ? 'RECARREGAR'
              : 'TENTAR NOVAMENTE'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
