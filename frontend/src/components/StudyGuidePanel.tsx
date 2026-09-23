import { useState, useEffect, useCallback } from 'react';
import {
    BookOpen, ChevronLeft, Plus, Trash2, X, CheckCheck,
    ChevronRight, Loader2, GraduationCap,
} from 'lucide-react';
import { studyGuideApi, type StudyGuideItem, type StudyGuidePromptItem } from '../lib/api';
import './StudyGuidePanel.css';

interface Props {
    isTeacher: boolean;
    onUsePrompt: (text: string) => void;
    onClose: () => void;
}

type View = 'topics' | 'prompts';

export default function StudyGuidePanel({ isTeacher, onUsePrompt, onClose }: Props) {
    const [view, setView] = useState<View>('topics');
    const [guides, setGuides] = useState<StudyGuideItem[]>([]);
    const [selected, setSelected] = useState<StudyGuideItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    // Teacher add-guide form
    const [showAddGuide, setShowAddGuide] = useState(false);
    const [newGuideTitle, setNewGuideTitle] = useState('');
    const [newGuideDesc, setNewGuideDesc] = useState('');
    const [addingGuide, setAddingGuide] = useState(false);

    // Teacher add-prompt form
    const [showAddPrompt, setShowAddPrompt] = useState(false);
    const [newPromptTitle, setNewPromptTitle] = useState('');
    const [newPromptText, setNewPromptText] = useState('');
    const [addingPrompt, setAddingPrompt] = useState(false);

    const fetchGuides = useCallback(async () => {
        setLoading(true);
        try {
            const data = await studyGuideApi.list();
            setGuides(data);
            // Refresh selected guide prompts if open
            if (selected) {
                const fresh = data.find(g => g.id === selected.id);
                if (fresh) setSelected(fresh);
            }
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, [selected?.id]);

    useEffect(() => { fetchGuides(); }, []);

    const openGuide = (g: StudyGuideItem) => {
        setSelected(g);
        setView('prompts');
    };

    const backToTopics = () => {
        setView('topics');
        setSelected(null);
        setShowAddPrompt(false);
    };

    const handleUsePrompt = (p: StudyGuidePromptItem) => {
        onUsePrompt(p.prompt_text);
        setCopiedId(p.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleAddGuide = async () => {
        if (!newGuideTitle.trim()) return;
        setAddingGuide(true);
        try {
            await studyGuideApi.createGuide(newGuideTitle.trim(), newGuideDesc.trim() || undefined);
            setNewGuideTitle(''); setNewGuideDesc('');
            setShowAddGuide(false);
            await fetchGuides();
        } catch { /* ignore */ }
        finally { setAddingGuide(false); }
    };

    const handleDeleteGuide = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm('Delete this study guide and all its prompts?')) return;
        try {
            await studyGuideApi.deleteGuide(id);
            await fetchGuides();
        } catch { /* ignore */ }
    };

    const handleAddPrompt = async () => {
        if (!newPromptTitle.trim() || !newPromptText.trim() || !selected) return;
        setAddingPrompt(true);
        try {
            await studyGuideApi.addPrompt(selected.id, newPromptTitle.trim(), newPromptText.trim());
            setNewPromptTitle(''); setNewPromptText('');
            setShowAddPrompt(false);
            await fetchGuides();
        } catch { /* ignore */ }
        finally { setAddingPrompt(false); }
    };

    const handleDeletePrompt = async (e: React.MouseEvent, guideId: number, promptId: number) => {
        e.stopPropagation();
        try {
            await studyGuideApi.deletePrompt(guideId, promptId);
            await fetchGuides();
        } catch { /* ignore */ }
    };

    return (
        <div className="sgp-panel">
            {/* Header */}
            <div className="sgp-header">
                <div className="sgp-header-left">
                    {view === 'prompts' && (
                        <button className="sgp-back-btn" onClick={backToTopics}>
                            <ChevronLeft size={15} />
                        </button>
                    )}
                    <BookOpen size={15} />
                    <span>{view === 'topics' ? 'Study Guides' : selected?.title}</span>
                </div>
                <button className="sgp-close-btn" onClick={onClose}><X size={15} /></button>
            </div>

            {/* Body */}
            <div className="sgp-body">
                {loading && guides.length === 0 ? (
                    <div className="sgp-loading"><Loader2 size={18} className="animate-spin" /> Loading…</div>
                ) : view === 'topics' ? (
                    <>
                        {guides.length === 0 ? (
                            <div className="sgp-empty">
                                <GraduationCap size={32} />
                                <p>No study guides yet.</p>
                                {isTeacher && <p className="sgp-empty-hint">Add one below.</p>}
                            </div>
                        ) : (
                            <ul className="sgp-topic-list">
                                {guides.map(g => (
                                    <li key={g.id} className="sgp-topic-item" onClick={() => openGuide(g)}>
                                        <div className="sgp-topic-info">
                                            <span className="sgp-topic-title">{g.title}</span>
                                            {g.description && <span className="sgp-topic-desc">{g.description}</span>}
                                            <span className="sgp-topic-count">{g.prompts.length} prompt{g.prompts.length !== 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="sgp-topic-right">
                                            {isTeacher && (
                                                <button className="sgp-icon-btn danger" onClick={(e) => handleDeleteGuide(e, g.id)}>
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                            <ChevronRight size={15} className="sgp-chevron" />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* Teacher: Add Guide */}
                        {isTeacher && (
                            <div className="sgp-add-section">
                                {!showAddGuide ? (
                                    <button className="sgp-add-btn" onClick={() => setShowAddGuide(true)}>
                                        <Plus size={13} /> New Topic
                                    </button>
                                ) : (
                                    <div className="sgp-form">
                                        <input
                                            className="sgp-input"
                                            placeholder="Topic title…"
                                            value={newGuideTitle}
                                            onChange={e => setNewGuideTitle(e.target.value)}
                                            autoFocus
                                        />
                                        <textarea
                                            className="sgp-textarea"
                                            placeholder="Short description (optional)…"
                                            value={newGuideDesc}
                                            onChange={e => setNewGuideDesc(e.target.value)}
                                            rows={2}
                                        />
                                        <div className="sgp-form-actions">
                                            <button className="sgp-btn-secondary" onClick={() => setShowAddGuide(false)}>Cancel</button>
                                            <button className="sgp-btn-primary" onClick={handleAddGuide} disabled={addingGuide || !newGuideTitle.trim()}>
                                                {addingGuide ? <Loader2 size={12} className="animate-spin" /> : 'Create'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    /* Prompts view */
                    <>
                        {selected?.description && (
                            <p className="sgp-guide-desc">{selected.description}</p>
                        )}

                        {selected?.prompts.length === 0 ? (
                            <div className="sgp-empty">
                                <p>No prompts yet.</p>
                                {isTeacher && <p className="sgp-empty-hint">Add the first prompt below.</p>}
                            </div>
                        ) : (
                            <ol className="sgp-prompt-list">
                                {selected?.prompts.map(p => (
                                    <li key={p.id} className="sgp-prompt-card">
                                        <div className="sgp-prompt-header">
                                            <span className="sgp-step-badge">Step {p.step_number}</span>
                                            <span className="sgp-prompt-title">{p.title}</span>
                                            {isTeacher && (
                                                <button
                                                    className="sgp-icon-btn danger"
                                                    onClick={(e) => handleDeletePrompt(e, selected.id, p.id)}
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                        <pre className="sgp-prompt-text">{p.prompt_text}</pre>
                                        <button
                                            className={`sgp-use-btn ${copiedId === p.id ? 'used' : ''}`}
                                            onClick={() => handleUsePrompt(p)}
                                        >
                                            {copiedId === p.id
                                                ? <><CheckCheck size={13} /> Copied to input</>
                                                : <><BookOpen size={13} /> Use this prompt</>
                                            }
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        )}

                        {/* Teacher: Add Prompt */}
                        {isTeacher && (
                            <div className="sgp-add-section">
                                {!showAddPrompt ? (
                                    <button className="sgp-add-btn" onClick={() => setShowAddPrompt(true)}>
                                        <Plus size={13} /> Add Prompt
                                    </button>
                                ) : (
                                    <div className="sgp-form">
                                        <input
                                            className="sgp-input"
                                            placeholder="Prompt title (e.g. '1. Definition')…"
                                            value={newPromptTitle}
                                            onChange={e => setNewPromptTitle(e.target.value)}
                                            autoFocus
                                        />
                                        <textarea
                                            className="sgp-textarea sgp-textarea-tall"
                                            placeholder={"**Goal:** …\n**Guardrails:** …\n**Methodology:** …\n\nYour prompt here…"}
                                            value={newPromptText}
                                            onChange={e => setNewPromptText(e.target.value)}
                                            rows={8}
                                        />
                                        <div className="sgp-form-actions">
                                            <button className="sgp-btn-secondary" onClick={() => setShowAddPrompt(false)}>Cancel</button>
                                            <button className="sgp-btn-primary" onClick={handleAddPrompt} disabled={addingPrompt || !newPromptTitle.trim() || !newPromptText.trim()}>
                                                {addingPrompt ? <Loader2 size={12} className="animate-spin" /> : 'Add'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
