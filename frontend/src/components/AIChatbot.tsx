import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, User, Bot, Paperclip, CheckCircle2 } from 'lucide-react';
import { LogoIcon } from './LogoIcon';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import MathContent from './MathContent';
import './AIChatbot.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    preview?: ActionPreview;   // only for assistant messages that need confirmation
}

interface TopicPreview {
    title: string;
    assignments: string[];
    materials: string[];
}

interface CoursePreview {
    title: string;
    code: string;
    instructor: string;
    description: string;
    topics: TopicPreview[];
    sourceFileUrl?: string;
}

interface VideoPreview {
    title: string;
    url: string;
    youtubeId: string;
}

interface PlaylistPreview {
    playlistTitle: string;
    videos: VideoPreview[];
    courseId?: string;
    topic?: string;
}

interface MaterialPreview {
    title: string;
    description: string;
    type: string;
    fileUrl?: string;
    courseId?: string;
    topic?: string;
}

interface ActionPreview {
    intent: 'create_course' | 'playlist_import' | 'add_material';
    coursePreview?: CoursePreview;
    playlistPreview?: PlaylistPreview;
    materialPreview?: MaterialPreview;
    question?: string;
}

interface Course {
    id: string;
    title: string;
    code: string;
}

interface AIChatbotProps {
    position?: 'bottom-right' | 'bottom-left';
}

// ── Preview card components ───────────────────────────────────────────────────

function CoursePreviewCard({ preview, onConfirm, onCancel, loading }: {
    preview: CoursePreview;
    onConfirm: (p: CoursePreview) => void;
    onCancel: () => void;
    loading: boolean;
}) {
    const [title, setTitle] = useState(preview.title || 'New Course');
    const [code, setCode] = useState(preview.code || 'COURSE101');

    return (
        <div className="acb-preview-card">
            <div className="acb-preview-header">
                <CheckCircle2 size={15} className="acb-preview-icon" />
                <span>Course structure extracted — review &amp; confirm</span>
            </div>
            <div className="acb-preview-body">
                <div className="acb-preview-field">
                    <label className="acb-preview-label">Course name</label>
                    <input
                        className="acb-preview-input"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Course title"
                    />
                </div>
                <div className="acb-preview-field">
                    <label className="acb-preview-label">Course code</label>
                    <input
                        className="acb-preview-input"
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        placeholder="e.g. CS301"
                        style={{ width: '120px' }}
                    />
                </div>
                <p className="acb-preview-sub" style={{ marginTop: '0.5rem' }}>{preview.topics.length} topics extracted</p>
                <div className="acb-preview-topics">
                    {preview.topics.slice(0, 5).map((t, i) => (
                        <div key={i} className="acb-preview-topic">
                            <span className="acb-preview-topic-name">{t.title}</span>
                            {t.assignments.length > 0 && (
                                <span className="acb-preview-topic-meta">{t.assignments.length} assignment{t.assignments.length > 1 ? 's' : ''}</span>
                            )}
                        </div>
                    ))}
                    {preview.topics.length > 5 && (
                        <p className="acb-preview-more">+{preview.topics.length - 5} more topics</p>
                    )}
                </div>
            </div>
            <div className="acb-preview-actions">
                <button className="acb-btn-confirm" onClick={() => onConfirm({ ...preview, title, code })} disabled={loading || !title.trim()}>
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    Create course
                </button>
                <button className="acb-btn-cancel" onClick={onCancel} disabled={loading}>Cancel</button>
            </div>
        </div>
    );
}

function PlaylistPreviewCard({ preview, courses, onConfirm, onCancel, loading }: {
    preview: PlaylistPreview;
    courses: Course[];
    onConfirm: (p: PlaylistPreview, courseId: string) => void;
    onCancel: () => void;
    loading: boolean;
}) {
    const [selectedCourse, setSelectedCourse] = useState(preview.courseId || '');

    return (
        <div className="acb-preview-card">
            <div className="acb-preview-header">
                <CheckCircle2 size={15} className="acb-preview-icon" />
                <span>{preview.playlistTitle}</span>
            </div>
            <div className="acb-preview-body">
                <p className="acb-preview-sub">{preview.videos.length} videos found</p>
                <div className="acb-preview-topics">
                    {preview.videos.slice(0, 4).map((v, i) => (
                        <div key={i} className="acb-preview-topic">
                            <span className="acb-preview-topic-name">{v.title}</span>
                        </div>
                    ))}
                    {preview.videos.length > 4 && (
                        <p className="acb-preview-more">+{preview.videos.length - 4} more videos</p>
                    )}
                </div>
                {!preview.courseId && courses.length > 0 && (
                    <div className="acb-preview-select-wrap">
                        <label className="acb-preview-label">Add to course:</label>
                        <select
                            className="acb-preview-select"
                            value={selectedCourse}
                            onChange={e => setSelectedCourse(e.target.value)}
                        >
                            <option value="">Select a course...</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
            <div className="acb-preview-actions">
                <button
                    className="acb-btn-confirm"
                    onClick={() => onConfirm(preview, selectedCourse || preview.courseId || '')}
                    disabled={loading || !selectedCourse && !preview.courseId}
                >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    Add all videos
                </button>
                <button className="acb-btn-cancel" onClick={onCancel} disabled={loading}>Cancel</button>
            </div>
        </div>
    );
}

function MaterialPreviewCard({ preview, courses, onConfirm, onCancel, loading }: {
    preview: MaterialPreview;
    courses: Course[];
    onConfirm: (p: MaterialPreview, courseId: string) => void;
    onCancel: () => void;
    loading: boolean;
}) {
    const [selectedCourse, setSelectedCourse] = useState(preview.courseId || '');

    return (
        <div className="acb-preview-card">
            <div className="acb-preview-header">
                <CheckCircle2 size={15} className="acb-preview-icon" />
                <span>Material ready to add</span>
            </div>
            <div className="acb-preview-body">
                <p className="acb-preview-title">{preview.title}</p>
                <p className="acb-preview-sub">{preview.type.toUpperCase()} · {preview.description}</p>
                {!preview.courseId && courses.length > 0 && (
                    <div className="acb-preview-select-wrap">
                        <label className="acb-preview-label">Add to course:</label>
                        <select
                            className="acb-preview-select"
                            value={selectedCourse}
                            onChange={e => setSelectedCourse(e.target.value)}
                        >
                            <option value="">Select a course...</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
            <div className="acb-preview-actions">
                <button
                    className="acb-btn-confirm"
                    onClick={() => onConfirm(preview, selectedCourse || preview.courseId || '')}
                    disabled={loading || (!selectedCourse && !preview.courseId)}
                >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    Add to course
                </button>
                <button className="acb-btn-cancel" onClick={onCancel} disabled={loading}>Cancel</button>
            </div>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AIChatbot({ position = 'bottom-right' }: AIChatbotProps) {
    const { user } = useAuthStore();
    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: isTeacher
                ? `Hi ${user?.name || 'there'}! I can help you build and manage your courses.\n\n**Try:**\n• Drop a syllabus PDF to scaffold your whole course\n• Paste a YouTube playlist URL to bulk-add videos\n• Drop any lecture PDF to add it to a course\n• Ask me anything about teaching`
                : `Hello! I'm your Saarthi study assistant. I can help you with:\n\n• Explaining technical concepts\n• Solving doubts in DSP, ML, Algorithms\n• Code debugging and optimization\n• Exam preparation\n\nWhat would you like to work on?`,
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) inputRef.current.focus();
    }, [isOpen]);

    // Fetch teacher's courses when chat opens
    useEffect(() => {
        if (isOpen && isTeacher) {
            api.get<Course[]>('/teacher/courses')
                .then(list => setCourses(list || []))
                .catch(() => setCourses([]));
        }
    }, [isOpen, isTeacher]);

    const addMessage = (msg: Omit<Message, 'id' | 'timestamp'>) => {
        setMessages(prev => [...prev, { ...msg, id: Date.now().toString(), timestamp: new Date() }]);
    };

    // ── Teacher: analyse file or message ─────────────────────────────────────

    const analyseWithAI = async (message: string, file?: File) => {
        setIsLoading(true);
        try {
            const formData = new FormData();
            if (message) formData.append('message', message);
            if (file) formData.append('file', file);

            const base = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
            const storedToken = (() => { try { return JSON.parse(localStorage.getItem('saarthi-auth') || '{}')?.state?.token ?? null; } catch { return null; } })();
            const resp = await fetch(`${base}/teacher/analyse`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    ...(storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {}),
                    ...(base.includes('ngrok') ? { 'ngrok-skip-browser-warning': '1' } : {}),
                },
                body: formData,
            });
            if (!resp.ok) throw new Error(await resp.text());
            const data = await resp.json();

            if (data.intent === 'general' || (!data.coursePreview && !data.playlistPreview && !data.materialPreview)) {
                // Fall through to normal chat
                await sendNormalChat(message);
                return;
            }

            let content = '';
            if (data.question) content = data.question;
            else if (data.intent === 'create_course') content = `I found your course structure — here's what I'll create. Review and confirm:`;
            else if (data.intent === 'playlist_import') content = `Found ${data.playlistPreview?.videos?.length || 0} videos in the playlist. Select a course to add them to:`;
            else if (data.intent === 'add_material') content = `Ready to add this material to your course. Select a course:`;

            addMessage({
                role: 'assistant',
                content,
                preview: {
                    intent: data.intent,
                    coursePreview: data.coursePreview,
                    playlistPreview: data.playlistPreview,
                    materialPreview: data.materialPreview,
                    question: data.question,
                },
            });
        } catch (e) {
            addMessage({ role: 'assistant', content: 'Something went wrong. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    // ── Execute confirmed actions ─────────────────────────────────────────────

    const executeCourse = async (preview: CoursePreview) => {
        setIsExecuting(true);
        try {
            const result = await api.post<{ courseId: string; title: string; topicsCreated: number; assignmentsCreated: number; materialsCreated: number }>('/teacher/execute/course', {
                coursePreview: preview,
                instructorName: user?.fullName || user?.name || 'Instructor',
            });
            setMessages(prev => prev.map(m =>
                m.preview?.intent === 'create_course'
                    ? { ...m, content: `✓ Course **"${result.title}"** created — ${result.topicsCreated} topics, ${result.assignmentsCreated} assignments, and ${result.materialsCreated} material${result.materialsCreated !== 1 ? 's' : ''} added.\n\n→ Go to **Courses** to see it. [Open Courses](/courses)`, preview: undefined }
                    : m
            ));
        } catch (e: any) {
            addMessage({ role: 'assistant', content: `Failed to create course: ${e?.message || 'Unknown error'}. Please try again.` });
        } finally {
            setIsExecuting(false);
        }
    };

    const executePlaylist = async (preview: PlaylistPreview, courseId: string) => {
        setIsExecuting(true);
        try {
            const result = await api.post<{ videosAdded: number }>('/teacher/execute/playlist', {
                playlistPreview: preview,
                courseId,
            });
            setMessages(prev => prev.map(m =>
                m.preview?.intent === 'playlist_import'
                    ? { ...m, content: `✓ Added ${result.videosAdded} videos to the course. Transcripts are being indexed in the background — students can ask AI questions about them shortly.`, preview: undefined }
                    : m
            ));
        } catch (e: any) {
            addMessage({ role: 'assistant', content: `Failed to import playlist: ${e?.message || 'Unknown error'}.` });
        } finally {
            setIsExecuting(false);
        }
    };

    const executeMaterial = async (preview: MaterialPreview, courseId: string) => {
        setIsExecuting(true);
        try {
            await api.post('/teacher/execute/material', {
                materialPreview: preview,
                courseId,
            });
            setMessages(prev => prev.map(m =>
                m.preview?.intent === 'add_material'
                    ? { ...m, content: `✓ **"${preview.title}"** added to the course and queued for AI indexing.`, preview: undefined }
                    : m
            ));
        } catch (e: any) {
            addMessage({ role: 'assistant', content: `Failed to add material: ${e?.message || 'Unknown error'}.` });
        } finally {
            setIsExecuting(false);
        }
    };

    const cancelPreview = () => {
        setMessages(prev => prev.map(m =>
            m.preview ? { ...m, content: 'No problem — let me know if you need anything else.', preview: undefined } : m
        ));
    };

    // ── Normal chat send ──────────────────────────────────────────────────────

    const sendNormalChat = async (message: string) => {
        try {
            const data = await api.post<{ response?: string }>('/chat/message', {
                message,
                conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
            });
            addMessage({ role: 'assistant', content: data.response || 'I encountered an error. Please try again.' });
        } catch {
            addMessage({ role: 'assistant', content: "I'm having trouble connecting right now. Please try again." });
        }
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;
        const msg = inputValue.trim();
        setInputValue('');
        addMessage({ role: 'user', content: msg });
        setIsLoading(true);

        if (isTeacher) {
            await analyseWithAI(msg);
        } else {
            await sendNormalChat(msg);
        }
        setIsLoading(false);
    };

    // ── File upload (teacher only) ────────────────────────────────────────────

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        addMessage({ role: 'user', content: `📎 ${file.name}` });
        setIsLoading(true);
        try {
            await analyseWithAI(inputValue || '', file);
        } finally {
            setIsUploading(false);
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
    };

    const teacherSuggestions = [
        'Drop a syllabus PDF',
        'Add YouTube playlist',
        'Create a new course',
        'Generate an assignment',
    ];

    const studentSuggestions = [
        'Explain Nyquist theorem',
        'What is gradient descent?',
        'Help me with binary search',
    ];

    const suggestions = isTeacher ? teacherSuggestions : studentSuggestions;

    return (
        <>
            <div
                className="ai-fab-wrap"
                style={{ [position === 'bottom-right' ? 'right' : 'left']: '1.5rem', bottom: '1.5rem' }}
            >
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`ai-fab-btn ${isOpen ? 'open' : ''}`}
                    aria-label={isOpen ? 'Close AI Chat' : 'Open AI Chat'}
                >
                    <span className="ai-fab-ring" />
                    {isOpen ? <X className="ai-fab-icon" /> : <MessageCircle className="ai-fab-icon" />}
                </button>
                {!isOpen && <div className="ai-fab-tooltip">{isTeacher ? 'Teacher Assistant' : 'Ask Saarthi AI'}</div>}
            </div>

            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        [position === 'bottom-right' ? 'right' : 'left']: '1.5rem',
                        bottom: '6rem',
                        width: '100%',
                        maxWidth: 'min(28rem, calc(100vw - 3rem))',
                        height: '620px',
                        backgroundColor: 'var(--card-bg)',
                        borderRadius: '1rem',
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 50,
                        border: '1px solid var(--border)',
                        animation: 'fadeIn 0.3s ease-out',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        background: isTeacher
                            ? 'linear-gradient(to right, #7C3AED, #4F46E5)'
                            : 'linear-gradient(to right, var(--primary), var(--accent-dark))',
                        color: 'white',
                        padding: '1.25rem',
                        borderTopLeftRadius: '1rem',
                        borderTopRightRadius: '1rem',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '3rem', height: '3rem', borderRadius: '50%',
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <LogoIcon size={24} style={{ color: 'white' }} />
                                </div>
                                <div>
                                    <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', margin: 0 }}>
                                        {isTeacher ? 'Teacher Assistant' : 'Saarthi Assistant'}
                                    </h3>
                                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                                        {isTeacher ? 'Course builder · AI powered' : 'AI Study Assistant'}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <div style={{ width: '0.5rem', height: '0.5rem', backgroundColor: '#10B981', borderRadius: '50%' }} />
                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>Active</span>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div style={{
                        flex: 1, overflowY: 'auto', padding: '1rem',
                        backgroundColor: 'var(--background)',
                        display: 'flex', flexDirection: 'column', gap: '1rem',
                    }}>
                        {messages.map((message) => (
                            <div key={message.id} style={{
                                display: 'flex', gap: '0.75rem',
                                flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                            }}>
                                <div style={{
                                    width: '2rem', height: '2rem', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                    background: message.role === 'user'
                                        ? (isTeacher ? '#7C3AED' : 'var(--primary)')
                                        : 'linear-gradient(to bottom right, #A855F7, #EC4899)',
                                }}>
                                    {message.role === 'user'
                                        ? <User style={{ width: '1rem', height: '1rem', color: 'white' }} />
                                        : <Bot style={{ width: '1rem', height: '1rem', color: 'white' }} />
                                    }
                                </div>

                                <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{
                                        borderRadius: '1rem',
                                        padding: '0.75rem 1rem',
                                        backgroundColor: message.role === 'user' ? (isTeacher ? '#7C3AED' : 'var(--primary)') : 'var(--card-bg)',
                                        color: message.role === 'user' ? 'white' : 'var(--foreground)',
                                        border: message.role === 'user' ? 'none' : '1px solid var(--border)',
                                        fontSize: '0.875rem',
                                        lineHeight: '1.6',
                                    }}>
                                        {message.role === 'assistant'
                                            ? <MathContent content={message.content} streaming={false} />
                                            : message.content
                                        }
                                    </div>

                                    {/* Preview card for teacher actions */}
                                    {message.preview && (
                                        <div>
                                            {message.preview.intent === 'create_course' && message.preview.coursePreview && (
                                                <CoursePreviewCard
                                                    preview={message.preview.coursePreview}
                                                    onConfirm={executeCourse}
                                                    onCancel={cancelPreview}
                                                    loading={isExecuting}
                                                />
                                            )}
                                            {message.preview.intent === 'playlist_import' && message.preview.playlistPreview && (
                                                <PlaylistPreviewCard
                                                    preview={message.preview.playlistPreview}
                                                    courses={courses}
                                                    onConfirm={executePlaylist}
                                                    onCancel={cancelPreview}
                                                    loading={isExecuting}
                                                />
                                            )}
                                            {message.preview.intent === 'add_material' && message.preview.materialPreview && (
                                                <MaterialPreviewCard
                                                    preview={message.preview.materialPreview}
                                                    courses={courses}
                                                    onConfirm={executeMaterial}
                                                    onCancel={cancelPreview}
                                                    loading={isExecuting}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <div style={{
                                    width: '2rem', height: '2rem', borderRadius: '50%',
                                    background: 'linear-gradient(to bottom right, #A855F7, #EC4899)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}>
                                    <Bot style={{ width: '1rem', height: '1rem', color: 'white' }} />
                                </div>
                                <div style={{
                                    backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)',
                                    borderRadius: '1rem', padding: '0.75rem 1rem',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Loader2 style={{ width: '1rem', height: '1rem', color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                                        <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                                            {isTeacher ? 'Analysing...' : 'Saarthi is thinking...'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggestions */}
                    {messages.length === 1 && (
                        <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--card-bg)' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: '0.5rem' }}>
                                {isTeacher ? 'Quick actions:' : 'Suggested questions:'}
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            if (isTeacher && s === 'Drop a syllabus PDF') {
                                                fileInputRef.current?.click();
                                            } else {
                                                setInputValue(s);
                                            }
                                        }}
                                        style={{
                                            fontSize: '0.75rem', padding: '0.375rem 0.75rem',
                                            backgroundColor: 'var(--gray-100)', color: 'var(--foreground)',
                                            border: '1px solid var(--border)', borderRadius: '9999px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input area */}
                    <div style={{
                        padding: '1rem', borderTop: '1px solid var(--border)',
                        backgroundColor: 'var(--card-bg)',
                        borderBottomLeftRadius: '1rem', borderBottomRightRadius: '1rem',
                    }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {isTeacher && (
                                <label
                                    title="Upload PDF, slides, or document"
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem',
                                        border: '1px solid var(--border)', cursor: isUploading ? 'not-allowed' : 'pointer',
                                        backgroundColor: 'var(--gray-50)', flexShrink: 0,
                                        opacity: isUploading ? 0.5 : 1,
                                    }}
                                >
                                    <Paperclip size={16} style={{ color: 'var(--gray-500)' }} />
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                                        disabled={isUploading}
                                        onChange={handleFileUpload}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                            )}
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder={isTeacher ? 'Paste a playlist URL, or ask anything...' : 'Ask me anything...'}
                                disabled={isLoading}
                                style={{
                                    flex: 1, padding: '0.75rem 1rem',
                                    backgroundColor: 'var(--input-bg)', border: '1px solid var(--border)',
                                    borderRadius: '0.75rem', fontSize: '0.875rem',
                                    outline: 'none', color: 'var(--foreground)',
                                }}
                                onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
                                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isLoading}
                                style={{
                                    padding: '0.75rem 1rem',
                                    backgroundColor: isTeacher ? '#7C3AED' : 'var(--primary)',
                                    color: 'white', borderRadius: '0.75rem', border: 'none',
                                    cursor: !inputValue.trim() || isLoading ? 'not-allowed' : 'pointer',
                                    opacity: !inputValue.trim() || isLoading ? 0.5 : 1,
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                }}
                            >
                                <Send style={{ width: '1.25rem', height: '1.25rem' }} />
                            </button>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--gray-400)', margin: '0.5rem 0 0', textAlign: 'center' }}>
                            {isTeacher ? 'AI reads your files — nothing is saved until you confirm' : 'Press Enter to send'}
                        </p>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .acb-preview-card {
                    background: var(--card-bg);
                    border: 1px solid var(--border);
                    border-radius: 0.75rem;
                    overflow: hidden;
                    font-size: 0.8125rem;
                }
                .acb-preview-header {
                    display: flex; align-items: center; gap: 0.5rem;
                    padding: 0.625rem 0.875rem;
                    background: rgba(124,58,237,0.06);
                    border-bottom: 1px solid var(--border);
                    font-weight: 600; color: #7C3AED;
                }
                .acb-preview-icon { color: #7C3AED; flex-shrink: 0; }
                .acb-preview-body { padding: 0.75rem 0.875rem; }
                .acb-preview-title { font-weight: 600; margin: 0 0 0.25rem; color: var(--foreground); }
                .acb-preview-sub { font-size: 0.75rem; color: var(--gray-500); margin: 0 0 0.625rem; }
                .acb-preview-topics { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.625rem; }
                .acb-preview-topic { display: flex; align-items: center; justify-content: space-between; padding: 0.3rem 0.5rem; background: var(--gray-50); border-radius: 4px; }
                .acb-preview-topic-name { color: var(--foreground); font-size: 0.8rem; }
                .acb-preview-topic-meta { font-size: 0.72rem; color: var(--gray-500); }
                .acb-preview-more { font-size: 0.72rem; color: var(--gray-400); margin: 0; }
                .acb-preview-select-wrap { margin-top: 0.5rem; }
                .acb-preview-label { display: block; font-size: 0.72rem; font-weight: 600; color: var(--gray-500); margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.04em; }
                .acb-preview-select { width: 100%; padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.8rem; background: var(--card-bg); color: var(--foreground); }
                .acb-preview-field { margin-bottom: 0.5rem; }
                .acb-preview-input { padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.8rem; background: var(--card-bg); color: var(--foreground); width: 100%; box-sizing: border-box; }
                .acb-preview-actions { display: flex; gap: 0.5rem; padding: 0.625rem 0.875rem; border-top: 1px solid var(--border); background: var(--gray-50); }
                .acb-btn-confirm { display: flex; align-items: center; gap: 0.375rem; padding: 0.4rem 0.875rem; background: #7C3AED; color: white; border: none; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
                .acb-btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
                .acb-btn-cancel { padding: 0.4rem 0.75rem; background: transparent; color: var(--gray-500); border: 1px solid var(--border); border-radius: 6px; font-size: 0.8rem; cursor: pointer; }
                .acb-btn-cancel:disabled { opacity: 0.6; cursor: not-allowed; }
            `}</style>
        </>
    );
}
