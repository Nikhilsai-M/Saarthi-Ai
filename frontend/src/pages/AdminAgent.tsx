import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2, UploadCloud, RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import './AdminAgent.css';

const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || 'saarthi-admin-2026';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const AGENT_META: Record<string, { label: string; desc: string }> = {
    notes_agent: { label: 'Notes Agent', desc: 'Lecture notes & handwritten PDFs' },
    books_agent: { label: 'Books Agent', desc: 'Textbooks & reference material' },
    video_agent: { label: 'Video Agent', desc: 'Video lecture transcripts' },
};

interface DocItem {
    name: string;
    size_kb: number;
    uploaded_at: string;
}

interface IndexStatusResponse {
    job_id: string;
    agent: string;
    status: string;
    progress: string;
    documents_processed: number;
    total_documents: number;
    chunks_created: number;
}

function authHeaders() {
    return { Authorization: `Bearer ${ADMIN_TOKEN}` };
}

export default function AdminAgent() {
    const { agentKey } = useParams<{ agentKey: string }>();
    const navigate = useNavigate();
    const meta = AGENT_META[agentKey || ''];

    const [docs, setDocs] = useState<DocItem[]>([]);
    const [docsLoading, setDocsLoading] = useState(true);
    const [docsError, setDocsError] = useState('');

    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [jobId, setJobId] = useState<string | null>(null);
    const [jobStatus, setJobStatus] = useState<IndexStatusResponse | null>(null);
    const [indexLogs, setIndexLogs] = useState<string[]>([]);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [deletingFile, setDeletingFile] = useState<string | null>(null);

    if (!meta) {
        return (
            <div className="admin-agent-page">
                <div className="admin-error">Unknown agent: {agentKey}</div>
            </div>
        );
    }

    const fetchDocs = async () => {
        setDocsLoading(true);
        setDocsError('');
        try {
            const res = await fetch(`${API}/admin/kb/docs?agent_name=${agentKey}`, {
                headers: authHeaders(),
            });
            if (!res.ok) throw new Error('Failed to load documents');
            const data = await res.json();
            setDocs(data.documents);
        } catch (e: any) {
            setDocsError(e.message);
        } finally {
            setDocsLoading(false);
        }
    };

    useEffect(() => {
        fetchDocs();
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [agentKey]);

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        setUploadMsg(null);
        const form = new FormData();
        form.append('agent_name', agentKey!);
        Array.from(files).forEach((f) => form.append('files', f));
        try {
            const res = await fetch(`${API}/admin/kb/upload`, {
                method: 'POST',
                headers: authHeaders(),
                body: form,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
                throw new Error(err.detail || 'Upload failed');
            }
            const data = await res.json();
            setUploadMsg({ type: 'success', text: `Uploaded ${data.files.length} file${data.files.length !== 1 ? 's' : ''} successfully` });
            await fetchDocs();
        } catch (e: any) {
            setUploadMsg({ type: 'error', text: e.message });
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (filename: string) => {
        if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;
        setDeletingFile(filename);
        try {
            const res = await fetch(
                `${API}/admin/kb/docs?agent_name=${agentKey}&filename=${encodeURIComponent(filename)}`,
                { method: 'DELETE', headers: authHeaders() }
            );
            if (!res.ok) throw new Error('Delete failed');
            await fetchDocs();
        } catch (e: any) {
            alert(`Delete failed: ${e.message}`);
        } finally {
            setDeletingFile(null);
        }
    };

    const startPolling = (id: string) => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`${API}/admin/kb/index/status?job_id=${id}`, {
                    headers: authHeaders(),
                });
                if (!res.ok) return;
                const status: IndexStatusResponse = await res.json();
                setJobStatus(status);
                setIndexLogs((prev) => {
                    if (prev[prev.length - 1] !== status.progress) return [...prev, status.progress];
                    return prev;
                });
                if (status.status !== 'running') {
                    clearInterval(pollRef.current!);
                    pollRef.current = null;
                }
            } catch { /* ignore poll errors */ }
        }, 2000);
    };

    const handleReindex = async () => {
        setIndexLogs(['Queuing index job...']);
        setJobStatus(null);
        try {
            const res = await fetch(`${API}/admin/kb/index`, {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ agent_name: agentKey }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: 'Failed to start index' }));
                throw new Error(err.detail || 'Failed to start index');
            }
            const data = await res.json();
            setJobId(data.job_id);
            startPolling(data.job_id);
        } catch (e: any) {
            setIndexLogs([`Error: ${e.message}`]);
        }
    };

    const isIndexing = jobStatus?.status === 'running' || (jobId !== null && !jobStatus);

    return (
        <div className="admin-agent-page">
            <div className="admin-agent-header">
                <button className="admin-back-btn" onClick={() => navigate('/admin')}>
                    <ArrowLeft size={14} /> Back
                </button>
                <div className="admin-agent-header-info">
                    <h1>{meta.label}</h1>
                    <p>{meta.desc}</p>
                </div>
            </div>

            <div className="admin-agent-body">

                {/* Documents */}
                <div className="admin-panel">
                    <div className="admin-panel-header">
                        <h2>Source Documents</h2>
                        <span className="admin-doc-count">{docs.length} file{docs.length !== 1 ? 's' : ''}</span>
                    </div>

                    {docsLoading && <div className="admin-loading">Loading...</div>}
                    {docsError && <div className="admin-error">{docsError}</div>}

                    {!docsLoading && !docsError && docs.length === 0 && (
                        <div className="admin-empty">No documents uploaded yet. Upload files below to get started.</div>
                    )}

                    {!docsLoading && docs.length > 0 && (
                        <table className="admin-docs-table">
                            <thead>
                                <tr>
                                    <th>Filename</th>
                                    <th>Size</th>
                                    <th>Uploaded</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {docs.map((doc) => (
                                    <tr key={doc.name}>
                                        <td className="admin-doc-name">{doc.name}</td>
                                        <td>{doc.size_kb} KB</td>
                                        <td>{new Date(doc.uploaded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td>
                                            <button
                                                className="admin-delete-btn"
                                                onClick={() => handleDelete(doc.name)}
                                                disabled={deletingFile === doc.name}
                                                title="Delete file"
                                            >
                                                {deletingFile === doc.name
                                                    ? <Loader2 size={14} className="spin" />
                                                    : <Trash2 size={14} />
                                                }
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Upload */}
                <div className="admin-panel">
                    <div className="admin-panel-header">
                        <h2>Upload Documents</h2>
                    </div>

                    <div
                        className={`admin-dropzone ${dragOver ? 'drag-over' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <UploadCloud size={28} strokeWidth={1.5} />
                        <p className="admin-dropzone-title">Drop files here or click to browse</p>
                        <p className="admin-dropzone-sub">PDF and TXT files · Max 50 MB each</p>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.txt"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(e) => handleUpload(e.target.files)}
                    />

                    {uploadMsg && (
                        <div className={`admin-upload-msg ${uploadMsg.type}`}>
                            {uploadMsg.type === 'success'
                                ? <CheckCircle2 size={14} />
                                : <XCircle size={14} />
                            }
                            {uploadMsg.text}
                        </div>
                    )}

                    <div className="admin-upload-actions">
                        <button
                            className="btn btn-outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            {uploading ? <><Loader2 size={14} className="spin" /> Uploading...</> : <><UploadCloud size={14} /> Upload Files</>}
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleReindex}
                            disabled={!!isIndexing}
                        >
                            {isIndexing
                                ? <><Loader2 size={14} className="spin" /> Indexing...</>
                                : <><RefreshCw size={14} /> Re-index Knowledge Base</>
                            }
                        </button>
                    </div>
                </div>

                {/* Index Log */}
                {indexLogs.length > 0 && (
                    <div className="admin-panel">
                        <div className="admin-panel-header">
                            <h2>Indexing Log</h2>
                            {jobStatus && (
                                <span className={`admin-status-pill ${jobStatus.status === 'complete' ? 'ok' : jobStatus.status === 'failed' ? 'warn' : 'running'}`}>
                                    {jobStatus.status === 'complete' && <CheckCircle2 size={12} />}
                                    {jobStatus.status === 'failed' && <XCircle size={12} />}
                                    {jobStatus.status === 'running' && <Loader2 size={12} className="spin" />}
                                    {jobStatus.status}
                                </span>
                            )}
                        </div>
                        <div className="admin-index-log">
                            {indexLogs.map((line, i) => (
                                <div key={i} className="admin-log-line">{line}</div>
                            ))}
                            {jobStatus?.status === 'complete' && (
                                <div className="admin-log-line success">
                                    Done — {jobStatus.total_documents} docs processed, {jobStatus.chunks_created.toLocaleString()} chunks created
                                </div>
                            )}
                            {jobStatus?.status === 'failed' && (
                                <div className="admin-log-line error">Job failed</div>
                            )}
                        </div>
                        {jobStatus?.status === 'complete' && (
                            <div className="admin-index-stats">
                                <div className="admin-index-stat">
                                    <span className="admin-index-stat-val">{jobStatus.total_documents}</span>
                                    <span className="admin-index-stat-label">Documents</span>
                                </div>
                                <div className="admin-index-stat">
                                    <span className="admin-index-stat-val">{jobStatus.chunks_created.toLocaleString()}</span>
                                    <span className="admin-index-stat-label">Chunks</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
