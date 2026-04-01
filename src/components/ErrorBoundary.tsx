import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LifeBuoy } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorCode = 'UNKNOWN';
      let errorMessage = this.state.error?.message || 'Ocurrió un error inesperado';

      // Error Catalog for common JavaScript/React errors
      const errorCatalog: Record<string, string> = {
        'reading \'map\'': 'ERR-MAP-UNDEFINED',
        'reading \'length\'': 'ERR-LENGTH-UNDEFINED',
        'reading \'forEach\'': 'ERR-ITERATION-FAILED',
        'is not a function': 'ERR-NOT-A-FUNCTION',
        'Cannot read properties of undefined': 'ERR-UNDEFINED-ACCESS',
        'Cannot read properties of null': 'ERR-NULL-ACCESS',
        'Network Error': 'ERR-NETWORK',
        'Failed to fetch': 'ERR-FETCH-FAILED',
        'quota exceeded': 'ERR-FS-QUOTA',
        'permission-denied': 'ERR-FS-PERMISSION',
        'not-found': 'ERR-FS-NOT-FOUND'
      };

      // Try to find a matching code in the catalog
      for (const [key, code] of Object.entries(errorCatalog)) {
        if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
          errorCode = code;
          break;
        }
      }

      // Try to parse JSON error from handleFirestoreError
      try {
        if (errorMessage.startsWith('{')) {
          const parsed = JSON.parse(errorMessage);
          errorCode = parsed.operationType ? `FS-${parsed.operationType.toUpperCase()}` : 'FS-ERROR';
          errorMessage = parsed.error || errorMessage;
          
          // Further refine Firestore errors if they are permission denied
          if (errorMessage.toLowerCase().includes('permission-denied')) {
            errorCode = `FS-${parsed.operationType.toUpperCase()}-DENIED`;
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto border border-orange-500/20">
              <AlertTriangle className="w-10 h-10 text-orange-500" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">¡Ups! Algo salió mal</h1>
              <p className="text-gray-400 text-sm">
                Estamos trabajando para arreglarlo. Por favor, repórtalo con soporte técnico.
              </p>
            </div>

            <div className="bg-black/40 rounded-2xl p-4 border border-white/5 text-left">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Código de Error</p>
              <p className="text-sm font-mono text-orange-500/80 break-all">{errorCode}</p>
              
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-4 mb-1">Detalle</p>
              <p className="text-xs text-gray-400 line-clamp-3">{errorMessage}</p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
              
              <a
                href="mailto:soporte@gymflow.com"
                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/10"
              >
                <LifeBuoy className="w-4 h-4" />
                Contactar Soporte
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
