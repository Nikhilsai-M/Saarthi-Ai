import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Play, Pause, RotateCcw, Volume2, Maximize, FileText, CheckCircle2, ChevronRight, Clock, Plus, Sparkles, Send } from 'lucide-react';
import { api, type VideoResponse, type VideoNoteResponse } from '../lib/api';
import { usePageTitle } from '../lib/usePageTitle';
import MathContent from '../components/MathContent';
import './VideoPlayer.css';

interface Chapter {
    time: number;
    title: string;
}

function parseChapters(chaptersJson?: string | null): Chapter[] {
    if (!chaptersJson || !chaptersJson.trim()) return [];
    try {
        const raw = JSON.parse(chaptersJson) as unknown;
        if (!Array.isArray(raw)) return [];
        return raw.map((item: unknown) => {
            const o = item as Record<string, unknown>;
            const time = typeof o.time === 'number' ? o.time : Number(o.time) || 0;
            const title = typeof o.title === 'string' ? o.title : String(o.title || '');
            return { time, title };
        }).filter((c) => c.title || c.time >= 0);
    } catch {
        return [];
    }
}

export default function VideoPlayerPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);

    const [video, setVideo] = useState<VideoResponse | null>(null);
    usePageTitle(video?.title ?? 'Video Player');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notes, setNotes] = useState<VideoNoteResponse[]>([]);
    const [newNote, setNewNote] = useState('');
    const [noteTimeSeconds, setNoteTimeSeconds] = useState(0);

    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(1);
    const [playbackRate, setPlaybackRate] = useState(1);

    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatBottomRef = useRef<HTMLDivElement>(null);

    const isEmbed = Boolean(video?.embedUrl);
    const chapters: Chapter[] = video ? parseChapters(video.chaptersJson) : [];
    const duration = video?.durationSeconds ?? 0;

    useEffect(() => {
        if (!id) { setError('Invalid video'); setLoading(false); return; }
        let cancelled = false;
        setLoading(true);
        setError(null);
        api.get<VideoResponse>(`/videos/${id}`)
            .then((v) => { if (!cancelled) setVideo(v); })
            .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Video not found'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [id]);

    useEffect(() => {
        if (!id || !video) return;
        let cancelled = false;
        api.get<VideoNoteResponse[]>(`/videos/${id}/notes`)
            .then((list) => { if (!cancelled) setNotes(list || []); })
            .catch(() => { if (!cancelled) setNotes([]); });
        return () => { cancelled = true; };
    }, [id, video]);

    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const togglePlay = () => {
        if (videoRef.current) {
            if (playing) videoRef.current.pause();
            else videoRef.current.play();
            setPlaying(!playing);
        }
    };

    const handleLoadedMetadata = () => {
        const saved = localStorage.getItem(`saarthi_vpos_${id}`);
        if (saved && videoRef.current) {
            const t = parseFloat(saved);
            if (t > 5 && t < (videoRef.current.duration - 10)) videoRef.current.currentTime = t;
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const t = videoRef.current.currentTime;
            setCurrentTime(t);
            setNoteTimeSeconds(Math.floor(t));
            if (id && Math.floor(t) % 5 === 0) localStorage.setItem(`saarthi_vpos_${id}`, String(t));
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        return `${m}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
    };

    const seekTo = (time: number) => {
        if (videoRef.current) { videoRef.current.currentTime = time; setCurrentTime(time); setNoteTimeSeconds(Math.floor(time)); }
    };

    const addNote = async () => {
        if (!newNote.trim() || !id) return;
        const timeSeconds = isEmbed ? noteTimeSeconds : Math.floor(currentTime);
        try {
            const created = await api.post<VideoNoteResponse>(`/videos/${id}/notes`, { timeSeconds, text: newNote.trim() });
            setNotes((prev) => [...prev, created].sort((a, b) => a.timeSeconds - b.timeSeconds));
            setNewNote('');
        } catch { /* ignore */ }
    };

    const sendChatMessage = async () => {
        if (!chatInput.trim() || chatLoading || !video) return;
        const userMsg = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatLoading(true);
        try {
            const res = await api.post<{ response: string }>('/chat/message', {
                message: userMsg,
                conversationHistory: chatMessages.map(m => ({ role: m.role, content: m.content })),
                contextVideoId: parseInt(video.id),
                contextVideoTitle: video.title,
            });
            setChatMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
        } catch {
            setChatMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
        } finally {
            setChatLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="vp-page">
                <div className="vp-left">
                    <div className="skeleton" style={{ height: '3rem', borderRadius: '0.5rem', marginBottom: '1rem' }} />
                    <div className="skeleton" style={{ flex: 1, borderRadius: '0.75rem' }} />
                </div>
                <aside className="vp-ai-sidebar">
                    <div className="skeleton" style={{ height: '3.5rem', borderRadius: 0 }} />
                    <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div className="skeleton" style={{ height: '4rem', borderRadius: '0.5rem' }} />
                        <div className="skeleton" style={{ height: '4rem', borderRadius: '0.5rem' }} />
                    </div>
                </aside>
            </div>
        );
    }

    if (error || !video) {
        return (
            <div className="vp-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--gray-500)', marginBottom: '1rem' }}>{error || 'Video not found'}</p>
                <button type="button" className="btn btn-primary" onClick={() => navigate('/videos')}>← Back to Library</button>
            </div>
        );
    }

    return (
        <div className="vp-page">
            {/* ── Left: video + notes + chapters ── */}
            <div className="vp-left">
                <div className="vp-header">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/videos')}>← Back</button>
                    <h1 className="vp-title">{video.title}</h1>
                </div>

                <div className="vp-video-wrap">
                    {isEmbed ? (
                        <iframe
                            src={video.embedUrl!}
                            title={video.title}
                            className="vp-video vp-iframe"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                src={video.url}
                                className="vp-video"
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onClick={togglePlay}
                            />
                            <div className="vp-controls-overlay">
                                <div className="vp-progress" onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    seekTo((e.clientX - rect.left) / rect.width * duration);
                                }}>
                                    <div className="vp-progress-bg">
                                        <div className="vp-progress-fill" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
                                    </div>
                                    {chapters.map((chap, i) => (
                                        <div key={i} className="vp-chapter-marker" style={{ left: `${duration ? (chap.time / duration) * 100 : 0}%` }} title={chap.title} />
                                    ))}
                                </div>
                                <div className="vp-controls-row">
                                    <div className="vp-controls-left">
                                        <button type="button" onClick={togglePlay} className="vp-ctrl-btn">
                                            {playing ? <Pause size={20} /> : <Play size={20} />}
                                        </button>
                                        <button type="button" className="vp-ctrl-btn" onClick={() => seekTo(currentTime - 10)}>
                                            <RotateCcw size={18} />
                                        </button>
                                        <div className="vp-volume">
                                            <Volume2 size={16} />
                                            <input type="range" min={0} max={1} step={0.1} value={volume}
                                                onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); if (videoRef.current) videoRef.current.volume = v; }}
                                                className="vp-volume-slider"
                                            />
                                        </div>
                                        <span className="vp-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
                                    </div>
                                    <div className="vp-controls-right">
                                        <select className="vp-speed" value={playbackRate} onChange={(e) => {
                                            const r = parseFloat(e.target.value); setPlaybackRate(r);
                                            if (videoRef.current) videoRef.current.playbackRate = r;
                                        }}>
                                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => <option key={r} value={r}>{r}x</option>)}
                                        </select>
                                        <button type="button" className="vp-ctrl-btn" onClick={() => videoRef.current?.requestFullscreen()}>
                                            <Maximize size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Chapters + Notes below video */}
                <div className="vp-bottom">
                    {chapters.length > 0 && (
                        <div className="vp-chapters">
                            <p className="vp-section-label">Chapters</p>
                            <div className="vp-chapters-list">
                                {chapters.map((chap, i) => {
                                    const isActive = currentTime >= chap.time && (i === chapters.length - 1 || currentTime < chapters[i + 1].time);
                                    return (
                                        <button key={i} type="button" className={`vp-chap-item ${isActive ? 'active' : ''}`} onClick={() => seekTo(chap.time)}>
                                            <div className="vp-chap-status">
                                                {!isEmbed && currentTime > chap.time + 30
                                                    ? <CheckCircle2 size={14} style={{ color: '#10B981' }} />
                                                    : <div className="vp-chap-dot" />}
                                            </div>
                                            <span className="vp-chap-title">{chap.title}</span>
                                            <span className="vp-chap-time">{formatTime(chap.time)}</span>
                                            {isActive && <ChevronRight size={14} style={{ color: 'var(--primary)', marginLeft: 'auto' }} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="vp-notes">
                        <p className="vp-section-label"><FileText size={14} /> My Notes</p>
                        <div className="vp-add-note">
                            <span className="vp-timestamp"><Clock size={11} /> {formatTime(isEmbed ? noteTimeSeconds : currentTime)}</span>
                            <input
                                type="text"
                                className="input"
                                placeholder="Add a timestamped note..."
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addNote()}
                            />
                            <button type="button" className="btn btn-primary btn-sm" onClick={addNote}><Plus size={13} /></button>
                        </div>
                        <div className="vp-notes-list">
                            {notes.length === 0
                                ? <p className="vp-empty">No notes yet.</p>
                                : notes.map((n) => (
                                    <div key={n.id} className="vp-note-item" onClick={() => !isEmbed && seekTo(n.timeSeconds)}>
                                        <span className="vp-note-time">{formatTime(n.timeSeconds)}</span>
                                        <p className="vp-note-text">{n.text}</p>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Right: AI chat panel (same as PDF sidebar) ── */}
            <aside className="vp-ai-sidebar">
                <div className="vp-ai-header">
                    <Sparkles size={18} className="vp-ai-icon" />
                    <h2 className="vp-ai-title">Ask AI</h2>
                </div>
                <p className="vp-ai-subtitle">Ask anything about this lecture. AI answers from the video content.</p>
                <div className="vp-ai-chat">
                    <div className="vp-ai-messages">
                        {chatMessages.length === 0 && (
                            <p className="vp-ai-empty">No messages yet. Ask anything about this video.</p>
                        )}
                        {chatMessages.map((msg, i) => (
                            <div key={i} className={`vp-ai-msg vp-ai-msg-${msg.role}`}>
                                <span className="vp-ai-msg-role">{msg.role === 'user' ? 'You' : 'Saarthi'}</span>
                                <div className="vp-ai-msg-content">
                                    {msg.role === 'assistant'
                                        ? <MathContent content={msg.content} streaming={false} />
                                        : msg.content
                                    }
                                </div>
                            </div>
                        ))}
                        {chatLoading && (
                            <div className="vp-ai-msg vp-ai-msg-assistant">
                                <span className="vp-ai-msg-role">Saarthi</span>
                                <div className="vp-ai-msg-content vp-ai-msg-thinking">Thinking…</div>
                            </div>
                        )}
                        <div ref={chatBottomRef} />
                    </div>
                    <div className="vp-ai-input-wrap">
                        <input
                            type="text"
                            className="input vp-ai-input"
                            placeholder="Ask about this video…"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                            disabled={chatLoading}
                        />
                        <button
                            type="button"
                            className="btn btn-primary vp-ai-send"
                            onClick={sendChatMessage}
                            disabled={!chatInput.trim() || chatLoading}
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    );
}
