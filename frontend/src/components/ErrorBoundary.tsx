import { Component, type ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; message: string; }

export default class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, message: '' };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, message: error.message };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, info);
    }

    render() {
        if (!this.state.hasError) return this.props.children;
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                gap: '1rem',
                padding: '2rem',
                textAlign: 'center',
            }}>
                <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'rgba(239,68,68,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--error)',
                }}>
                    <AlertTriangle size={28} />
                </div>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: 700 }}>
                    Something went wrong
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 360 }}>
                    An unexpected error occurred. Try refreshing the page.
                </p>
                <button
                    className="btn btn-primary"
                    onClick={() => window.location.reload()}
                >
                    <RefreshCw size={16} /> Refresh page
                </button>
            </div>
        );
    }
}
