import { useState, useEffect } from 'react';
import {
    BarChart3, Target, Clock, Award, BookOpen,
    Flame, Users, Loader2, Medal,
} from 'lucide-react';
import { api, type ProgressResponse } from '../lib/api';
import { usePageTitle } from '../lib/usePageTitle';
import './Progress.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScoreBucket {
    range: string;
    count: number;
    isUser: boolean;
}

interface TopicBreakdown {
    topic: string;
    userAvg: number;
    peerAvg: number;
}

interface PeerComparison {
    userAvgScore: number;
    percentile: number;
    peerCount: number;
    distribution: ScoreBucket[];
    topicBreakdown: TopicBreakdown[];
}

// ── Percentile arc ────────────────────────────────────────────────────────────

function PercentileArc({ value }: { value: number }) {
    const r = 54;
    const circ = Math.PI * r; // half circle
    const dash = (value / 100) * circ;
    const color = value >= 75 ? '#5FA89C' : value >= 50 ? '#B59A63' : '#C86F7A';

    return (
        <svg width={130} height={75} viewBox="0 0 130 75">
            {/* Track */}
            <path
                d={`M 11 65 A ${r} ${r} 0 0 1 119 65`}
                fill="none" stroke="var(--surface-3)" strokeWidth={10} strokeLinecap="round"
            />
            {/* Fill */}
            <path
                d={`M 11 65 A ${r} ${r} 0 0 1 119 65`}
                fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
            />
            <text x={65} y={58} textAnchor="middle" fontSize={22} fontWeight={800} fill={color}>
                {Math.round(value)}
            </text>
            <text x={65} y={72} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
                percentile
            </text>
        </svg>
    );
}

// ── Distribution bar chart ─────────────────────────────────────────────────────

function DistributionChart({ buckets }: { buckets: ScoreBucket[] }) {
    const maxCount = Math.max(...buckets.map(b => b.count), 1);
    return (
        <div className="peer-dist-chart">
            {buckets.map((b, i) => (
                <div key={i} className="peer-dist-col">
                    <div className="peer-dist-bar-wrap">
                        <div
                            className={`peer-dist-bar ${b.isUser ? 'peer-dist-bar-user' : ''}`}
                            style={{ height: `${(b.count / maxCount) * 100}%` }}
                        />
                    </div>
                    <span className="peer-dist-label">{b.range.split('-')[0]}</span>
                </div>
            ))}
        </div>
    );
}

// ── Topic comparison rows ─────────────────────────────────────────────────────

function TopicRow({ t }: { t: TopicBreakdown }) {
    const diff = t.userAvg - t.peerAvg;
    const diffColor = diff >= 0 ? '#5FA89C' : '#C86F7A';
    return (
        <div className="peer-topic-row">
            <span className="peer-topic-name">{t.topic}</span>
            <div className="peer-topic-bars">
                <div className="peer-topic-bar-row">
                    <span className="peer-topic-bar-label">You</span>
                    <div className="progress-bar" style={{ flex: 1 }}>
                        <div className="progress-bar-fill" style={{ width: `${t.userAvg}%`, background: 'var(--accent)' }} />
                    </div>
                    <span className="peer-topic-bar-val">{t.userAvg}%</span>
                </div>
                <div className="peer-topic-bar-row">
                    <span className="peer-topic-bar-label">Avg</span>
                    <div className="progress-bar" style={{ flex: 1 }}>
                        <div className="progress-bar-fill" style={{ width: `${t.peerAvg}%`, background: '#8FA3C2' }} />
                    </div>
                    <span className="peer-topic-bar-val">{t.peerAvg}%</span>
                </div>
            </div>
            <span className="peer-topic-diff" style={{ color: diffColor }}>
                {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
            </span>
        </div>
    );
}

// ── Peer Comparison Widget ────────────────────────────────────────────────────

function PeerComparisonWidget() {
    const [data, setData] = useState<PeerComparison | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        setLoading(true);
        setError('');
        api.get<PeerComparison>('/quizzes/peer-comparison')
            .then(setData)
            .catch(e => setError(e?.message || 'Could not load peer data.'))
            .finally(() => setLoading(false));
    }, [retryCount]);

    const rankLabel = (p: number) =>
        p >= 90 ? 'Top 10%' : p >= 75 ? 'Top 25%' : p >= 50 ? 'Above Average' : p >= 25 ? 'Below Average' : 'Bottom 25%';
    const rankColor = (p: number) =>
        p >= 75 ? '#5FA89C' : p >= 50 ? '#B59A63' : '#C86F7A';

    return (
        <div className="progress-section animate-fade-in">
            <h3><Users size={18} /> Peer Comparison</h3>

            {loading && (
                <div className="peer-loading">
                    <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                    <span>Loading peer data…</span>
                </div>
            )}

            {error && !loading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{error}</p>
                    <button className="btn btn-primary btn-sm" onClick={() => setRetryCount(c => c + 1)}>
                        Try again
                    </button>
                </div>
            )}

            {data && !loading && (
                <div className="peer-content">
                    {/* Left: percentile + headline */}
                    <div className="peer-left">
                        <PercentileArc value={data.percentile} />
                        <div className="peer-rank-badge" style={{
                            background: `${rankColor(data.percentile)}22`,
                            color: rankColor(data.percentile),
                        }}>
                            {rankLabel(data.percentile)}
                        </div>
                        <p className="peer-summary">
                            You outperform <strong>{Math.round(data.percentile)}%</strong> of {data.peerCount} peers with an average score of <strong>{data.userAvgScore}%</strong>.
                        </p>
                    </div>

                    {/* Right: distribution + topic breakdown */}
                    <div className="peer-right">
                        {data.distribution.length > 0 && (
                            <div className="peer-dist-section">
                                <span className="peer-section-label">Score distribution</span>
                                <DistributionChart buckets={data.distribution} />
                                <div className="peer-dist-legend">
                                    <span><span className="peer-legend-dot peer-legend-you" /> You</span>
                                    <span><span className="peer-legend-dot peer-legend-peer" /> Peers</span>
                                </div>
                            </div>
                        )}

                        {data.topicBreakdown.length > 0 && (
                            <div className="peer-topics-section">
                                <span className="peer-section-label">You vs peers by topic</span>
                                {data.topicBreakdown.map((t, i) => <TopicRow key={i} t={t} />)}
                            </div>
                        )}

                        {data.topicBreakdown.length === 0 && data.distribution.length === 0 && (
                            <p className="peer-no-data">Take more quizzes to see topic-level comparisons.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProgressPage() {
    usePageTitle('Progress');
    const [progress, setProgress] = useState<ProgressResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        setLoading(true);
        setError(null);
        api.get<ProgressResponse>('/users/me/progress')
            .then(setProgress)
            .catch(e => setError(e?.message || 'Could not load progress data.'))
            .finally(() => setLoading(false));
    }, [retryCount]);

    const val = (v: number | string | undefined, fallback = '–') =>
        loading ? '–' : v !== undefined ? String(v) : fallback;

    return (
        <div className="progress-page">
            <div className="progress-header animate-fade-in">
                <h1>Learning Analytics</h1>
                <p>Track your progress across all subjects</p>
            </div>

            {error && !progress && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{error}</p>
                    <button className="btn btn-primary btn-sm" onClick={() => setRetryCount(c => c + 1)}>
                        Try again
                    </button>
                </div>
            )}

            {/* Stats Row */}
            <div className="progress-stats animate-fade-in delay-100">
                <div className="progress-stat-card"><div className="progress-stat-icon" style={{ background: 'rgba(143, 163, 194, 0.14)', color: '#8FA3C2' }}><BookOpen size={22} /></div><div><span className="progress-stat-val">{val(progress?.coursesEnrolled)}</span><span className="progress-stat-lbl">Courses</span></div></div>
                <div className="progress-stat-card"><div className="progress-stat-icon" style={{ background: 'rgba(110, 175, 164, 0.14)', color: '#6EAFA4' }}><Award size={22} /></div><div><span className="progress-stat-val">{val(progress?.pendingAssignments)}</span><span className="progress-stat-lbl">Pending</span></div></div>
                <div className="progress-stat-card"><div className="progress-stat-icon" style={{ background: 'rgba(181, 154, 99, 0.14)', color: '#B59A63' }}><Target size={22} /></div><div><span className="progress-stat-val">{loading ? '–' : `${progress?.avgQuizScorePercent ?? 0}%`}</span><span className="progress-stat-lbl">Avg Score</span></div></div>
                <div className="progress-stat-card"><div className="progress-stat-icon" style={{ background: 'rgba(123, 147, 180, 0.14)', color: '#7B93B4' }}><Clock size={22} /></div><div><span className="progress-stat-val">{loading ? '–' : `${progress?.studyTimeHours ?? 0}h`}</span><span className="progress-stat-lbl">Study Time</span></div></div>
                <div className="progress-stat-card"><div className="progress-stat-icon" style={{ background: 'rgba(181, 154, 99, 0.14)', color: '#B59A63' }}><Flame size={22} /></div><div><span className="progress-stat-val">{val(progress?.streakDays)}</span><span className="progress-stat-lbl">Day Streak</span></div></div>
            </div>

            {/* Peer Comparison — live from API */}
            <PeerComparisonWidget />
        </div>
    );
}
