import { useState, useRef, useEffect, useCallback } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import {
    Send, Sparkles, User, Bot, Loader2, BookOpen, Lightbulb, Code2,
    GraduationCap, Plus, Pencil, Trash2, Check, X, Mic, MicOff, Zap, Brain,
    BarChart2, Upload, FileText, Library,
} from 'lucide-react';
import { api, uploadDataset, listDatasets, type ConversationResponse, type ConversationDetailResponse, type SendMessageResponse, type PaginatedResponse, type DatasetItem } from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import EmptyState from '../components/EmptyState';
import MathContent from '../components/MathContent';
import StudyGuidePanel from '../components/StudyGuidePanel';
import './Chat.css';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const GREETING = "Hello! I'm Saarthi, your AI learning companion. I specialize in:\n\n• **Digital Signal Processing** — FFT, filters, transforms\n• **Machine Learning** — Neural networks, optimization\n• **Data Structures** — Trees, graphs, algorithms\n• **Pattern Recognition** — Classification, feature extraction\n\nHow can I help you today?";

interface Citation {
    agent?: string;
    source_file?: string;
    page_number?: number | null;
    snippet?: string;
    number?: number | null;
    source_agent?: string;
}

interface ReactStep {
    agent: string;
    step: number;
    thought: string;
    tools_called: { name: string; args: Record<string, unknown> }[];
    observations: string[];
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    streaming?: boolean;
    citations?: Citation[];
    reactSteps?: ReactStep[];
}

const suggestedTopics = [
    { icon: BookOpen, label: 'Explain Fourier Transform' },
    { icon: Code2, label: 'Binary Search implementation' },
    { icon: Lightbulb, label: 'What is gradient descent?' },
    { icon: GraduationCap, label: 'DSP exam preparation tips' },
];

function messageFromApi(m: { id: string; role: 'user' | 'assistant'; content: string; createdAt: string }): Message {
    return { id: m.id, role: m.role, content: m.content, timestamp: new Date(m.createdAt) };
}

// ── Voice recognition hook ────────────────────────────────────────────────────
function useVoiceInput(onTranscript: (text: string) => void) {
    const [listening, setListening] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    const startListening = useCallback(() => {
        if (!supported) return;
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const rec: SpeechRecognition = new SR();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-IN';
        rec.onresult = (e) => {
            const transcript = Array.from(e.results).map((r) => r[0].transcript).join(' ');
            onTranscript(transcript);
        };
        rec.onerror = () => setListening(false);
        rec.onend = () => setListening(false);
        recognitionRef.current = rec;
        rec.start();
        setListening(true);
    }, [supported, onTranscript]);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        setListening(false);
    }, []);

    return { supported, listening, startListening, stopListening };
}

// ── Message renderer ──────────────────────────────────────────────────────────

// ── Main component ─────────────────────────────────────────────────────────────
export default function ChatPage() {
    usePageTitle('AI Tutor');
    const [conversations, setConversations] = useState<ConversationResponse[]>([]);
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loadingList, setLoadingList] = useState(true);
    const [loadingChat, setLoadingChat] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [planningMode, setPlanningMode] = useState(false);
    const [listRetryCount, setListRetryCount] = useState(0);
    const [datasets, setDatasets] = useState<DatasetItem[]>([]);
    const [datasetUploading, setDatasetUploading] = useState(false);
    const [datasetError, setDatasetError] = useState<string | null>(null);
    const datasetInputRef = useRef<HTMLInputElement>(null);
    const [showStudyGuide, setShowStudyGuide] = useState(false);
    const [isTeacher, setIsTeacher] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    const { supported: voiceSupported, listening, startListening, stopListening } = useVoiceInput(
        (text) => setInput((prev) => prev ? `${prev} ${text}` : text)
    );

    useEffect(() => {
        api.get<{ role?: string }>('/users/me').then(u => {
            setIsTeacher((u.role || '') === 'teacher' || (u.role || '') === 'admin');
        }).catch(() => {});
    }, []);

    const fetchDatasets = useCallback(async () => {
        try {
            const ds = await listDatasets();
            setDatasets(ds);
        } catch { /* non-critical */ }
    }, []);

    useEffect(() => { fetchDatasets(); }, [fetchDatasets]);

    const handleDatasetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!datasetInputRef.current) datasetInputRef.current = e.target;
        e.target.value = '';
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.csv')) {
            setDatasetError('Only CSV files are supported.');
            return;
        }
        const MAX_BYTES = 200 * 1024 * 1024;
        if (file.size > MAX_BYTES) {
            setDatasetError('File exceeds 200 MB limit.');
            return;
        }
        setDatasetError(null);
        setDatasetUploading(true);
        try {
            await uploadDataset(file, currentId ?? undefined);
            await fetchDatasets();
        } catch (err) {
            setDatasetError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setDatasetUploading(false);
        }
    };

    const fetchConversations = useCallback(async () => {
        setLoadingList(true);
        try {
            const res = await api.get<PaginatedResponse<ConversationResponse>>('/chat/conversations', { limit: 50, offset: 0 });
            setConversations(res.items || []);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to load conversations';
            setError(msg.includes('401') ? 'Please log in to use chat.' : msg);
        } finally {
            setLoadingList(false);
        }
    }, [listRetryCount]);

    useEffect(() => { fetchConversations(); }, [fetchConversations]);

    const loadConversation = useCallback(async (id: string) => {
        setEditingId(null);
        setCurrentId(id);
        setLoadingChat(true);
        setError(null);
        try {
            const res = await api.get<ConversationDetailResponse>(`/chat/conversations/${id}`);
            setMessages((res.messages || []).map(messageFromApi));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load conversation');
            setMessages([]);
        } finally {
            setLoadingChat(false);
        }
    }, []);

    const startRename = (e: React.MouseEvent, c: ConversationResponse) => {
        e.stopPropagation();
        setEditingId(c.id);
        setEditTitle(c.title || 'New Chat');
        setTimeout(() => renameInputRef.current?.focus(), 0);
    };

    const submitRename = async (id: string) => {
        const title = editTitle.trim() || 'New Chat';
        try {
            await api.patch<ConversationResponse>(`/chat/conversations/${id}`, { title });
            setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to rename');
        }
        setEditingId(null);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirmId) return;
        const id = deleteConfirmId;
        setDeleteConfirmId(null);
        try {
            await api.delete(`/chat/conversations/${id}`);
            setConversations((prev) => prev.filter((c) => c.id !== id));
            if (currentId === id) { setCurrentId(null); setMessages([]); }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to delete');
        }
    };

    const handleNewChat = async () => {
        setSending(true);
        try {
            const conv = await api.post<ConversationResponse>('/chat/conversations', { title: 'New Chat' });
            setConversations((prev) => [conv, ...prev]);
            setCurrentId(conv.id);
            setMessages([]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create chat');
        } finally {
            setSending(false);
        }
    };

    // ── Streaming send ──────────────────────────────────────────────────────────
    const sendMessage = async () => {
        if (!input.trim() || sending) return;
        const q = input.trim();
        setInput('');
        setError(null);

        let conversationId = currentId;
        if (!conversationId) {
            setSending(true);
            try {
                const conv = await api.post<ConversationResponse>('/chat/conversations', { title: 'New Chat' });
                setConversations((prev) => [conv, ...prev]);
                setCurrentId(conv.id);
                conversationId = conv.id;
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to create chat');
                setSending(false);
                return;
            }
            setSending(false);
        }

        // Optimistic user message
        const userMsgId = `u-${Date.now()}`;
        const streamMsgId = `s-${Date.now()}`;
        setMessages((prev) => [
            ...prev,
            { id: userMsgId, role: 'user', content: q, timestamp: new Date() },
            { id: streamMsgId, role: 'assistant', content: '', timestamp: new Date(), streaming: true },
        ]);
        setSending(true);

        // Send up to last 20 messages — backend memory service handles trimming/summarization
        const historyMessages = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));

        try {
            const ctrl = new AbortController();
            abortRef.current = ctrl;

            const storedToken = (() => { try { return JSON.parse(localStorage.getItem('saarthi-auth') || '{}')?.state?.token ?? null; } catch { return null; } })();
            const res = await fetch(`${BASE_URL}/chat/stream`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {}),
                    ...(BASE_URL.includes('ngrok') ? { 'ngrok-skip-browser-warning': '1' } : {}),
                },
                body: JSON.stringify({
                    message: q,
                    conversationHistory: historyMessages,
                    conversationId,
                    planning: planningMode,
                }),
                signal: ctrl.signal,
            });

            if (!res.ok || !res.body) throw new Error('Stream request failed');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';  // keep incomplete line for next chunk

                let isMeta = false;
                for (const line of lines) {
                    if (line.startsWith('event: meta')) { isMeta = true; continue; }
                    if (isMeta && line.startsWith('data: ')) {
                        try {
                            const meta = JSON.parse(line.slice(6));
                            if (meta.citations?.length || meta.react_steps?.length) {
                                setMessages((prev) =>
                                    prev.map((m) =>
                                        m.id === streamMsgId ? {
                                            ...m,
                                            citations: meta.citations || [],
                                            reactSteps: meta.react_steps || [],
                                        } : m
                                    )
                                );
                            }
                        } catch { /* ignore parse errors */ }
                        isMeta = false;
                        continue;
                    }
                    if (!line.startsWith('data: ')) continue;
                    const payload = line.slice(6);
                    if (payload === '[DONE]') break;
                    if (payload.startsWith('[ERROR]')) {
                        throw new Error(payload.slice(8));
                    }
                    accumulated += payload.replace(/\\n/g, '\n');
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === streamMsgId
                                ? { ...m, content: accumulated, streaming: true }
                                : m
                        )
                    );
                }
            }

            // Mark streaming done, update conversation list
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === streamMsgId ? { ...m, streaming: false } : m
                )
            );
            fetchConversations();

        } catch (e: any) {
            if (e?.name === 'AbortError') return;
            // Fallback to non-streaming
            try {
                const data = await api.post<SendMessageResponse>(
                    `/chat/conversations/${conversationId}/messages`,
                    { message: q }
                );
                setMessages((prev) => {
                    const filtered = prev.filter((m) => m.id !== userMsgId && m.id !== streamMsgId);
                    return [...filtered, messageFromApi(data.userMessage), messageFromApi(data.assistantMessage)];
                });
                fetchConversations();
            } catch (fallbackErr) {
                setMessages((prev) => prev.filter((m) => m.id !== userMsgId && m.id !== streamMsgId));
                setError(fallbackErr instanceof Error ? fallbackErr.message : 'Failed to send message');
            }
        } finally {
            setSending(false);
            abortRef.current = null;
        }
    };

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const displayMessages = messages.length === 0 && !loadingChat
        ? [{ id: 'greeting', role: 'assistant' as const, content: GREETING, timestamp: new Date() }]
        : messages;

    return (
        <div className="chat-page">
            {/* Sidebar */}
            <div className="chat-sidebar">
                <button
                    type="button"
                    className="btn btn-primary chat-new-btn"
                    onClick={handleNewChat}
                    disabled={sending || loadingList}
                >
                    {sending && !currentId ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    {' '}New Chat
                </button>
                <div className="chat-history">
                    <p className="chat-history-label">Recent Conversations</p>
                    {loadingList ? (
                        <div className="chat-history-loading"><Loader2 size={14} className="animate-spin" /> Loading...</div>
                    ) : error && conversations.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 1rem', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{error}</p>
                            <button className="btn btn-primary btn-sm" onClick={() => { setError(null); setListRetryCount(c => c + 1); }}>
                                Try again
                            </button>
                        </div>
                    ) : conversations.length === 0 ? (
                        <EmptyState icon={<Sparkles size={28} />} title="No conversations yet" description="Start a new chat to get help from Saarthi." />
                    ) : (
                        conversations.map((c) => (
                            <div key={c.id} className={`chat-history-item-wrap ${currentId === c.id ? 'active' : ''}`}>
                                <button type="button" className="chat-history-item" onClick={() => loadConversation(c.id)}>
                                    {editingId === c.id ? (
                                        <input
                                            ref={renameInputRef}
                                            className="chat-history-rename-input"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') submitRename(c.id); if (e.key === 'Escape') setEditingId(null); }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <><Sparkles size={14} className="chat-history-icon" /><span className="chat-history-title">{c.title || 'New Chat'}</span></>
                                    )}
                                </button>
                                {editingId === c.id ? (
                                    <div className="chat-history-actions">
                                        <button type="button" className="chat-history-action" onClick={() => submitRename(c.id)}><Check size={14} /></button>
                                        <button type="button" className="chat-history-action" onClick={() => setEditingId(null)}><X size={14} /></button>
                                    </div>
                                ) : (
                                    <div className="chat-history-actions">
                                        <button type="button" className="chat-history-action" onClick={(e) => startRename(e, c)}><Pencil size={14} /></button>
                                        <button type="button" className="chat-history-action chat-history-action-delete" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(c.id); }}><Trash2 size={14} /></button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Dataset upload section */}
                <div className="chat-dataset-section">
                    <div className="chat-dataset-header">
                        <BarChart2 size={14} />
                        <span>Data Analysis</span>
                    </div>
                    <label className={`chat-dataset-upload-btn ${datasetUploading ? 'disabled' : ''}`}>
                        {datasetUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        {datasetUploading ? 'Uploading…' : 'Upload CSV'}
                        <input
                            ref={datasetInputRef}
                            type="file"
                            accept=".csv"
                            style={{ display: 'none' }}
                            onChange={handleDatasetUpload}
                            disabled={datasetUploading}
                        />
                    </label>
                    {datasetError && <p className="chat-dataset-error">{datasetError}</p>}
                    {datasets.length > 0 && (
                        <ul className="chat-dataset-list">
                            {datasets.map((d) => (
                                <li key={d.filename} className="chat-dataset-item">
                                    <FileText size={12} />
                                    <span className="chat-dataset-name" title={d.filename}>{d.filename}</span>
                                    <span className="chat-dataset-size">{d.size_kb} KB</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="chat-dataset-hint">Max 200 MB · CSV only</p>
                </div>
            </div>

            {/* Main */}
            <div className="chat-main">
                {/* Study Guide toggle button */}
                <div className="chat-topbar">
                    <button
                        type="button"
                        className={`chat-guide-toggle ${showStudyGuide ? 'active' : ''}`}
                        onClick={() => setShowStudyGuide(v => !v)}
                        title="Study Guides"
                    >
                        <Library size={15} />
                        Study Guides
                    </button>
                </div>
                {error && <div className="chat-error" role="alert">{error}</div>}
                {loadingChat && messages.length === 0 ? (
                    <div className="chat-loading-state"><Loader2 size={24} className="animate-spin" /> Loading conversation...</div>
                ) : (
                    <>
                        <div className="chat-messages">
                            {displayMessages.map((msg) => (
                                <div key={msg.id} className={`chat-msg ${msg.role}`}>
                                    <div className={`chat-msg-avatar ${msg.role}`}>
                                        {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                                    </div>
                                    <div className="chat-msg-content">
                                        <div className="chat-msg-header">
                                            <span className="chat-msg-name">{msg.role === 'user' ? 'You' : 'Saarthi AI'}</span>
                                            <span className="chat-msg-time">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        {msg.streaming && msg.content === '' ? (
                                            <div className="chat-typing">
                                                <Loader2 size={16} className="animate-spin" />
                                                <span>Saarthi is thinking...</span>
                                            </div>
                                        ) : (
                                            <>
                                                {msg.reactSteps && msg.reactSteps.length > 0 && !msg.streaming && (
                                                    <details className="chat-thinking">
                                                        <summary className="chat-thinking-title">🧠 Agent thinking ({msg.reactSteps.length} step{msg.reactSteps.length > 1 ? 's' : ''})</summary>
                                                        <div className="chat-thinking-body">
                                                            {msg.reactSteps.map((s, i) => (
                                                                <div key={i} className="chat-thinking-step">
                                                                    <div className="chat-thinking-step-header">Step {s.step} · {s.agent.replace('_agent', '')}</div>
                                                                    {s.thought && <div className="chat-thinking-thought">💭 {s.thought.slice(0, 200)}{s.thought.length > 200 ? '…' : ''}</div>}
                                                                    {s.tools_called.map((t, j) => (
                                                                        <div key={j} className="chat-thinking-tool">🔧 {t.name}({JSON.stringify(t.args).slice(0, 80)})</div>
                                                                    ))}
                                                                    {s.observations.map((o, j) => (
                                                                        <div key={j} className="chat-thinking-obs">📄 {o.slice(0, 150)}{o.length > 150 ? '…' : ''}</div>
                                                                    ))}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </details>
                                                )}
                                                <MathContent content={msg.content} streaming={msg.streaming} />
                                                {msg.citations && msg.citations.length > 0 && !msg.streaming && (
                                                    <div className="chat-citations">
                                                        <div className="chat-citations-title">📚 Sources</div>
                                                        {msg.citations.map((c, i) => (
                                                            <div key={i} className="chat-citation-item">
                                                                <span className="chat-citation-badge">
                                                                    {c.number != null ? `[${c.number}]` : `[${i + 1}]`}
                                                                </span>
                                                                <span className="chat-citation-file">
                                                                    {c.source_file || c.agent || 'Source'}
                                                                    {c.page_number != null ? ` · p.${c.page_number}` : ''}
                                                                </span>
                                                                {c.snippet && (
                                                                    <span className="chat-citation-snippet">"{c.snippet.slice(0, 120)}{c.snippet.length > 120 ? '…' : ''}"</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={endRef} />
                        </div>

                        {displayMessages.length <= 1 && (
                            <div className="chat-suggestions">
                                {suggestedTopics.map((topic, i) => {
                                    const Icon = topic.icon;
                                    return (
                                        <button key={i} type="button" className="chat-suggestion-btn" onClick={() => setInput(topic.label)}>
                                            <Icon size={16} /> {topic.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="chat-input-area">
                            <div className="chat-mode-toggle">
                                <button
                                    type="button"
                                    className={`chat-mode-btn ${!planningMode ? 'active' : ''}`}
                                    onClick={() => setPlanningMode(false)}
                                    title="Fast: single retrieval, quick answer"
                                >
                                    <Zap size={13} /> Fast
                                </button>
                                <button
                                    type="button"
                                    className={`chat-mode-btn ${planningMode ? 'active' : ''}`}
                                    onClick={() => setPlanningMode(true)}
                                    title="Planning: ReAct loop, shows agent thinking"
                                >
                                    <Brain size={13} /> Planning
                                </button>
                            </div>
                            <div className="chat-input-wrapper">
                                {voiceSupported && (
                                    <button
                                        type="button"
                                        className={`chat-voice-btn ${listening ? 'active' : ''}`}
                                        onClick={listening ? stopListening : startListening}
                                        title={listening ? 'Stop listening' : 'Voice input'}
                                        disabled={sending}
                                    >
                                        {listening ? <MicOff size={16} /> : <Mic size={16} />}
                                    </button>
                                )}
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={listening ? 'Listening...' : 'Ask Saarthi anything about your subjects...'}
                                    rows={1}
                                    disabled={sending}
                                />
                                <button
                                    type="button"
                                    className="chat-send-btn"
                                    onClick={sendMessage}
                                    disabled={!input.trim() || sending}
                                >
                                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </div>
                            <p className="chat-input-hint">
                                Enter to send · Shift+Enter for new line
                                {voiceSupported && ' · Mic for voice input'}
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Study Guide Panel — slides in from right */}
            {showStudyGuide && (
                <StudyGuidePanel
                    isTeacher={isTeacher}
                    onUsePrompt={(text) => { setInput(text); setShowStudyGuide(false); inputRef.current?.focus(); }}
                    onClose={() => setShowStudyGuide(false)}
                />
            )}

            <ConfirmModal
                open={deleteConfirmId !== null}
                title="Delete conversation"
                message="This conversation will be permanently deleted. This cannot be undone."
                confirmLabel="Delete"
                variant="danger"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteConfirmId(null)}
            />
        </div>
    );
}
