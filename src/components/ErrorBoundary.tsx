import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('TSL ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="error-boundary"
          style={{
            padding: 16,
            background: 'var(--card)',
            border: 'var(--border-width) solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <h2 style={{ margin: '0 0 8px' }}>Something went wrong</h2>
          <p style={{ margin: '0 0 12px', color: 'var(--text-dim)' }}>
            {this.state.error?.message}
          </p>
          <button
            className="btn"
            onClick={() =>
              this.setState({ hasError: false, error: null })
            }
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
