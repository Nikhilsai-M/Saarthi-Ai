import { useState, useCallback, useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    Handle,
    Position,
    type NodeTypes,
    type Node,
    type Edge,
    useNodesState,
    useEdgesState,
    MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Network, Loader2, Sparkles, AlertCircle, Info, X } from 'lucide-react';
import { api } from '../lib/api';
import { usePageTitle } from '../lib/usePageTitle';
import './ConceptMap.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConceptNode {
    id: string;
    label: string;
    topic: string;
    mastery: number;
    prereqs: string[];
}

interface ConceptGraphResponse {
    nodes: ConceptNode[];
    generatedAt: string;
}

interface DetailPanel {
    node: ConceptNode;
    prereqNodes: ConceptNode[];
    dependents: ConceptNode[];
}

// ── Mastery colour helpers ────────────────────────────────────────────────────

function masteryColor(m: number) {
    if (m >= 0.8) return { border: '#5FA89C', bg: '#0d2e2b', text: '#5FA89C', label: 'Mastered' };
    if (m >= 0.5) return { border: '#B59A63', bg: '#2a2210', text: '#B59A63', label: 'Developing' };
    return { border: '#C86F7A', bg: '#2d1217', text: '#C86F7A', label: 'Weak' };
}

// ── Custom Node ───────────────────────────────────────────────────────────────

function ConceptNodeUI({ data }: { data: any }) {
    const { label, topic, mastery, selected } = data;
    const pct = Math.round(mastery * 100);
    const c = masteryColor(mastery);

    return (
        <div
            className={`cm-flow-node ${selected ? 'cm-flow-node-selected' : ''}`}
            style={{
                borderColor: c.border,
                background: selected ? c.bg : 'var(--surface-2)',
                boxShadow: selected ? `0 0 0 2px ${c.border}55, 0 4px 20px ${c.border}33` : undefined,
            }}
        >
            <Handle type="target" position={Position.Top} className="cm-handle" />

            <div className="cm-flow-node-top">
                <span className="cm-flow-node-label">{label}</span>
                <span className="cm-flow-node-pct" style={{ color: c.text }}>{pct}%</span>
            </div>

            <div className="cm-flow-node-bar">
                <div
                    className="cm-flow-node-bar-fill"
                    style={{ width: `${pct}%`, background: c.border }}
                />
            </div>

            <div className="cm-flow-node-footer">
                <span className="cm-flow-node-topic">{topic}</span>
                <span className="cm-flow-node-badge" style={{ background: `${c.border}22`, color: c.text }}>
                    {c.label}
                </span>
            </div>

            <Handle type="source" position={Position.Bottom} className="cm-handle" />
        </div>
    );
}

const nodeTypes: NodeTypes = { concept: ConceptNodeUI };

// ── Layout: simple layered layout ────────────────────────────────────────────

function computeLayout(conceptNodes: ConceptNode[]): { nodes: Node[]; edges: Edge[] } {
    // Build a map of node → depth based on prerequisite chains
    const depthMap: Record<string, number> = {};
    const visited = new Set<string>();

    function getDepth(id: string): number {
        if (depthMap[id] !== undefined) return depthMap[id];
        if (visited.has(id)) return 0;
        visited.add(id);
        const node = conceptNodes.find(n => n.id === id);
        if (!node || node.prereqs.length === 0) {
            depthMap[id] = 0;
            return 0;
        }
        const maxPrereq = Math.max(...node.prereqs.map(pid => getDepth(pid)));
        depthMap[id] = maxPrereq + 1;
        return depthMap[id];
    }

    conceptNodes.forEach(n => getDepth(n.id));

    // Group nodes by depth layer
    const layers: Record<number, ConceptNode[]> = {};
    conceptNodes.forEach(n => {
        const d = depthMap[n.id] ?? 0;
        if (!layers[d]) layers[d] = [];
        layers[d].push(n);
    });

    const NODE_W = 220;
    const NODE_H = 90;
    const H_GAP = 60;
    const V_GAP = 100;

    const nodes: Node[] = [];
    const sortedLayers = Object.keys(layers).map(Number).sort();

    sortedLayers.forEach((depth) => {
        const layerNodes = layers[depth];
        const rowWidth = layerNodes.length * (NODE_W + H_GAP) - H_GAP;
        const startX = -rowWidth / 2;
        layerNodes.forEach((n, i) => {
            nodes.push({
                id: n.id,
                type: 'concept',
                position: { x: startX + i * (NODE_W + H_GAP), y: depth * (NODE_H + V_GAP) },
                data: {
                    label: n.label,
                    topic: n.topic,
                    mastery: n.mastery,
                    prereqs: n.prereqs,
                    selected: false,
                },
            });
        });
    });

    const edges: Edge[] = [];
    conceptNodes.forEach(n => {
        n.prereqs.forEach(pid => {
            if (conceptNodes.find(x => x.id === pid)) {
                const c = masteryColor(n.mastery);
                edges.push({
                    id: `${pid}->${n.id}`,
                    source: pid,
                    target: n.id,
                    animated: n.mastery < 0.5,
                    style: { stroke: c.border, strokeWidth: 1.5, opacity: 0.7 },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: c.border,
                        width: 16,
                        height: 16,
                    },
                });
            }
        });
    });

    return { nodes, edges };
}

// ── Detail side panel ─────────────────────────────────────────────────────────

function DetailPanel({ detail, onClose }: { detail: DetailPanel; onClose: () => void }) {
    const { node, prereqNodes, dependents } = detail;
    const c = masteryColor(node.mastery);
    const pct = Math.round(node.mastery * 100);

    return (
        <div className="cm-detail animate-fade-in">
            <div className="cm-detail-header">
                <div>
                    <h3>{node.label}</h3>
                    <span className="cm-detail-topic">{node.topic}</span>
                </div>
                <button className="cm-detail-close" onClick={onClose}><X size={16} /></button>
            </div>

            <div className="cm-detail-mastery">
                <span>Mastery</span>
                <div className="progress-bar" style={{ flex: 1 }}>
                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: c.border }} />
                </div>
                <span style={{ color: c.text, fontWeight: 700 }}>{pct}%</span>
            </div>

            <span className="badge" style={{ background: `${c.border}22`, color: c.text, alignSelf: 'flex-start' }}>
                {c.label}
            </span>

            {node.mastery < 0.5 && (
                <div className="cm-detail-alert">
                    <AlertCircle size={14} />
                    <span>Weak area — review before tackling dependent concepts.</span>
                </div>
            )}

            {prereqNodes.length > 0 && (
                <div className="cm-detail-section">
                    <h4>Prerequisites</h4>
                    <div className="cm-detail-tags">
                        {prereqNodes.map(n => {
                            const pc = masteryColor(n.mastery);
                            return (
                                <span key={n.id} className="badge" style={{ background: `${pc.border}22`, color: pc.text }}>
                                    {n.label} ({Math.round(n.mastery * 100)}%)
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {dependents.length > 0 && (
                <div className="cm-detail-section">
                    <h4>Unlocks</h4>
                    <div className="cm-detail-tags">
                        {dependents.map(n => (
                            <span key={n.id} className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}>
                                {n.label}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ConceptMapPage() {
    usePageTitle('Concept Map');
    const [courseTitle, setCourseTitle] = useState('');
    const [conceptNodes, setConceptNodes] = useState<ConceptNode[]>([]);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [detail, setDetail] = useState<DetailPanel | null>(null);
    const [generated, setGenerated] = useState(false);

    const generate = async () => {
        if (!courseTitle.trim()) { setError('Enter a course title.'); return; }
        setError('');
        setLoading(true);
        setDetail(null);
        try {
            const result = await api.post<ConceptGraphResponse>('/chat/concept-graph', {
                courseTitle: courseTitle.trim(),
                courses: [{ title: courseTitle.trim(), code: '', progressPercent: 50 }],
                recentQuizScores: [],
            });
            setConceptNodes(result.nodes);
            const { nodes: n, edges: e } = computeLayout(result.nodes);
            setNodes(n);
            setEdges(e);
            setGenerated(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to generate concept map.');
        } finally {
            setLoading(false);
        }
    };

    const onNodeClick = useCallback((_: any, node: Node) => {
        const cn = conceptNodes.find(n => n.id === node.id);
        if (!cn) return;
        const prereqNodes = conceptNodes.filter(n => cn.prereqs.includes(n.id));
        const dependents = conceptNodes.filter(n => n.prereqs.includes(cn.id));
        setDetail({ node: cn, prereqNodes, dependents });

        // Highlight selected node
        setNodes(ns => ns.map(n => ({
            ...n,
            data: { ...n.data, selected: n.id === node.id },
        })));
    }, [conceptNodes, setNodes]);

    const legend = [
        { color: '#C86F7A', label: 'Weak (<50%)', animated: true },
        { color: '#B59A63', label: 'Developing (50–80%)', animated: false },
        { color: '#5FA89C', label: 'Mastered (>80%)', animated: false },
    ];

    const stats = useMemo(() => ({
        total: conceptNodes.length,
        weak: conceptNodes.filter(n => n.mastery < 0.5).length,
        dev: conceptNodes.filter(n => n.mastery >= 0.5 && n.mastery < 0.8).length,
        mastered: conceptNodes.filter(n => n.mastery >= 0.8).length,
    }), [conceptNodes]);

    return (
        <div className="cm-page">
            {/* Header */}
            <div className="cm-header animate-fade-in">
                <div className="cm-header-left">
                    <Network size={22} style={{ color: 'var(--accent)' }} />
                    <div>
                        <h1>Concept Knowledge Map</h1>
                        <p>Visual dependency graph of every concept in your course, coloured by your mastery level.</p>
                    </div>
                </div>
                <div className="cm-controls">
                    <input
                        className="input cm-input"
                        placeholder="e.g. Digital Signal Processing"
                        value={courseTitle}
                        onChange={e => setCourseTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && generate()}
                    />
                    <button className="btn btn-primary" onClick={generate} disabled={loading}>
                        {loading
                            ? <><Loader2 size={16} className="animate-spin" /> Building...</>
                            : <><Sparkles size={16} /> Generate Map</>}
                    </button>
                </div>
            </div>

            {error && <p className="cm-error">{error}</p>}

            {/* Stats bar */}
            {generated && (
                <div className="cm-stats-bar animate-fade-in">
                    <span className="cm-stat-item"><strong>{stats.total}</strong> concepts</span>
                    <span className="cm-stat-sep" />
                    <span className="cm-stat-item" style={{ color: '#C86F7A' }}><strong>{stats.weak}</strong> weak</span>
                    <span className="cm-stat-sep" />
                    <span className="cm-stat-item" style={{ color: '#B59A63' }}><strong>{stats.dev}</strong> developing</span>
                    <span className="cm-stat-sep" />
                    <span className="cm-stat-item" style={{ color: '#5FA89C' }}><strong>{stats.mastered}</strong> mastered</span>
                    <span className="cm-stat-sep" />
                    <div className="cm-legend">
                        {legend.map(l => (
                            <span key={l.label} className="cm-legend-item">
                                <span className="cm-legend-line" style={{ background: l.color }} />
                                {l.label}
                            </span>
                        ))}
                    </div>
                    <span className="cm-legend-hint"><Info size={12} /> Click any node for details</span>
                </div>
            )}

            {/* Graph canvas */}
            {generated ? (
                <div className="cm-canvas-wrap animate-fade-in">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={onNodeClick}
                        nodeTypes={nodeTypes}
                        fitView
                        fitViewOptions={{ padding: 0.15 }}
                        minZoom={0.3}
                        maxZoom={2}
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background color="var(--border)" gap={24} size={1} />
                        <Controls className="cm-controls-panel" />
                        <MiniMap
                            nodeColor={n => {
                                const m = (n.data as any)?.mastery ?? 0.5;
                                return masteryColor(m).border;
                            }}
                            maskColor="rgba(0,0,0,0.4)"
                            className="cm-minimap"
                        />
                    </ReactFlow>

                    {detail && (
                        <div className="cm-detail-overlay">
                            <DetailPanel detail={detail} onClose={() => {
                                setDetail(null);
                                setNodes(ns => ns.map(n => ({ ...n, data: { ...n.data, selected: false } })));
                            }} />
                        </div>
                    )}
                </div>
            ) : (
                !loading && (
                    <div className="cm-empty-state animate-fade-in">
                        <Network size={56} strokeWidth={1} style={{ color: 'var(--text-muted)' }} />
                        <h2>Enter a course to build your knowledge map</h2>
                        <p>The AI generates a full concept dependency graph — arrows show what must be learned before what. Nodes glow red when weak, gold when developing, green when mastered.</p>
                        <div className="cm-empty-demo">
                            {['Fundamentals', 'Core Theory', 'Applications', 'Advanced'].map((l, i) => (
                                <div key={l} className="cm-empty-demo-node" style={{
                                    borderColor: ['#C86F7A', '#B59A63', '#B59A63', '#5FA89C'][i],
                                    color: ['#C86F7A', '#B59A63', '#B59A63', '#5FA89C'][i],
                                }}>
                                    {l}
                                </div>
                            ))}
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
