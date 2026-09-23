import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Play, RotateCcw, Copy, Check, ChevronDown, Terminal,
    Activity, FileText, Loader2, Sparkles, AlertTriangle,
    CheckCircle2, Brain, X, ChevronUp, ArrowLeft, BookOpen,
    ChevronRight, Zap,
} from 'lucide-react';
import GraphOutput from '../components/GraphOutput';
import { api, type CodeProblemResponse } from '../lib/api';
import { usePageTitle } from '../lib/usePageTitle';
import './CodeLab.css';

// ── Language config ───────────────────────────────────────────────────────────

const LANGUAGES = [
    { key: 'python',     label: 'Python',     ext: 'py',  color: '#3B82F6' },
    { key: 'javascript', label: 'JavaScript',  ext: 'js',  color: '#F59E0B' },
    { key: 'cpp',        label: 'C++',         ext: 'cpp', color: '#8B5CF6' },
    { key: 'c',          label: 'C',           ext: 'c',   color: '#6366F1' },
    { key: 'java',       label: 'Java',        ext: 'java',color: '#EF4444' },
    { key: 'rust',       label: 'Rust',        ext: 'rs',  color: '#F97316' },
    { key: 'go',         label: 'Go',          ext: 'go',  color: '#06B6D4' },
    { key: 'bash',       label: 'Bash',        ext: 'sh',  color: '#10B981' },
    { key: 'r',          label: 'R',           ext: 'r',   color: '#EC4899' },
];

const FALLBACK_STARTER: Record<string, string> = {
    python: '# Write your solution here\n',
    javascript: '// Write your solution here\n',
    cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n',
    c: '#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n',
    java: 'public class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n',
    rust: 'fn main() {\n    // Write your solution here\n}\n',
    go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your solution here\n    fmt.Println("Hello")\n}\n',
    bash: '#!/bin/bash\n# Write your solution here\n',
    r: '# Write your solution here\n',
};

function difficultyBadge(d: string) {
    if (d === 'easy') return 'badge-success';
    if (d === 'hard') return 'badge-danger';
    return 'badge-warning';
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExecResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    language: string;
    runtime: string;
    executionMs?: number;
}

interface ExecResponse {
    result: ExecResult;
    aiExplanation?: string;
    aiSuggestions?: string[];
}

// ── AI Explanation Panel ──────────────────────────────────────────────────────

function AIExplanationPanel({
    explanation, suggestions, onClose, streaming, isError,
}: {
    explanation: string; suggestions: string[]; onClose: () => void; streaming: boolean; isError: boolean;
}) {
    return (
        <div className="cl-ai-panel animate-fade-in">
            <div className="cl-ai-panel-header">
                <div className="cl-ai-panel-title">
                    <Brain size={16} style={{ color: isError ? '#C86F7A' : 'var(--accent)' }} />
                    <span>{isError ? 'AI Error Analysis' : 'AI Insight'}</span>
                    {streaming && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
                </div>
                <button className="cl-ai-close" onClick={onClose}><X size={14} /></button>
            </div>
            <p className="cl-ai-explanation">
                {explanation}
                {streaming && <span className="chat-cursor" />}
            </p>
            {suggestions.length > 0 && (
                <div className="cl-ai-suggestions">
                    <span className="cl-ai-suggestions-label">Suggestions</span>
                    {suggestions.map((s, i) => (
                        <div key={i} className="cl-ai-suggestion">
                            <span className="cl-ai-suggestion-num">{i + 1}</span>
                            <span>{s}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Problem List ──────────────────────────────────────────────────────────────

function ProblemList({
    problems, loading, error,
}: {
    problems: CodeProblemResponse[]; loading: boolean; error: string | null;
}) {
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="codelab-problem">
                <div className="codelab-problem-header">
                    <h2>Coding Lab</h2>
                    <span className="cl-problem-sub">DSP · ML · Algorithms</span>
                </div>
                <div className="codelab-problem-body">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="cl-problem-card skeleton" style={{ height: '5rem', marginBottom: '0.625rem' }} />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="codelab-problem">
                <div className="codelab-problem-header">
                    <h2>Coding Lab</h2>
                </div>
                <div className="codelab-problem-body">
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="codelab-problem">
            <div className="codelab-problem-header">
                <div>
                    <h2>Coding Lab</h2>
                    <span className="cl-problem-sub">DSP · ML · Algorithms</span>
                </div>
            </div>
            <div className="codelab-problem-body">
                <p className="cl-pick-label">Select a problem to get started</p>
                <div className="cl-problem-list">
                    {problems.map(p => (
                        <button
                            key={p.id}
                            className="cl-problem-card"
                            onClick={() => navigate(`/code-lab/${p.id}`)}
                        >
                            <div className="cl-problem-card-top">
                                <span className="cl-problem-card-title">{p.title}</span>
                                <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            </div>
                            <div className="cl-problem-card-meta">
                                <span className={`badge ${difficultyBadge(p.difficulty)}`} style={{ fontSize: '0.7rem' }}>{p.difficulty}</span>
                                <span className="cl-pts"><Zap size={11} />{p.points} pts</span>
                                {p.topics && <span className="cl-topic">{p.topics}</span>}
                            </div>
                        </button>
                    ))}
                </div>
                <div className="cl-ai-callout">
                    <Brain size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                    <div>
                        <strong>AI-powered feedback</strong>
                        <span>Run code with an error and the AI instantly explains what went wrong and how to fix it.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Problem Detail Panel ──────────────────────────────────────────────────────

function ProblemPanel({
    problem, onPreviewGraph,
}: {
    problem: CodeProblemResponse; onPreviewGraph: () => void;
}) {
    const navigate = useNavigate();
    return (
        <div className="codelab-problem">
            <div className="codelab-problem-header">
                <button className="btn btn-ghost btn-sm" style={{ marginRight: '0.25rem' }} onClick={() => navigate('/code-lab')}>
                    <ArrowLeft size={14} />
                </button>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1rem' }}>{problem.title}</h2>
                    <span className="cl-problem-sub">{problem.topics ?? 'Coding Lab'}</span>
                </div>
            </div>
            <div className="codelab-problem-body">
                <div className="problem-meta">
                    <span className={`badge ${difficultyBadge(problem.difficulty)}`}>{problem.difficulty}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{problem.points} pts</span>
                </div>

                <p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{problem.description}</p>

                {problem.requirements.length > 0 && (
                    <>
                        <h4>Requirements</h4>
                        <ul>
                            {problem.requirements.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                    </>
                )}

                {problem.expectedOutput && (
                    <>
                        <h4>Expected output</h4>
                        <div className="cl-expected-output">
                            <pre>{problem.expectedOutput}</pre>
                        </div>
                    </>
                )}

                <div className="codelab-buttons-stack">
                    <button className="btn btn-outline btn-sm" onClick={onPreviewGraph}>
                        <Activity size={14} /> Preview Graph
                    </button>
                </div>

                {problem.hints.length > 0 && (
                    <>
                        <h4>Hints</h4>
                        {problem.hints.map((h, i) => (
                            <div key={i} className="codelab-hint">
                                <p>{h}</p>
                            </div>
                        ))}
                    </>
                )}

                <div className="cl-ai-callout">
                    <Brain size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                    <div>
                        <strong>AI-powered feedback</strong>
                        <span>Run code with an error and the AI instantly explains what went wrong and how to fix it.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CodeLabPage() {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();

    const [problems, setProblems] = useState<CodeProblemResponse[]>([]);
    const [problem, setProblem] = useState<CodeProblemResponse | null>(null);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState<string | null>(null);
    const [problemLoading, setProblemLoading] = useState(false);

    const [language, setLanguage] = useState('python');
    const [code, setCode] = useState(FALLBACK_STARTER['python']);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<ExecResult | null>(null);
    const [copied, setCopied] = useState(false);
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [activeTab, setActiveTab] = useState<'console' | 'graph' | 'ai'>('console');
    const [aiExplanation, setAiExplanation] = useState('');
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [aiStreaming, setAiStreaming] = useState(false);
    const [aiIsError, setAiIsError] = useState(false);
    const [showGraph, setShowGraph] = useState(false);
    const [graphData, setGraphData] = useState<{ freq: number; mag: number }[]>([]);
    const [stdin, setStdin] = useState('');
    const [showStdin, setShowStdin] = useState(false);
    const outputRef = useRef<HTMLPreElement>(null);

    usePageTitle(problem ? problem.title : 'Coding Lab');

    // Fetch all problems for list view
    useEffect(() => {
        let cancelled = false;
        setListLoading(true);
        api.get<CodeProblemResponse[]>('/code/problems')
            .then(list => { if (!cancelled) setProblems(list || []); })
            .catch(e => { if (!cancelled) setListError(e instanceof Error ? e.message : 'Failed to load problems'); })
            .finally(() => { if (!cancelled) setListLoading(false); });
        return () => { cancelled = true; };
    }, []);

    // When id changes, fetch that specific problem
    useEffect(() => {
        if (!id) { setProblem(null); return; }
        let cancelled = false;
        setProblemLoading(true);
        api.get<CodeProblemResponse>(`/code/problems/${id}`)
            .then(p => {
                if (cancelled) return;
                setProblem(p);
                // Set starter code for current language, fall back to generic
                const starter = p.starterCode[language] ?? FALLBACK_STARTER[language] ?? '';
                setCode(starter);
                setResult(null);
                setAiExplanation('');
                setShowGraph(false);
                setActiveTab('console');
            })
            .catch(() => { if (!cancelled) navigate('/code-lab'); })
            .finally(() => { if (!cancelled) setProblemLoading(false); });
        return () => { cancelled = true; };
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }, [result]);

    const generateGraphData = useCallback(() => {
        const data = [];
        for (let f = 0; f <= 4000; f += 50) {
            const mag = 1 / Math.sqrt(1 + Math.pow(f / 1000, 8));
            data.push({ freq: f, mag: 20 * Math.log10(mag) });
        }
        return data;
    }, []);

    const streamAIExplanation = async (code: string, lang: string, stderr: string, exitCode: number, stdout = '') => {
        setAiStreaming(true);
        setAiExplanation('');
        setAiSuggestions([]);
        setAiIsError(exitCode !== 0 || !!stderr);
        setActiveTab('ai');

        try {
            const base = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
            const storedToken = (() => { try { return JSON.parse(localStorage.getItem('saarthi-auth') || '{}')?.state?.token ?? null; } catch { return null; } })();
            const resp = await fetch(`${base}/code/explain/stream`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {}),
                    ...(base.includes('ngrok') ? { 'ngrok-skip-browser-warning': '1' } : {}),
                },
                body: JSON.stringify({ code, language: lang, stderr, exitCode, stdout, courseContext: problem?.topics ?? 'Engineering' }),
            });

            if (!resp.body) return;
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const token = line.slice(6);
                    if (token === '[DONE]') break;
                    setAiExplanation(prev => prev + token.replace(/\\n/g, '\n'));
                }
            }
        } catch {
            setAiExplanation('Unable to stream explanation. Check your connection.');
        } finally {
            setAiStreaming(false);
        }
    };

    const runCode = async () => {
        setRunning(true);
        setResult(null);
        setAiExplanation('');
        setAiSuggestions([]);
        setActiveTab('console');

        try {
            const resp = await api.post<ExecResponse>('/code/execute', {
                language,
                code,
                stdin,
                explainOnError: false,
            });

            setResult(resp.result);

            const hasError = resp.result.exitCode !== 0 || resp.result.stderr;
            if (hasError) {
                streamAIExplanation(code, language, resp.result.stderr, resp.result.exitCode);
            } else {
                streamAIExplanation(code, language, '', 0, resp.result.stdout);
                if (language === 'python' && code.toLowerCase().includes('butterworth')) {
                    setGraphData(generateGraphData());
                    setShowGraph(true);
                }
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to reach execution service.';
            setResult({ stdout: '', stderr: msg, exitCode: 1, language, runtime: language });
        } finally {
            setRunning(false);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const changeLang = (lang: string) => {
        setLanguage(lang);
        const starter = problem
            ? (problem.starterCode[lang] ?? FALLBACK_STARTER[lang] ?? '')
            : (FALLBACK_STARTER[lang] ?? '');
        setCode(starter);
        setShowLangDropdown(false);
        setResult(null);
        setAiExplanation('');
        setShowGraph(false);
        setActiveTab('console');
    };

    const resetCode = () => {
        const starter = problem
            ? (problem.starterCode[language] ?? FALLBACK_STARTER[language] ?? '')
            : (FALLBACK_STARTER[language] ?? '');
        setCode(starter);
        setResult(null);
        setAiExplanation('');
        setShowGraph(false);
    };

    const currentLang = LANGUAGES.find(l => l.key === language) ?? LANGUAGES[0];
    const hasError = result && (result.exitCode !== 0 || result.stderr);
    const hasOutput = result && (result.stdout || result.stderr);

    return (
        <div className="codelab-page">
            {/* ── Problem / Info panel ── */}
            {id ? (
                problemLoading ? (
                    <div className="codelab-problem">
                        <div className="codelab-problem-header">
                            <div className="skeleton" style={{ width: '60%', height: '1.25rem', borderRadius: 4 }} />
                        </div>
                        <div className="codelab-problem-body">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="skeleton" style={{ height: '3rem', marginBottom: '0.625rem', borderRadius: 6 }} />
                            ))}
                        </div>
                    </div>
                ) : problem ? (
                    <ProblemPanel
                        problem={problem}
                        onPreviewGraph={() => {
                            setGraphData(generateGraphData());
                            setShowGraph(true);
                            setActiveTab('graph');
                        }}
                    />
                ) : null
            ) : (
                <ProblemList problems={problems} loading={listLoading} error={listError} />
            )}

            {/* ── Editor panel ── */}
            <div className="codelab-editor-panel">
                {/* Toolbar */}
                <div className="codelab-toolbar">
                    <div className="codelab-lang-selector">
                        <button
                            className="codelab-lang-btn"
                            onClick={() => setShowLangDropdown(v => !v)}
                        >
                            <span className="cl-lang-dot" style={{ background: currentLang.color }} />
                            {currentLang.label}
                            <ChevronDown size={14} />
                        </button>
                        {showLangDropdown && (
                            <div className="codelab-lang-dropdown animate-scale-in">
                                {LANGUAGES.map(l => (
                                    <button
                                        key={l.key}
                                        className={l.key === language ? 'active' : ''}
                                        onClick={() => changeLang(l.key)}
                                    >
                                        <span className="cl-lang-dot" style={{ background: l.color }} />
                                        {l.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="codelab-toolbar-actions">
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setShowStdin(v => !v)}
                            title="Toggle stdin input"
                        >
                            <FileText size={14} /> Stdin {showStdin ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={copyCode}>
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={resetCode}>
                            <RotateCcw size={14} /> Reset
                        </button>
                        <button
                            className="btn btn-success btn-sm"
                            onClick={runCode}
                            disabled={running}
                        >
                            {running
                                ? <><Loader2 size={14} className="animate-spin" /> Running...</>
                                : <><Play size={14} /> Run Code</>
                            }
                        </button>
                    </div>
                </div>

                {/* Stdin */}
                {showStdin && (
                    <div className="cl-stdin-area">
                        <span className="cl-stdin-label">stdin</span>
                        <input
                            className="cl-stdin-input"
                            placeholder="Program input (one value per line)..."
                            value={stdin}
                            onChange={e => setStdin(e.target.value)}
                        />
                    </div>
                )}

                {/* Editor */}
                <div className="codelab-editor">
                    <div className="codelab-line-numbers">
                        {code.split('\n').map((_, i) => <span key={i}>{i + 1}</span>)}
                    </div>
                    <textarea
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        className="codelab-textarea"
                        spellCheck={false}
                        onKeyDown={e => {
                            if (e.key === 'Tab') {
                                e.preventDefault();
                                const el = e.currentTarget;
                                const start = el.selectionStart;
                                const end = el.selectionEnd;
                                const next = code.substring(0, start) + '    ' + code.substring(end);
                                setCode(next);
                                requestAnimationFrame(() => {
                                    el.selectionStart = el.selectionEnd = start + 4;
                                });
                            }
                        }}
                    />
                </div>

                {/* No problem selected overlay */}
                {!id && (
                    <div className="cl-no-problem-overlay">
                        <BookOpen size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                        <p>Select a problem from the left panel to load its starter code.</p>
                    </div>
                )}

                {/* Output tabs */}
                <div className="codelab-output-section">
                    <div className="codelab-output-tabs">
                        <button className={`output-tab ${activeTab === 'console' ? 'active' : ''}`} onClick={() => setActiveTab('console')}>
                            <Terminal size={14} />
                            Console
                            {hasOutput && (
                                <span className={`cl-tab-dot ${hasError ? 'cl-tab-dot-error' : 'cl-tab-dot-ok'}`} />
                            )}
                        </button>
                        <button className={`output-tab ${activeTab === 'graph' ? 'active' : ''}`} onClick={() => setActiveTab('graph')}>
                            <Activity size={14} />
                            Graph
                            {showGraph && <span className="cl-tab-dot cl-tab-dot-ok" />}
                        </button>
                        <button className={`output-tab ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>
                            <Sparkles size={14} />
                            AI Feedback
                            {(aiExplanation || aiStreaming) && <span className={`cl-tab-dot ${aiStreaming ? 'cl-tab-dot-stream' : 'cl-tab-dot-ok'}`} />}
                        </button>
                    </div>

                    <div className="codelab-output-content">
                        {/* Console tab */}
                        {activeTab === 'console' && (
                            <div className="cl-console">
                                {running && (
                                    <div className="cl-console-running">
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Executing on {currentLang.label} {currentLang.key === 'python' ? '3.10' : ''}...</span>
                                    </div>
                                )}
                                {result && (
                                    <>
                                        <div className="cl-console-meta">
                                            <span className="cl-console-runtime">{result.runtime}</span>
                                            {result.executionMs && (
                                                <span className="cl-console-time">{result.executionMs}ms</span>
                                            )}
                                            <span className={`cl-console-status ${result.exitCode === 0 ? 'ok' : 'err'}`}>
                                                {result.exitCode === 0
                                                    ? <><CheckCircle2 size={12} /> Exit 0</>
                                                    : <><AlertTriangle size={12} /> Exit {result.exitCode}</>
                                                }
                                            </span>
                                        </div>
                                        {result.stdout && (
                                            <pre ref={outputRef} className="codelab-console-text cl-stdout">{result.stdout}</pre>
                                        )}
                                        {result.stderr && (
                                            <pre className="codelab-console-text cl-stderr">{result.stderr}</pre>
                                        )}
                                        {hasError && (
                                            <button className="cl-explain-btn" onClick={() => setActiveTab('ai')}>
                                                <Brain size={14} /> View AI explanation
                                            </button>
                                        )}
                                    </>
                                )}
                                {!result && !running && (
                                    <pre className="codelab-console-text cl-placeholder">
                                        {`Press "Run Code" to execute your ${currentLang.label} program.\nOutput will appear here.`}
                                    </pre>
                                )}
                            </div>
                        )}

                        {/* Graph tab */}
                        {activeTab === 'graph' && (
                            showGraph
                                ? <GraphOutput data={graphData} cutoff={1000} />
                                : (
                                    <div className="graph-placeholder">
                                        <Activity size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Run the Python code to generate the filter response graph</p>
                                    </div>
                                )
                        )}

                        {/* AI tab */}
                        {activeTab === 'ai' && (
                            <div className="cl-ai-tab">
                                {(aiExplanation || aiStreaming) ? (
                                    <AIExplanationPanel
                                        explanation={aiExplanation}
                                        suggestions={aiSuggestions}
                                        streaming={aiStreaming}
                                        isError={aiIsError}
                                        onClose={() => { setAiExplanation(''); setAiSuggestions([]); }}
                                    />
                                ) : (
                                    <div className="cl-ai-empty">
                                        <Brain size={36} style={{ color: 'var(--text-muted)' }} />
                                        <p>Run your code — the AI will analyse the output and give you insights or explain any errors.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
