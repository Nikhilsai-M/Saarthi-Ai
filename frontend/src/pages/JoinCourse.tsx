import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, BookOpen } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { api } from '../lib/api';
import './JoinCourse.css';

const PENDING_CODE_KEY = 'saarthi_pending_invite_code';

export default function JoinCoursePage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { isAuthenticated, isRestoring } = useAuthStore();
    const code = params.get('code') ?? '';

    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'redirecting'>('loading');
    const [courseTitle, setCourseTitle] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (!code) {
            setStatus('error');
            setErrorMsg('No invite code found in this link. Ask your teacher for a new invite.');
            return;
        }

        if (isRestoring) return;

        if (!isAuthenticated) {
            // Store the code and send to login — after auth we'll auto-accept
            sessionStorage.setItem(PENDING_CODE_KEY, code);
            setStatus('redirecting');
            setTimeout(() => navigate(`/login?next=/join?code=${code}`, { replace: true }), 1800);
            return;
        }

        // Authenticated — accept the invite
        let cancelled = false;
        (async () => {
            try {
                const res = await api.post<{ courseTitle: string; message: string }>(
                    '/courses/join',
                    { inviteCode: code }
                );
                if (cancelled) return;
                setCourseTitle(res.courseTitle);
                setStatus('success');
                sessionStorage.removeItem(PENDING_CODE_KEY);
                setTimeout(() => navigate('/courses', { replace: true }), 2500);
            } catch (e) {
                if (cancelled) return;
                setErrorMsg(e instanceof Error ? e.message : 'Invalid or expired invite link.');
                setStatus('error');
            }
        })();
        return () => { cancelled = true; };
    }, [code, isAuthenticated, isRestoring, navigate]);

    return (
        <div className="join-page">
            <div className="join-card animate-scale-in">
                <div className="join-logo">
                    <BookOpen size={28} />
                    <span>Saarthi.ai</span>
                </div>

                {status === 'loading' && (
                    <>
                        <Loader2 size={40} className="join-spinner" />
                        <h2>Joining your class…</h2>
                        <p>Please wait while we process your invite.</p>
                    </>
                )}

                {status === 'redirecting' && (
                    <>
                        <Loader2 size={40} className="join-spinner" />
                        <h2>Almost there!</h2>
                        <p>Sign in to accept your invite and join the class.</p>
                        <p className="join-sub">Redirecting to login…</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle2 size={48} className="join-success-icon" />
                        <h2>You're in!</h2>
                        <p>You've successfully joined <strong>{courseTitle}</strong>.</p>
                        <p className="join-sub">Taking you to your courses…</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <XCircle size={48} className="join-error-icon" />
                        <h2>Invite not valid</h2>
                        <p>{errorMsg}</p>
                        <button className="btn btn-primary join-btn" onClick={() => navigate('/courses')}>
                            Go to Courses
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

/** Call this after login/signup to auto-accept a pending invite stored in sessionStorage. */
export async function acceptPendingInvite(): Promise<string | null> {
    const code = sessionStorage.getItem(PENDING_CODE_KEY);
    if (!code) return null;
    try {
        const res = await api.post<{ courseTitle: string }>('/courses/join', { inviteCode: code });
        sessionStorage.removeItem(PENDING_CODE_KEY);
        return res.courseTitle;
    } catch {
        sessionStorage.removeItem(PENDING_CODE_KEY);
        return null;
    }
}
