import { Component, type ReactNode } from 'react';

export class DevErrorBoundary extends Component<{ children: ReactNode }, { err?: unknown }> {
  state = { err: undefined as unknown };

  static getDerivedStateFromError(err: unknown) {
    return { err };
  }

  componentDidCatch(err: unknown, info: unknown) {
    console.error('[ERRBOUNDARY]', { err, info });
  }

  render() {
    return this.state.err ? (
      <pre style={{ whiteSpace: 'pre-wrap', padding: 12, background: '#200', color: '#faa' }}>
        <b>UI crash atrapado</b>
        {'\n'}
        {String((this.state.err as any)?.stack ?? this.state.err)}
      </pre>
    ) : (
      this.props.children
    );
  }
}
