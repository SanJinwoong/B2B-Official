import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', background: '#1a1a2e', color: '#e2e8f0', minHeight: '100vh' }}>
          <h2 style={{ color: '#f87171', marginBottom: '1rem' }}>⚠️ Error en el Dashboard</h2>
          <pre style={{ background: '#0f172a', padding: '1rem', borderRadius: 8, overflow: 'auto', color: '#fca5a5', fontSize: '.8rem' }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '1rem', padding: '.6rem 1.2rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
