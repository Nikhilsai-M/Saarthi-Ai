import { useState, useEffect } from 'react';
import {
    Layers, Sparkles, Loader2, ChevronLeft, ChevronRight,
    RotateCcw, CheckCircle2, XCircle, Minus, BookOpen, Brain,
} from 'lucide-react';
import { api } from '../lib/api';
import { usePageTitle } from '../lib/usePageTitle';
import './Flashcards.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Flashcard {
    id: string;
    front: string;
    back: string;
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    nextReviewAt: string | null;
    interval: number;
    easeFactor: number;
}

interface FlashcardDeckResponse {
    topic: string;
    cards: Flashcard[];
    generatedAt: string;
}

interface FlashcardReviewResponse {
    nextInterval: number;
    nextEaseFactor: number;
    nextReviewAt: string;
}

// ── SM-2 Quality labels ────────────────────────────────────────────────────────

const QUALITY_OPTIONS = [
    { q: 0, label: 'Blackout', icon: XCircle, color: '#C86F7A', desc: 'Complete blank' },
    { q: 2, label: 'Hard', icon: Minus, color: '#B59A63', desc: 'Wrong, but familiar' },
    { q: 4, label: 'Good', icon: CheckCircle2, color: '#5FA89C', desc: 'Correct with effort' },
    { q: 5, label: 'Easy', icon: Sparkles, color: '#6EAFA4', desc: 'Perfect recall' },
];

// ── Flashcard Generator ────────────────────────────────────────────────────────

function DeckGenerator({ onGenerated }: { onGenerated: (deck: FlashcardDeckResponse) => void }) {
    const [topic, setTopic] = useState('');
    const [courseTitle, setCourseTitle] = useState('');
    const [sourceText, setSourceText] = useState('');
    const [maxCards, setMaxCards] = useState(10);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const generate = async () => {
        if (!topic.trim()) { setError('Enter a topic.'); return; }
        if (!sourceText.trim() || sourceText.trim().length < 10) { setError('Paste at least a paragraph of notes or transcript.'); return; }
        setError('');
        setLoading(true);
        try {
            const deck = await api.post<FlashcardDeckResponse>('/chat/flashcards/generate', {
                topic: topic.trim(),
                courseTitle: courseTitle.trim() || undefined,
                sourceText: sourceText.trim(),
                maxCards,
            });
            onGenerated(deck);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Generation failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fc-generator animate-fade-in">
            <div className="fc-generator-header">
                <Layers size={24} style={{ color: 'var(--accent)' }} />
                <div>
                    <h2>Generate Flashcard Deck</h2>
                    <p>Paste any notes, lecture transcript, or textbook excerpt — AI extracts the key concepts into study cards with spaced repetition scheduling.</p>
                </div>
            </div>

            <div className="fc-form">
                <div className="fc-field-row">
                    <div className="fc-field">
                        <label>Topic <span style={{ color: 'var(--error)' }}>*</span></label>
                        <input className="input" placeholder="e.g. Fourier Transform" value={topic} onChange={e => setTopic(e.target.value)} />
                    </div>
                    <div className="fc-field">
                        <label>Course</label>
                        <input className="input" placeholder="e.g. Digital Signal Processing" value={courseTitle} onChange={e => setCourseTitle(e.target.value)} />
                    </div>
                    <div className="fc-field fc-field-sm">
                        <label>Max cards</label>
                        <select className="input" value={maxCards} onChange={e => setMaxCards(Number(e.target.value))}>
                            {[5, 10, 15, 20, 30].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                </div>
                <div className="fc-field">
                    <label>Source text <span style={{ color: 'var(--error)' }}>*</span></label>
                    <textarea
                        className="fc-textarea"
                        placeholder="Paste your notes, lecture transcript, or textbook content here..."
                        value={sourceText}
                        onChange={e => setSourceText(e.target.value)}
                        rows={8}
                    />
                    <span className="fc-char-count">{sourceText.length} chars</span>
                </div>
                {error && <p className="fc-error">{error}</p>}
                <button className="btn btn-primary" onClick={generate} disabled={loading}>
                    {loading
                        ? <><Loader2 size={16} className="animate-spin" /> Extracting flashcards...</>
                        : <><Sparkles size={16} /> Generate Deck</>}
                </button>
            </div>
        </div>
    );
}

// ── Card Flipper ───────────────────────────────────────────────────────────────

function CardFlipper({ cards, topic, onDone }: { cards: Flashcard[]; topic: string; onDone: () => void }) {
    const [idx, setIdx] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [reviewed, setReviewed] = useState<Record<string, { interval: number; ef: number; next: string }>>({});
    const [done, setDone] = useState(false);

    const card = cards[idx];
    const progress = Object.keys(reviewed).length;

    const handleQuality = async (q: number) => {
        try {
            const result = await api.post<FlashcardReviewResponse>('/chat/flashcards/review', {
                cardId: card.id,
                quality: q,
                currentInterval: card.interval,
                currentEaseFactor: card.easeFactor,
            });
            setReviewed(r => ({
                ...r,
                [card.id]: { interval: result.nextInterval, ef: result.nextEaseFactor, next: result.nextReviewAt },
            }));
        } catch {
            // still advance even if SM-2 call fails
        }
        if (idx + 1 >= cards.length) {
            setDone(true);
        } else {
            setIdx(i => i + 1);
            setFlipped(false);
        }
    };

    const diffColor = (d: string) => {
        if (d === 'easy') return { bg: 'var(--success-light)', color: 'var(--success-dark)' };
        if (d === 'hard') return { bg: 'var(--error-light)', color: 'var(--error-dark)' };
        return { bg: 'var(--warning-light)', color: '#B45309' };
    };

    if (done) {
        const needsReview = Object.values(reviewed).filter(r => r.interval <= 1).length;
        return (
            <div className="fc-done animate-scale-in">
                <CheckCircle2 size={48} style={{ color: 'var(--accent)' }} />
                <h2>Session Complete!</h2>
                <p>You reviewed {progress} of {cards.length} cards.</p>
                {needsReview > 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{needsReview} card{needsReview > 1 ? 's' : ''} scheduled for tomorrow.</p>}
                <div className="fc-done-btns">
                    <button className="btn btn-ghost" onClick={() => { setIdx(0); setFlipped(false); setDone(false); setReviewed({}); }}>
                        <RotateCcw size={16} /> Review Again
                    </button>
                    <button className="btn btn-primary" onClick={onDone}>New Deck</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fc-player animate-fade-in">
            <div className="fc-player-header">
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{topic}</span>
                <div className="progress-bar" style={{ flex: 1, maxWidth: '200px' }}>
                    <div className="progress-bar-fill" style={{ width: `${(progress / cards.length) * 100}%` }} />
                </div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{idx + 1} / {cards.length}</span>
            </div>

            <div className={`fc-card ${flipped ? 'fc-card-flipped' : ''}`} onClick={() => setFlipped(f => !f)}>
                <div className="fc-card-inner">
                    <div className="fc-card-front">
                        <span className="fc-card-label">Question</span>
                        <p>{card.front}</p>
                        <span className="fc-card-hint">Click to reveal answer</span>
                    </div>
                    <div className="fc-card-back">
                        <span className="fc-card-label">Answer</span>
                        <p>{card.back}</p>
                        <div className="fc-card-meta">
                            <span className="badge" style={diffColor(card.difficulty)}>{card.difficulty}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{card.topic}</span>
                        </div>
                    </div>
                </div>
            </div>

            {flipped && (
                <div className="fc-quality-bar animate-fade-in">
                    <p>How well did you know this?</p>
                    <div className="fc-quality-btns">
                        {QUALITY_OPTIONS.map(({ q, label, icon: Icon, color, desc }) => (
                            <button key={q} className="fc-quality-btn" style={{ '--q-color': color } as any} onClick={() => handleQuality(q)}>
                                <Icon size={20} style={{ color }} />
                                <strong>{label}</strong>
                                <span>{desc}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {!flipped && (
                <div className="fc-nav">
                    <button className="btn btn-ghost btn-sm" disabled={idx === 0} onClick={() => { setIdx(i => i - 1); setFlipped(false); }}>
                        <ChevronLeft size={16} /> Prev
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setFlipped(true)}>
                        Reveal Answer <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FlashcardsPage() {
    usePageTitle('Flashcards');
    const [deck, setDeck] = useState<FlashcardDeckResponse | null>(null);

    return (
        <div className="fc-page">
            <div className="fc-page-header animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <Brain size={22} style={{ color: 'var(--accent)' }} />
                    <h1>Flashcards</h1>
                </div>
                <p>Spaced repetition learning — AI extracts key concepts from your notes and schedules reviews optimally.</p>
            </div>

            {!deck ? (
                <DeckGenerator onGenerated={setDeck} />
            ) : (
                <CardFlipper cards={deck.cards} topic={deck.topic} onDone={() => setDeck(null)} />
            )}

            {!deck && (
                <div className="fc-how-it-works animate-fade-in delay-200">
                    <h3>How spaced repetition works</h3>
                    <div className="fc-steps">
                        <div className="fc-step">
                            <BookOpen size={20} style={{ color: 'var(--accent)' }} />
                            <div>
                                <strong>Paste your notes</strong>
                                <span>Any text — lecture slides, textbook, your own notes</span>
                            </div>
                        </div>
                        <div className="fc-step">
                            <Layers size={20} style={{ color: '#8FA3C2' }} />
                            <div>
                                <strong>AI extracts cards</strong>
                                <span>Key facts, formulas, and concepts become atomic flashcards</span>
                            </div>
                        </div>
                        <div className="fc-step">
                            <Sparkles size={20} style={{ color: '#B59A63' }} />
                            <div>
                                <strong>SM-2 scheduling</strong>
                                <span>Hard cards repeat sooner, easy cards less often — maximising retention</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
