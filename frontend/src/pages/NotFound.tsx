import { Link } from 'react-router-dom';
import { usePageTitle } from '../lib/usePageTitle';

export default function NotFoundPage() {
    usePageTitle('Page Not Found');
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '2rem',
            textAlign: 'center',
            background: 'var(--background)',
        }}>
            <div style={{
                fontSize: '5rem',
                fontWeight: 800,
                color: 'var(--accent)',
                lineHeight: 1,
                letterSpacing: '-0.04em',
            }}>404</div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Page not found
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 360, margin: 0 }}>
                The page you're looking for doesn't exist or has been moved.
            </p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                Go home
            </Link>
        </div>
    );
}
