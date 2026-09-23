import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Sparkles, Loader2, ChevronDown, RotateCcw, Lightbulb, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { usePageTitle } from '../lib/usePageTitle';
import './Socratic.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type Difficulty = 'gentle' | 'moderate' | 'rigorous';

interface SocraticResponse {
    challenge: string;
    hints: string[];
    verdict: string | null;
    explanation: string;
}

interface Turn {
    role: 'user' | 'ai';
    claim?: string;
    response?: SocraticResponse;
    ts: number;
}

// ── Difficulty config ─────────────────────────────────────────────────────────

const DIFFICULTIES: { key: Difficulty; label: string; desc: string; color: string }[] = [
    { key: 'gentle',   label: 'Gentle',   desc: 'Guided exploration',    color: '#5FA89C' },
    { key: 'moderate', label: 'Moderate', desc: 'Balanced challenge',    color: '#B59A63' },
    { key: 'rigorous', label: 'Rigorous', desc: 'Devil\'s advocate',      color: '#C86F7A' },
];

// ── Verdict badge ─────────────────────────────────────────────────────────────

function VerdictBadge({ verdict }: { verdict: string | null }) {
    if (!verdict) return null;
    const v = verdict.toLowerCase();
    if (v.includes('correct') || v.includes('right') || v.includes('accurate')) {
        return (
            <div className="sc-verdict sc-verdict-correct">
                <CheckCircle2 size={14} /> {verdict}
            </div>
        );
    }
    if (v.includes('incorrect') || v.includes('wrong') || v.includes('false')) {
        return (
            <div className="sc-verdict sc-verdict-wrong">
                <XCircle size={14} /> {verdict}
            </div>
        );
    }
    return (
        <div className="sc-verdict sc-verdict-partial">
            <AlertTriangle size={14} /> {verdict}
        </div>
    );
}

// ── AI Response bubble ────────────────────────────────────────────────────────

function AIBubble({ response, showHints }: { response: SocraticResponse; showHints: boolean }) {
    const [hintsOpen, setHintsOpen] = useState(false);

    return (
        <div className="sc-bubble sc-bubble-ai animate-fade-in">
            <div className="sc-bubble-icon">
                <Sparkles size={15} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="sc-bubble-body">
                <p className="sc-challenge">{response.challenge}</p>

                {response.verdict && <VerdictBadge verdict={response.verdict} />}

                {response.explanation && (
                    <p className="sc-explanation">{response.explanation}</p>
                )}

                {showHints && response.hints.length > 0 && (
                    <div className="sc-hints-section">
                        <button className="sc-hints-toggle" onClick={() => setHintsOpen(h => !h)}>
                            <Lightbulb size={13} /> Hints ({response.hints.length})
                            <ChevronDown size={13} className={hintsOpen ? 'rotated' : ''} />
                        </button>
                        {hintsOpen && (
                            <div className="sc-hints-list animate-fade-in">
                                {response.hints.map((h, i) => (
                                    <div key={i} className="sc-hint">
                                        <span className="sc-hint-num">{i + 1}</span>
                                        <span>{h}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── User bubble ───────────────────────────────────────────────────────────────

function UserBubble({ claim }: { claim: string }) {
    return (
        <div className="sc-bubble sc-bubble-user animate-fade-in">
            <div className="sc-bubble-body">
                <p className="sc-claim-text">{claim}</p>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SocraticPage() {
    usePageTitle('Socratic Mode');
    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState<Difficulty>('moderate');
    const [claim, setClaim] = useState('');
    const [turns, setTurns] = useState<Turn[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sessionStarted, setSessionStarted] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [turns, loading]);

    const startSession = () => {
        if (!topic.trim()) { setError('Enter a topic first.'); return; }
        setError('');
        setSessionStarted(true);
        setTurns([]);
        inputRef.current?.focus();
    };

    const submitClaim = async () => {
        if (!claim.trim()) return;
        if (loading) return;

        const userClaim = claim.trim();
        setClaim('');
        setError('');
        setTurns(t => [...t, { role: 'user', claim: userClaim, ts: Date.now() }]);
        setLoading(true);

        try {
            const res = await api.post<SocraticResponse>('/chat/socratic', {
                claim: userClaim,
                topic: topic.trim(),
                courseTitle: topic.trim(),
                difficulty,
            });
            setTurns(t => [...t, { role: 'ai', response: res, ts: Date.now() }]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setSessionStarted(false);
        setTurns([]);
        setTopic('');
        setClaim('');
        setError('');
    };

    const diffConfig = DIFFICULTIES.find(d => d.key === difficulty)!;
    const roundCount = turns.filter(t => t.role === 'user').length;

    // ── Setup screen ──────────────────────────────────────────────────────────
    if (!sessionStarted) {
        return (
            <div className="sc-page">
                <div className="sc-setup animate-fade-in">
                    <div className="sc-setup-icon">
                        <MessageCircle size={32} style={{ color: 'var(--accent)' }} />
                    </div>
                    <h1>Socratic Debate Mode</h1>
                    <p>Make a claim — the AI challenges your thinking with questions that expose gaps and strengthen your understanding.</p>

                    <div className="sc-setup-form">
                        <div className="sc-setup-field">
                            <label>Topic</label>
                            <input
                                className="input"
                                placeholder="e.g. Digital Signal Processing, Fourier Transforms…"
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && startSession()}
                            />
                        </div>

                        <div className="sc-setup-field">
                            <label>Debate intensity</label>
                            <div className="sc-difficulty-row">
                                {DIFFICULTIES.map(d => (
                                    <button
                                        key={d.key}
                                        className={`sc-diff-btn ${difficulty === d.key ? 'active' : ''}`}
                                        style={{ '--diff-color': d.color } as any}
                                        onClick={() => setDifficulty(d.key)}
                                    >
                                        <strong>{d.label}</strong>
                                        <span>{d.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && <p className="sc-error">{error}</p>}

                        <button className="btn btn-primary sc-start-btn" onClick={startSession}>
                            <MessageCircle size={16} /> Start Debate
                        </button>
                    </div>

                    {/* How it works */}
                    <div className="sc-how">
                        <div className="sc-how-step">
                            <span className="sc-how-num">1</span>
                            <div>
                                <strong>Make a claim</strong>
                                <span>State what you believe about the topic</span>
                            </div>
                        </div>
                        <div className="sc-how-step">
                            <span className="sc-how-num">2</span>
                            <div>
                                <strong>AI challenges you</strong>
                                <span>It asks probing questions to test your reasoning</span>
                            </div>
                        </div>
                        <div className="sc-how-step">
                            <span className="sc-how-num">3</span>
                            <div>
                                <strong>Deepen understanding</strong>
                                <span>Each round reveals gaps and strengthens your model</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Debate screen ─────────────────────────────────────────────────────────
    return (
        <div className="sc-page sc-page-debate">
            {/* Header */}
            <div className="sc-debate-header">
                <div className="sc-debate-header-left">
                    <MessageCircle size={18} style={{ color: 'var(--accent)' }} />
                    <div>
                        <span className="sc-debate-topic">{topic}</span>
                        <span className="sc-debate-sub">{roundCount} claim{roundCount !== 1 ? 's' : ''} · {diffConfig.label} mode</span>
                    </div>
                </div>
                <div className="sc-debate-header-right">
                    <span className="sc-diff-chip" style={{ background: `${diffConfig.color}22`, color: diffConfig.color }}>
                        {diffConfig.label}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={reset}>
                        <RotateCcw size={14} /> New Session
                    </button>
                </div>
            </div>

            {/* Chat thread */}
            <div className="sc-thread">
                {turns.length === 0 && (
                    <div className="sc-thread-empty animate-fade-in">
                        <Sparkles size={32} style={{ color: 'var(--text-muted)' }} />
                        <p>Make your first claim about <strong>{topic}</strong>.</p>
                        <p className="sc-thread-hint">Be bold — the more confident your claim, the richer the debate.</p>
                    </div>
                )}

                {turns.map((turn, i) => (
                    turn.role === 'user'
                        ? <UserBubble key={i} claim={turn.claim!} />
                        : <AIBubble key={i} response={turn.response!} showHints={difficulty !== 'rigorous'} />
                ))}

                {loading && (
                    <div className="sc-bubble sc-bubble-ai animate-fade-in">
                        <div className="sc-bubble-icon">
                            <Sparkles size={15} style={{ color: 'var(--accent)' }} />
                        </div>
                        <div className="sc-typing">
                            <span /><span /><span />
                        </div>
                    </div>
                )}

                {error && <p className="sc-inline-error animate-fade-in">{error}</p>}
                <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="sc-input-bar">
                <div className="sc-input-wrap">
                    <textarea
                        ref={inputRef}
                        className="sc-input"
                        placeholder={`Make a claim about ${topic}…`}
                        value={claim}
                        onChange={e => setClaim(e.target.value)}
                        rows={1}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                submitClaim();
                            }
                        }}
                    />
                    <button
                        className="sc-send-btn"
                        onClick={submitClaim}
                        disabled={!claim.trim() || loading}
                    >
                        {loading
                            ? <Loader2 size={18} className="animate-spin" />
                            : <Send size={18} />
                        }
                    </button>
                </div>
                <p className="sc-input-hint">Press Enter to submit · Shift+Enter for new line</p>
            </div>
        </div>
    );
}
