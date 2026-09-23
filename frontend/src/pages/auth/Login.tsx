import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Sparkles, Brain, Code2, BarChart3, GraduationCap } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { LogoIcon } from '../../components/LogoIcon';
import { acceptPendingInvite } from '../JoinCourse';
import { usePageTitle } from '../../lib/usePageTitle';
import './Auth.css';

export default function LoginPage() {
    usePageTitle('Sign In');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState('');
    const { login, isLoading } = useAuthStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password, remember);
            // Auto-accept a pending invite if the student came from an invite link
            await acceptPendingInvite();
            const next = searchParams.get('next');
            navigate(next || '/dashboard', { replace: true });
        } catch (err: any) {
            setError(err.message || 'Login failed. Please try again.');
        }
    };

    // Demo logins
    const handleDemoStudent = () => {
        setEmail('student@saarthi.ai');
        setPassword('Student123');
    };
    const handleDemoAdmin = () => {
        setEmail('admin@saarthi.ai');
        setPassword('Admin123');
    };
    const handleDemoTeacher = () => {
        setEmail('teacher@saarthi.ai');
        setPassword('Teacher123');
    };

    return (
        <div className="auth-page">
            {/* Left Panel - Branding */}
            <div className="auth-left">
                <div className="auth-left-content">
                    <div className="auth-left-brand">
                        <div className="landing-logo-icon">
                            <LogoIcon size={24} />
                        </div>
                        <span className="auth-left-logo">Saarthi.ai</span>
                    </div>
                    <p className="auth-left-tagline">Your Agentic AI Teaching Assistant</p>

                    <div className="auth-left-illustration">
                        <div className="auth-illustration-orb auth-orb-1" />
                        <div className="auth-illustration-orb auth-orb-2" />
                        <div className="auth-illustration-orb auth-orb-3" />
                        <div className="auth-illustration-center">
                            <Brain size={64} />
                        </div>
                    </div>

                    <div className="auth-left-features">
                        <div className="auth-feature-item">
                            <div className="auth-feature-icon"><Brain size={18} /></div>
                            <span>Domain-Specific AI</span>
                        </div>
                        <div className="auth-feature-item">
                            <div className="auth-feature-icon"><Code2 size={18} /></div>
                            <span>Integrated Coding Lab</span>
                        </div>
                        <div className="auth-feature-item">
                            <div className="auth-feature-icon"><BarChart3 size={18} /></div>
                            <span>Progress Analytics</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="auth-right">
                <div className="auth-form-container animate-fade-in">
                    <h1 className="auth-title">Welcome back</h1>
                    <p className="auth-subtitle">Continue mastering technical concepts</p>

                    {error && (
                        <div className="auth-error animate-scale-in">
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="auth-field">
                            <label>Institute Email</label>
                            <div className="auth-input-wrapper">
                                <Mail size={18} className="auth-input-icon" />
                                <input
                                    type="email"
                                    placeholder="you@university.edu"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input auth-input-with-icon"
                                    required
                                />
                            </div>
                        </div>

                        <div className="auth-field">
                            <label>Password</label>
                            <div className="auth-input-wrapper">
                                <Lock size={18} className="auth-input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input auth-input-with-icon"
                                    required
                                />
                                <button
                                    type="button"
                                    className="auth-eye-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="auth-row">
                            <label className="auth-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                    className="auth-checkbox"
                                />
                                Remember me
                            </label>
                            <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={isLoading}>
                            {isLoading ? (
                                <span className="auth-spinner" />
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="divider">Or continue with</div>

                    <div className="auth-social-buttons">
                        <button type="button" className="auth-social-btn" onClick={handleDemoStudent}>
                            <Sparkles size={18} />
                            Demo Student
                        </button>
                        <button type="button" className="auth-social-btn" onClick={handleDemoTeacher}>
                            <GraduationCap size={18} />
                            Demo Teacher
                        </button>
                        <button type="button" className="auth-social-btn" onClick={handleDemoAdmin} style={{ borderColor: 'var(--accent-200)' }}>
                            <BarChart3 size={18} />
                            Demo Admin
                        </button>
                    </div>

                    <p className="auth-footer-text">
                        Don't have an account? <Link to="/signup" className="auth-link-bold">Sign Up</Link>
                    </p>
                    <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                        By continuing, you agree to our{' '}
                        <Link to="/legal/terms" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Terms</Link>
                        {' '}and{' '}
                        <Link to="/legal/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Privacy Policy</Link>.
                    </p>
                </div>
            </div>
        </div>
    );
}
