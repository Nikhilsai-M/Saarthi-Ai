import { useState } from 'react';
import { Target, Loader2, Sparkles, Clock, TrendingUp, AlertTriangle, CheckCircle2, BookOpen, MessageSquare } from 'lucide-react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../lib/usePageTitle';
import './ExamPrep.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExamPredictionTopic {
    topic: string;
    probability: number;
    readiness: number;
    action: 'review' | 'practice' | 'ready';
}

interface ExamPredictionResponse {
    predictions: ExamPredictionTopic[];
    topPriority: string;
    generatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function actionStyle(action: string) {
    if (action === 'ready') return { color: '#5FA89C', bg: 'rgba(95, 168, 156, 0.14)', icon: CheckCircle2, label: 'Ready' };
    if (action === 'practice') return { color: '#B59A63', bg: 'rgba(181, 154, 99, 0.14)', icon: TrendingUp, label: 'Practice' };
    return { color: '#C86F7A', bg: 'rgba(200, 111, 122, 0.14)', icon: AlertTriangle, label: 'Review' };
}

function ProbabilityBar({ value, color }: { value: number; color: string }) {
    return (
        <div className="ep-prob-bar">
            <div className="ep-prob-fill" style={{ width: `${value}%`, background: color }} />
        </div>
    );
}

function ReadinessRing({ value, color }: { value: number; color: string }) {
    const r = 18;
    const circ = 2 * Math.PI * r;
    const dash = (value / 100) * circ;
    return (
        <svg width={44} height={44} viewBox="0 0 44 44">
            <circle cx={22} cy={22} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={4} />
            <circle
                cx={22} cy={22} r={r} fill="none"
                stroke={color} strokeWidth={4}
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                transform="rotate(-90 22 22)"
            />
            <text x={22} y={27} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>{Math.round(value)}%</text>
        </svg>
    );
}

// ── Topic Row ─────────────────────────────────────────────────────────────────

function TopicRow({ t, onStudy }: { t: ExamPredictionTopic; onStudy: (topic: string) => void }) {
    const style = actionStyle(t.action);
    const ActionIcon = style.icon;
    const probColor = t.probability >= 70 ? '#C86F7A' : t.probability >= 40 ? '#B59A63' : '#8FA3C2';

    return (
        <div className="ep-topic-row">
            <div className="ep-topic-info">
                <span className="ep-topic-name">{t.topic}</span>
                <div className="ep-topic-prob">
                    <span className="ep-prob-label" style={{ color: probColor }}>{Math.round(t.probability)}% exam probability</span>
                    <ProbabilityBar value={t.probability} color={probColor} />
                </div>
            </div>

            <ReadinessRing value={t.readiness} color={style.color} />

            <div className="ep-action-badge" style={{ background: style.bg, color: style.color }}>
                <ActionIcon size={14} />
                <span>{style.label}</span>
            </div>

            <button className="btn btn-ghost btn-sm ep-study-btn" onClick={() => onStudy(t.topic)}>
                <MessageSquare size={14} /> Ask AI
            </button>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ExamPrepPage() {
    usePageTitle('Exam Prep');
    const navigate = useNavigate();
    const [courseTitle, setCourseTitle] = useState('');
    const [hoursUntilExam, setHoursUntilExam] = useState(72);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<ExamPredictionResponse | null>(null);

    const predict = async () => {
        if (!courseTitle.trim()) { setError('Enter your course title.'); return; }
        setError('');
        setLoading(true);
        try {
            const res = await api.post<ExamPredictionResponse>('/chat/exam-prediction', {
                courseTitle: courseTitle.trim(),
                recentQuizScores: [],
                notesTopics: [],
                hoursUntilExam,
            });
            setResult(res);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Prediction failed.');
        } finally {
            setLoading(false);
        }
    };

    const studyTopic = (topic: string) => {
        navigate(`/chat?q=Explain ${encodeURIComponent(topic)} for my ${encodeURIComponent(courseTitle)} exam`);
    };

    const highPriority = result?.predictions.filter(p => p.probability >= 70) ?? [];
    const medium = result?.predictions.filter(p => p.probability >= 40 && p.probability < 70) ?? [];
    const lower = result?.predictions.filter(p => p.probability < 40) ?? [];

    return (
        <div className="ep-page">
            <div className="ep-header animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <Target size={22} style={{ color: 'var(--accent)' }} />
                    <h1>Exam Prediction</h1>
                </div>
                <p>AI predicts the most likely exam topics and tells you exactly how prepared you are for each — with a prioritised action plan.</p>
            </div>

            <div className="ep-controls animate-fade-in delay-100">
                <input
                    className="input ep-course-input"
                    placeholder="Course title, e.g. Digital Signal Processing"
                    value={courseTitle}
                    onChange={e => setCourseTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && predict()}
                />
                <div className="ep-hours">
                    <Clock size={16} style={{ color: 'var(--text-muted)' }} />
                    <select className="input ep-hours-select" value={hoursUntilExam} onChange={e => setHoursUntilExam(Number(e.target.value))}>
                        <option value={24}>24h to exam</option>
                        <option value={48}>48h to exam</option>
                        <option value={72}>3 days</option>
                        <option value={168}>1 week</option>
                        <option value={336}>2 weeks</option>
                    </select>
                </div>
                <button className="btn btn-primary" onClick={predict} disabled={loading}>
                    {loading
                        ? <><Loader2 size={16} className="animate-spin" /> Predicting...</>
                        : <><Sparkles size={16} /> Predict Exam Topics</>}
                </button>
            </div>

            {error && <p className="ep-error">{error}</p>}

            {result && (
                <div className="animate-fade-in">
                    {result.topPriority && (
                        <div className="ep-priority-banner">
                            <Target size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                            <div>
                                <strong>Top priority</strong>
                                <span>{result.topPriority}</span>
                            </div>
                        </div>
                    )}

                    {highPriority.length > 0 && (
                        <div className="ep-section">
                            <div className="ep-section-label ep-high">High Probability — likely on exam</div>
                            {highPriority.map(t => <TopicRow key={t.topic} t={t} onStudy={studyTopic} />)}
                        </div>
                    )}

                    {medium.length > 0 && (
                        <div className="ep-section">
                            <div className="ep-section-label ep-med">Medium Probability — worth reviewing</div>
                            {medium.map(t => <TopicRow key={t.topic} t={t} onStudy={studyTopic} />)}
                        </div>
                    )}

                    {lower.length > 0 && (
                        <div className="ep-section">
                            <div className="ep-section-label ep-low">Lower Probability — if time permits</div>
                            {lower.map(t => <TopicRow key={t.topic} t={t} onStudy={studyTopic} />)}
                        </div>
                    )}

                    <div className="ep-legend">
                        <span>Readiness ring: how prepared you are for each topic based on quiz history.</span>
                        <span>Click <strong>Ask AI</strong> to open a targeted chat session on any topic.</span>
                    </div>
                </div>
            )}

            {!result && !loading && (
                <div className="ep-empty animate-fade-in delay-200">
                    <BookOpen size={48} strokeWidth={1} style={{ color: 'var(--text-muted)' }} />
                    <h2>Know what to study before it's too late</h2>
                    <p>Enter your course and how much time you have. The AI analyses your quiz performance and course content to surface the highest-value topics to study right now.</p>
                </div>
            )}
        </div>
    );
}
