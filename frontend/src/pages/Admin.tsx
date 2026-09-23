import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, Database, ArrowLeft } from 'lucide-react';
import './Admin.css';

const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || 'saarthi-admin-2026';

interface AgentStats {
    document_count: number;
    index_exists: boolean;
    last_indexed: string | null;
    total_chunks: number;
}

interface KBStats {
    agents: Record<string, AgentStats>;
}

const AGENTS = [
    { key: 'notes_agent', label: 'Notes Agent', desc: 'Lecture notes & handwritten PDFs' },
    { key: 'books_agent', label: 'Books Agent', desc: 'Textbooks & reference material' },
    { key: 'video_agent', label: 'Video Agent', desc: 'Video lecture transcripts' },
];

function timeAgo(isoStr: string | null): string {
    if (!isoStr) return 'Never';
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function Admin() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<KBStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        setError('');
        try {
            const res = await fetch('/api/admin/kb/stats', {
                headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
            });
            if (!res.ok) throw new Error(res.status === 403 ? 'Unauthorized' : 'Server error');
            setStats(await res.json());
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);

    const healthyCount = stats
        ? AGENTS.filter(({ key }) => stats.agents[key]?.index_exists).length
        : 0;

    return (
        <div className="admin-page">
            <div className="admin-header">
                <div className="admin-header-left">
                    <button className="admin-back-btn" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft size={14} /> Dashboard
                    </button>
                    <div>
                        <h1>Knowledge Base</h1>
                        <p>Manage source documents and vector indexes for all RAG agents</p>
                    </div>
                </div>
                <button
                    className="admin-refresh-btn"
                    onClick={() => fetchStats(true)}
                    disabled={refreshing}
                >
                    <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
                    Refresh
                </button>
            </div>

            <div className="admin-body">
                {!loading && !error && stats && (
                    <div className="admin-summary-bar">
                        <span className="admin-summary-stat">
                            <strong>{healthyCount}</strong> / {AGENTS.length} agents indexed
                        </span>
                        <span className="admin-summary-divider" />
                        <span className="admin-summary-stat">
                            <strong>
                                {AGENTS.reduce((sum, { key }) => sum + (stats.agents[key]?.total_chunks ?? 0), 0).toLocaleString()}
                            </strong> total chunks
                        </span>
                        <span className="admin-summary-divider" />
                        <span className="admin-summary-stat">
                            <strong>
                                {AGENTS.reduce((sum, { key }) => sum + (stats.agents[key]?.document_count ?? 0), 0)}
                            </strong> documents
                        </span>
                    </div>
                )}

                {loading && <div className="admin-loading">Loading...</div>}
                {error && <div className="admin-error">{error}</div>}

                {stats && (
                    <div className="admin-agents-table">
                        <div className="admin-table-header">
                            <span>Agent</span>
                            <span>Documents</span>
                            <span>Chunks</span>
                            <span>Last Indexed</span>
                            <span>Status</span>
                            <span></span>
                        </div>
                        {AGENTS.map(({ key, label, desc }) => {
                            const s = stats.agents[key];
                            const healthy = s?.index_exists;
                            return (
                                <div key={key} className="admin-table-row">
                                    <div className="admin-agent-cell">
                                        <div className="admin-agent-icon">
                                            <Database size={16} />
                                        </div>
                                        <div>
                                            <div className="admin-agent-name">{label}</div>
                                            <div className="admin-agent-desc">{desc}</div>
                                        </div>
                                    </div>
                                    <span className="admin-cell-value">{s?.document_count ?? 0}</span>
                                    <span className="admin-cell-value">{(s?.total_chunks ?? 0).toLocaleString()}</span>
                                    <span className="admin-cell-value">{timeAgo(s?.last_indexed ?? null)}</span>
                                    <span className={`admin-status-pill ${healthy ? 'ok' : 'warn'}`}>
                                        {healthy
                                            ? <><CheckCircle2 size={12} /> Indexed</>
                                            : <><AlertTriangle size={12} /> Not indexed</>
                                        }
                                    </span>
                                    <button
                                        className="admin-manage-btn"
                                        onClick={() => navigate(`/admin/${key}`)}
                                    >
                                        Manage <ArrowRight size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
