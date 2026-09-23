import { useState } from 'react';
import {
    Clock, Flag, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle,
    Sparkles, Loader2, RotateCcw, Brain, Target, BookOpen,
} from 'lucide-react';
import { api } from '../lib/api';
import { usePageTitle } from '../lib/usePageTitle';
import './Quiz.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GeneratedQuestion {
    questionText: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    difficulty: string;
    topic: string;
}

interface AdaptiveQuizResponse {
    title: string;
    topic: string;
    difficulty: string;
    questions: GeneratedQuestion[];
    weakAreasDetected: string[];
    generatedAt: string;
}

interface StaticQuestion {
    id: number;
    text: string;
    options: string[];
    correct: number;
    explanation: string;
    difficulty: string;
}

// ── Static demo quiz ───────────────────────────────────────────────────────────

const staticQuiz = {
    title: 'Digital Signal Processing — Module 1',
    questions: [
        { id: 1, text: 'What is the Nyquist rate for a signal with maximum frequency of 4 kHz?', options: ['4 kHz', '8 kHz', '2 kHz', '16 kHz'], correct: 1, explanation: 'Nyquist rate = 2 × f_max = 2 × 4 kHz = 8 kHz.', difficulty: 'Easy' },
        { id: 2, text: 'Which property does the DFT have?', options: ['It is aperiodic', 'Continuous output', 'Circular convolution', 'Infinite computation time'], correct: 2, explanation: 'DFT has circular (cyclic) convolution — multiplication in freq domain = circular convolution in time domain.', difficulty: 'Medium' },
        { id: 3, text: 'The Z-transform of the unit step signal u[n] is:', options: ['1/(1-z)', '1/(1-z⁻¹)', 'z/(z-1)', 'Both B and C'], correct: 3, explanation: 'Z{u[n]} = 1/(1-z⁻¹) = z/(z-1). Both forms are equivalent.', difficulty: 'Medium' },
        { id: 4, text: 'Time complexity of the FFT algorithm?', options: ['O(N²)', 'O(N log N)', 'O(N)', 'O(log N)'], correct: 1, explanation: 'FFT reduces DFT from O(N²) to O(N log N) by exploiting symmetry.', difficulty: 'Easy' },
        { id: 5, text: 'An FIR filter can achieve:', options: ['Infinite impulse response', 'Always unstable', 'Linear phase response', 'Requires feedback'], correct: 2, explanation: 'FIR filters can achieve exact linear phase, critical when phase distortion must be zero.', difficulty: 'Medium' },
    ] as StaticQuestion[],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const diffBadge = (d: string) => {
    const map: Record<string, { bg: string; color: string }> = {
        Easy: { bg: 'var(--success-light)', color: 'var(--success-dark)' },
        easy: { bg: 'var(--success-light)', color: 'var(--success-dark)' },
        Medium: { bg: 'var(--warning-light)', color: '#B45309' },
        medium: { bg: 'var(--warning-light)', color: '#B45309' },
        Hard: { bg: 'var(--error-light)', color: 'var(--error-dark)' },
        hard: { bg: 'var(--error-light)', color: 'var(--error-dark)' },
    };
    return map[d] ?? { bg: 'var(--surface-3)', color: 'var(--text-muted)' };
};

// ── Adaptive Quiz Generator Panel ─────────────────────────────────────────────

function AdaptiveGenerator({ onGenerated }: { onGenerated: (quiz: AdaptiveQuizResponse) => void }) {
    const [topic, setTopic] = useState('');
    const [courseTitle, setCourseTitle] = useState('');
    const [numQuestions, setNumQuestions] = useState(5);
    const [difficulty, setDifficulty] = useState('auto');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const generate = async () => {
        if (!topic.trim()) { setError('Enter a topic first.'); return; }
        setError('');
        setLoading(true);
        try {
            const result = await api.post<AdaptiveQuizResponse>('/quizzes/generate', {
                topic: topic.trim(),
                courseTitle: courseTitle.trim() || undefined,
                difficulty,
                numQuestions,
                pastAttempts: [],
            });
            onGenerated(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Generation failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="adaptive-panel animate-fade-in">
            <div className="adaptive-panel-header">
                <Brain size={22} style={{ color: 'var(--accent)' }} />
                <div>
                    <h2>AI Adaptive Quiz</h2>
                    <p>Generate a quiz tailored to any topic. The AI adjusts difficulty based on your past performance.</p>
                </div>
            </div>

            <div className="adaptive-form">
                <div className="adaptive-field">
                    <label>Topic <span className="adaptive-required">*</span></label>
                    <input
                        className="input"
                        placeholder="e.g. Z-transform, Gradient Descent, Binary Trees"
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && generate()}
                    />
                </div>
                <div className="adaptive-field">
                    <label>Course (optional)</label>
                    <input
                        className="input"
                        placeholder="e.g. Digital Signal Processing"
                        value={courseTitle}
                        onChange={e => setCourseTitle(e.target.value)}
                    />
                </div>
                <div className="adaptive-row">
                    <div className="adaptive-field">
                        <label>Questions</label>
                        <select className="input" value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))}>
                            {[3, 5, 8, 10, 15].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <div className="adaptive-field">
                        <label>Difficulty</label>
                        <select className="input" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                            <option value="auto">Auto (from history)</option>
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </div>
                </div>
                {error && <p className="adaptive-error">{error}</p>}
                <button className="btn btn-primary" onClick={generate} disabled={loading}>
                    {loading
                        ? <><Loader2 size={16} className="animate-spin" /> Generating quiz...</>
                        : <><Sparkles size={16} /> Generate Adaptive Quiz</>
                    }
                </button>
            </div>

            <div className="adaptive-info-row">
                <div className="adaptive-info-card">
                    <Target size={18} style={{ color: 'var(--accent)' }} />
                    <div>
                        <strong>Smart Difficulty</strong>
                        <span>Adjusts based on your quiz history</span>
                    </div>
                </div>
                <div className="adaptive-info-card">
                    <BookOpen size={18} style={{ color: '#8FA3C2' }} />
                    <div>
                        <strong>Weak Area Focus</strong>
                        <span>Targets topics you struggled with</span>
                    </div>
                </div>
                <div className="adaptive-info-card">
                    <Brain size={18} style={{ color: '#B59A63' }} />
                    <div>
                        <strong>Deep Understanding</strong>
                        <span>Tests concepts, not just memorization</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Quiz Player ───────────────────────────────────────────────────────────────

interface QuizPlayerProps {
    title: string;
    questions: { text: string; options: string[]; correct: number; explanation: string; difficulty: string; topic?: string }[];
    weakAreas?: string[];
    onRetake: () => void;
}

function QuizPlayer({ title, questions, weakAreas = [], onRetake }: QuizPlayerProps) {
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null));
    const [flagged, setFlagged] = useState<Set<number>>(new Set());
    const [submitted, setSubmitted] = useState(false);

    const question = questions[currentQ];
    const answered = answers.filter(a => a !== null).length;
    const score = submitted ? answers.reduce((s, a, i) => s + (a === questions[i].correct ? 1 : 0), 0) : 0;
    const pct = submitted ? Math.round((score / questions.length) * 100) : 0;

    const selectAnswer = (i: number) => {
        if (submitted) return;
        const next = [...answers];
        next[currentQ] = i;
        setAnswers(next);
    };

    const toggleFlag = () => {
        const next = new Set(flagged);
        next.has(currentQ) ? next.delete(currentQ) : next.add(currentQ);
        setFlagged(next);
    };

    return (
        <>
            <div className="quiz-header">
                <div className="quiz-header-left"><h2>{title}</h2></div>
                <div className="quiz-header-center">
                    <Clock size={18} />
                    <span className="quiz-timer">{submitted ? 'Completed' : 'In Progress'}</span>
                </div>
                <div className="quiz-header-right">
                    <span>Question {currentQ + 1} of {questions.length}</span>
                    <div className="progress-bar" style={{ width: '120px' }}>
                        <div className="progress-bar-fill" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
                    </div>
                </div>
            </div>

            {submitted && (
                <div className="quiz-score-banner animate-scale-in">
                    <div className="quiz-score-circle">
                        <span className="quiz-score-value">{score}/{questions.length}</span>
                        <span className="quiz-score-pct">{pct}%</span>
                    </div>
                    <div className="quiz-score-info">
                        <h3>{pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good effort!' : 'Keep practicing!'}</h3>
                        <p>You scored {score} out of {questions.length} correctly.</p>
                        {weakAreas.length > 0 && (
                            <p style={{ marginTop: '0.25rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                Weak areas detected: {weakAreas.join(', ')}
                            </p>
                        )}
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={onRetake}>
                        <RotateCcw size={14} /> New Quiz
                    </button>
                </div>
            )}

            <div className="quiz-content">
                <div className="quiz-question-area">
                    <div className="quiz-question-card animate-fade-in">
                        <div className="quiz-question-header">
                            <span className="badge badge-primary">Q{currentQ + 1}</span>
                            <span className="badge" style={diffBadge(question.difficulty)}>{question.difficulty}</span>
                            {(question as any).topic && (
                                <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                                    {(question as any).topic}
                                </span>
                            )}
                            <button className={`quiz-flag-btn ${flagged.has(currentQ) ? 'flagged' : ''}`} onClick={toggleFlag}>
                                <Flag size={16} /> {flagged.has(currentQ) ? 'Flagged' : 'Flag'}
                            </button>
                        </div>
                        <p className="quiz-question-text">{question.text}</p>
                        <div className="quiz-options">
                            {question.options.map((opt, i) => {
                                const isSelected = answers[currentQ] === i;
                                const isCorrect = submitted && i === question.correct;
                                const isWrong = submitted && isSelected && i !== question.correct;
                                return (
                                    <button
                                        key={i}
                                        className={`quiz-option ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                                        onClick={() => selectAnswer(i)}
                                    >
                                        <span className="quiz-option-letter">{String.fromCharCode(65 + i)}</span>
                                        <span className="quiz-option-text">{opt}</span>
                                        {isCorrect && <CheckCircle2 size={18} />}
                                        {isWrong && <XCircle size={18} />}
                                    </button>
                                );
                            })}
                        </div>
                        {submitted && (
                            <div className="quiz-explanation animate-fade-in">
                                <AlertCircle size={18} />
                                <div>
                                    <strong>Explanation</strong>
                                    <p>{question.explanation}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="quiz-nav-sidebar">
                    <h4>Questions</h4>
                    <div className="quiz-nav-grid">
                        {questions.map((_, i) => {
                            let cls = 'quiz-nav-item';
                            if (i === currentQ) cls += ' current';
                            else if (submitted && answers[i] === questions[i].correct) cls += ' correct';
                            else if (submitted && answers[i] !== null) cls += ' wrong';
                            else if (answers[i] !== null) cls += ' answered';
                            if (flagged.has(i)) cls += ' flagged';
                            return <button key={i} className={cls} onClick={() => setCurrentQ(i)}>{i + 1}</button>;
                        })}
                    </div>
                    <div className="quiz-nav-legend">
                        <span><span className="legend-dot current" /> Current</span>
                        <span><span className="legend-dot answered" /> Answered</span>
                        <span><span className="legend-dot flagged" /> Flagged</span>
                    </div>
                </div>
            </div>

            <div className="quiz-bottom-bar">
                <button className="btn btn-ghost" disabled={currentQ === 0} onClick={() => setCurrentQ(currentQ - 1)}>
                    <ChevronLeft size={16} /> Previous
                </button>
                <span className="quiz-bottom-info">{answered} of {questions.length} answered</span>
                {currentQ < questions.length - 1 ? (
                    <button className="btn btn-primary" onClick={() => setCurrentQ(currentQ + 1)}>
                        Next <ChevronRight size={16} />
                    </button>
                ) : !submitted ? (
                    <button className="btn btn-success" onClick={() => setSubmitted(true)}>Submit Quiz</button>
                ) : (
                    <button className="btn btn-primary" onClick={onRetake}>
                        <RotateCcw size={14} /> New Quiz
                    </button>
                )}
            </div>
        </>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Mode = 'choose' | 'static' | 'adaptive-gen' | 'adaptive-play';

export default function QuizPage() {
    usePageTitle('Quiz');
    const [mode, setMode] = useState<Mode>('choose');
    const [adaptiveQuiz, setAdaptiveQuiz] = useState<AdaptiveQuizResponse | null>(null);

    const handleAdaptiveGenerated = (quiz: AdaptiveQuizResponse) => {
        setAdaptiveQuiz(quiz);
        setMode('adaptive-play');
    };

    const retake = () => {
        setAdaptiveQuiz(null);
        setMode('choose');
    };

    if (mode === 'choose') {
        return (
            <div className="quiz-page">
                <div className="quiz-mode-choose animate-fade-in">
                    <h1>Quiz Mode</h1>
                    <p>Choose how you want to practice</p>
                    <div className="quiz-mode-cards">
                        <button className="quiz-mode-card" onClick={() => setMode('static')}>
                            <div className="quiz-mode-icon" style={{ background: 'rgba(143, 163, 194, 0.14)', color: '#8FA3C2' }}>
                                <BookOpen size={28} />
                            </div>
                            <h3>Course Quiz</h3>
                            <p>Take a pre-built quiz from your course materials</p>
                            <span className="btn btn-secondary btn-sm" style={{ marginTop: 'auto' }}>Start Quiz</span>
                        </button>
                        <button className="quiz-mode-card quiz-mode-card-featured" onClick={() => setMode('adaptive-gen')}>
                            <div className="quiz-mode-icon" style={{ background: 'rgba(31, 168, 154, 0.14)', color: 'var(--accent)' }}>
                                <Brain size={28} />
                            </div>
                            <h3>AI Adaptive Quiz</h3>
                            <p>AI generates questions tailored to your weak areas and performance history</p>
                            <span className="btn btn-primary btn-sm" style={{ marginTop: 'auto' }}>
                                <Sparkles size={14} /> Generate
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (mode === 'adaptive-gen') {
        return (
            <div className="quiz-page quiz-page-scroll">
                <div className="quiz-header">
                    <button className="btn btn-ghost btn-sm" onClick={() => setMode('choose')}>
                        <ChevronLeft size={16} /> Back
                    </button>
                    <h2>AI Adaptive Quiz Generator</h2>
                    <span />
                </div>
                <div className="quiz-adaptive-container">
                    <AdaptiveGenerator onGenerated={handleAdaptiveGenerated} />
                </div>
            </div>
        );
    }

    if (mode === 'adaptive-play' && adaptiveQuiz) {
        const questions = adaptiveQuiz.questions.map(q => ({
            text: q.questionText,
            options: q.options,
            correct: q.correctIndex,
            explanation: q.explanation,
            difficulty: q.difficulty,
            topic: q.topic,
        }));
        return (
            <div className="quiz-page">
                <QuizPlayer
                    title={adaptiveQuiz.title}
                    questions={questions}
                    weakAreas={adaptiveQuiz.weakAreasDetected}
                    onRetake={retake}
                />
            </div>
        );
    }

    // Static quiz
    const staticQuestions = staticQuiz.questions.map(q => ({
        text: q.text,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation,
        difficulty: q.difficulty,
    }));
    return (
        <div className="quiz-page">
            <QuizPlayer
                title={staticQuiz.title}
                questions={staticQuestions}
                onRetake={retake}
            />
        </div>
    );
}
