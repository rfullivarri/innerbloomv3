import { Component, type ErrorInfo, type ReactNode } from 'react';

interface DevErrorBoundaryProps {
  children: ReactNode;
}

interface DevErrorBoundaryState {
  err?: unknown;
}

const extractMessage = (err: unknown) => {
  if (!err) {
    return 'Error desconocido';
  }

  if (err instanceof Error) {
    return err.stack ?? err.message;
  }

  return typeof err === 'string' ? err : JSON.stringify(err, null, 2);
};

export class DevErrorBoundary extends Component<DevErrorBoundaryProps, DevErrorBoundaryState> {
  state: DevErrorBoundaryState = { err: undefined };

  static getDerivedStateFromError(err: unknown): DevErrorBoundaryState {
    return { err };
  }

  componentDidCatch(err: unknown, info: ErrorInfo) {
    console.error('[ERRBOUNDARY]', { err, info });
  }

  private handleRetry = () => {
    this.setState({ err: undefined });
  };

  render() {
    if (!this.state.err) {
      return this.props.children;
    }

    const message = extractMessage(this.state.err);

    return (
      <div className="m-4 rounded-2xl border border-rose-500/50 bg-rose-950/80 p-6 text-sm text-rose-100 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">UI crash atrapado</h2>
            <p className="mt-1 text-sm text-rose-100/80">
              Algo salió mal dentro del dashboard. Revisá la consola para más detalles o reintentá renderizar.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-full border border-rose-400/60 bg-rose-500/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-rose-200/80 hover:bg-rose-500/60"
          >
            Reintentar
          </button>
        </div>
        <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-black/40 p-4 text-xs leading-relaxed text-rose-100/90">
          {message}
        </pre>
      </div>
    );
  }
}
