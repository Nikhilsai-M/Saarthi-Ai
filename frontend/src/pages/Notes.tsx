import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, FileText, Clock, Tag, BookOpen, Grid, List, X, Pencil, Trash2, Save } from 'lucide-react';
import { api, type NoteResponse, type PaginatedResponse } from '../lib/api';
import { usePageTitle } from '../lib/usePageTitle';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';
import './Notes.css';

const PAGE_SIZE = 20;

export default function NotesPage() {
    usePageTitle('My Notes');
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [notes, setNotes] = useState<NoteResponse[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [editingNote, setEditingNote] = useState<NoteResponse | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchNotes = useCallback(() => {
        setLoading(true);
        setError(null);
        return api.get<PaginatedResponse<NoteResponse>>('/notes', { limit: PAGE_SIZE, offset })
            .then((r) => {
                setNotes(r.items || []);
                setTotal(r.total ?? 0);
            })
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load notes'))
            .finally(() => setLoading(false));
    }, [offset, retryCount]);

    useEffect(() => {
        let cancelled = false;
        fetchNotes().catch(() => {});
        return () => { cancelled = true; };
    }, [fetchNotes]);

    const filtered = notes.filter((n) =>
        !search.trim() ||
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        (n.topic && n.topic.toLowerCase().includes(search.toLowerCase()))
    );
    const tagsFromNote = (n: NoteResponse) => (n.topic ? [n.topic] : []);

    const openCreate = () => {
        setEditingNote(null);
        setShowModal(true);
    };

    const openEdit = (note: NoteResponse) => {
        setEditingNote(note);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingNote(null);
    };

    const handleSaveNote = async (payload: { title: string; content: string; topic?: string }) => {
        setError(null);
        setSaving(true);
        try {
            if (editingNote) {
                await api.patch<NoteResponse>(`/notes/${editingNote.id}`, { title: payload.title, content: payload.content });
            } else {
                await api.post<NoteResponse>('/notes', {
                    title: payload.title,
                    content: payload.content,
                    topic: payload.topic || undefined,
                });
            }
            closeModal();
            fetchNotes();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save note');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteNoteId) return;
        setDeleting(true);
        setError(null);
        try {
            await api.delete(`/notes/${deleteNoteId}`);
            setDeleteNoteId(null);
            fetchNotes();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to delete note');
        } finally {
            setDeleting(false);
        }
    };

    const formatDate = (iso: string) => {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return iso;
        }
    };

    return (
        <div className="notes-page">
            <div className="notes-header animate-fade-in">
                <div>
                    <h1>Study Notes</h1>
                    <p>Your organized collection of study materials</p>
                </div>
                <div className="notes-header-actions">
                    <div className="courses-view-toggle">
                        <button type="button" className={`btn btn-icon ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}><Grid size={18} /></button>
                        <button type="button" className={`btn btn-icon ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><List size={18} /></button>
                    </div>
                    <button type="button" className="btn btn-primary" onClick={openCreate}><Plus size={16} /> New Note</button>
                </div>
            </div>
            {error && notes.length > 0 && <div className="notes-error" role="alert">{error}</div>}
            <div className="notes-search animate-fade-in delay-100">
                <div className="courses-search" style={{ maxWidth: '400px' }}>
                    <Search size={18} />
                    <input type="text" placeholder="Filter by title or topic..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
            </div>

            {error && !loading && notes.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{error}</p>
                    <button className="btn btn-primary btn-sm" onClick={() => setRetryCount(c => c + 1)}>
                        Try again
                    </button>
                </div>
            ) : loading && notes.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '0.75rem' }} />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="notes-empty animate-fade-in delay-100">
                    <div className="notes-empty-icon"><FileText size={48} /></div>
                    <h3>{notes.length === 0 ? 'No notes yet' : 'No matching notes'}</h3>
                    <p>{notes.length === 0 ? 'Create your first study note to get started.' : 'Try a different filter.'}</p>
                    {notes.length === 0 && (
                        <button type="button" className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Create your first note</button>
                    )}
                </div>
            ) : (
                <>
                    <div className={`notes-grid ${viewMode === 'list' ? 'notes-list-view' : ''} animate-fade-in delay-200`}>
                        {filtered.map((note) => (
                            <div key={note.id} className="note-card">
                                <div className="note-card-header">
                                    <FileText size={18} className="note-card-icon" />
                                    <div className="note-card-actions">
                                        <button type="button" className="note-action-btn" onClick={(e) => { e.stopPropagation(); openEdit(note); }} aria-label="Edit"><Pencil size={14} /></button>
                                        <button type="button" className="note-action-btn note-action-delete" onClick={(e) => { e.stopPropagation(); setDeleteNoteId(note.id); }} aria-label="Delete"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <div className="note-card-body" onClick={() => openEdit(note)}>
                                    <h3 className="note-card-title">{note.title}</h3>
                                    {note.courseId && <p className="note-card-course"><BookOpen size={13} /> Course {note.courseId}</p>}
                                    <p className="note-card-preview">{note.content.slice(0, 120)}{note.content.length > 120 ? '…' : ''}</p>
                                    <div className="note-card-tags">
                                        {tagsFromNote(note).map((tag) => (
                                            <span key={tag} className="note-tag"><Tag size={10} /> {tag}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="note-card-footer">
                                    <span><Clock size={12} /> {formatDate(note.updatedAt)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    {total > PAGE_SIZE && (
                        <Pagination total={total} limit={PAGE_SIZE} offset={offset} onPageChange={setOffset} />
                    )}
                </>
            )}

            {showModal && (
                <NoteModal
                    note={editingNote}
                    onClose={closeModal}
                    onSave={handleSaveNote}
                    saving={saving}
                />
            )}

            <ConfirmModal
                open={deleteNoteId !== null}
                title="Delete note"
                message="This note will be permanently deleted. This cannot be undone."
                confirmLabel="Delete"
                variant="danger"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteNoteId(null)}
                loading={deleting}
            />
        </div>
    );
}

interface NoteModalProps {
    note: NoteResponse | null;
    onClose: () => void;
    onSave: (payload: { title: string; content: string; topic?: string }) => void;
    saving: boolean;
}

function NoteModal({ note, onClose, onSave, saving }: NoteModalProps) {
    const [title, setTitle] = useState(note?.title ?? '');
    const [content, setContent] = useState(note?.content ?? '');
    const [topic, setTopic] = useState(note?.topic ?? '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const t = title.trim();
        const c = content.trim();
        if (!t || !c) return;
        onSave({ title: t, content: c, topic: topic.trim() || undefined });
    };

    return (
        <div className="notes-modal-overlay" onClick={onClose}>
            <div className="notes-modal" onClick={(e) => e.stopPropagation()}>
                <div className="notes-modal-header">
                    <h2>{note ? 'Edit Note' : 'New Note'}</h2>
                    <button type="button" className="notes-modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
                </div>
                <form id="notes-modal-form" onSubmit={handleSubmit} className="notes-modal-body">
                    <div className="notes-modal-field">
                        <label>Title *</label>
                        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" required />
                    </div>
                    <div className="notes-modal-field">
                        <label>Content *</label>
                        <textarea className="input" rows={6} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your note..." required />
                    </div>
                    <div className="notes-modal-field">
                        <label>Topic (optional)</label>
                        <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. DSP, Algorithms" />
                    </div>
                </form>
                <div className="notes-modal-footer">
                    <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
                    <button type="submit" form="notes-modal-form" className="btn btn-primary" disabled={saving || !title.trim() || !content.trim()}>
                        <Save size={16} /> {saving ? 'Saving…' : (note ? 'Update' : 'Create')}
                    </button>
                </div>
            </div>
        </div>
    );
}
