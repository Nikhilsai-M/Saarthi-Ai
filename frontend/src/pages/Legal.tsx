import { useParams, Link } from 'react-router-dom';
import { usePageTitle } from '../lib/usePageTitle';

export default function LegalPage() {
    const { type } = useParams<{ type: string }>();
    const isPrivacy = type === 'privacy';
    usePageTitle(isPrivacy ? 'Privacy Policy' : 'Terms of Service');

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--background)',
            padding: '3rem 1.5rem',
        }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
                <Link to="/" style={{ color: 'var(--accent)', fontSize: '0.875rem', textDecoration: 'none' }}>
                    ← Back to Saarthi.ai
                </Link>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '1.5rem 0 0.5rem', letterSpacing: '-0.03em' }}>
                    {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
                    Last updated: May 2026
                </p>

                {isPrivacy ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
                        <section>
                            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem' }}>Information We Collect</h2>
                            <p>We collect information you provide when creating an account (name, email), course activity (videos watched, quiz scores, study time), and notes you create. We do not sell your data to third parties.</p>
                        </section>
                        <section>
                            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem' }}>How We Use Your Information</h2>
                            <p>Your data is used to personalize your learning experience, generate AI-powered study recommendations, track your academic progress, and improve our platform. AI queries are processed by Anthropic's Claude API and are subject to their privacy policy.</p>
                        </section>
                        <section>
                            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem' }}>Data Security</h2>
                            <p>All data is encrypted in transit (TLS) and at rest. We use industry-standard security practices and conduct regular audits. You may request deletion of your account and associated data at any time by contacting support.</p>
                        </section>
                        <section>
                            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem' }}>Contact</h2>
                            <p>For privacy concerns, email us at <a href="mailto:privacy@saarthi.ai" style={{ color: 'var(--accent)' }}>privacy@saarthi.ai</a>.</p>
                        </section>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
                        <section>
                            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem' }}>Acceptance of Terms</h2>
                            <p>By accessing Saarthi.ai, you agree to these terms. If you are under 18, you must have parental consent. Use of the platform is limited to legitimate educational purposes.</p>
                        </section>
                        <section>
                            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem' }}>Academic Integrity</h2>
                            <p>Saarthi.ai is a learning tool. Students are responsible for ensuring their use complies with their institution's academic integrity policy. AI-generated content should be used to understand concepts, not submitted as original work.</p>
                        </section>
                        <section>
                            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem' }}>Account Responsibility</h2>
                            <p>You are responsible for maintaining the security of your account credentials. Do not share your account with others. Teachers are responsible for the content they upload to their courses.</p>
                        </section>
                        <section>
                            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem' }}>Service Availability</h2>
                            <p>We strive for 99.9% uptime but do not guarantee uninterrupted service. We reserve the right to modify or discontinue features with notice. Continued use after changes constitutes acceptance.</p>
                        </section>
                        <section>
                            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem' }}>Contact</h2>
                            <p>Questions? Email <a href="mailto:legal@saarthi.ai" style={{ color: 'var(--accent)' }}>legal@saarthi.ai</a>.</p>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
