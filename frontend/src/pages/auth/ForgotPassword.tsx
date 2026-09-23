import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { LogoIcon } from '../../components/LogoIcon';
import { usePageTitle } from '../../lib/usePageTitle';
import './Auth.css';

export default function ForgotPasswordPage() {
    usePageTitle('Reset Password');
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Simulate API call — wire to real endpoint when backend supports it
            await new Promise((r) => setTimeout(r, 900));
            setSent(true);
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="forgot-page">
            <div className="forgot-card animate-fade-in">
                <div className="forgot-logo">
                    <LogoIcon size={28} />
                </div>

                {!sent ? (
                    <>
                        <h1 className="forgot-title">Reset your password</h1>
                        <p className="forgot-sub">
                            Enter your account email and we'll send you a reset link.
                        </p>

                        {error && (
                            <div className="auth-error animate-scale-in">
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="auth-form forgot-form">
                            <div className="auth-field">
                                <label>Email address</label>
                                <div className="auth-input-wrapper">
                                    <Mail size={18} className="auth-input-icon" />
                                    <input
                                        type="email"
                                        placeholder="you@university.edu"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input auth-input-with-icon"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg auth-submit"
                                disabled={loading}
                            >
                                {loading ? <span className="auth-spinner" /> : 'Send Reset Link'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="forgot-success animate-scale-in">
                        <div className="forgot-success-icon">
                            <CheckCircle2 size={40} />
                        </div>
                        <h2>Check your inbox</h2>
                        <p>
                            We sent a password reset link to <strong>{email}</strong>.
                            It expires in 30 minutes.
                        </p>
                        <p className="forgot-success-hint">
                            Didn't get it? Check your spam folder or{' '}
                            <button
                                type="button"
                                className="forgot-resend-btn"
                                onClick={() => { setSent(false); }}
                            >
                                try again
                            </button>.
                        </p>
                    </div>
                )}

                <Link to="/login" className="forgot-back">
                    <ArrowLeft size={16} /> Back to sign in
                </Link>
            </div>
        </div>
    );
}
