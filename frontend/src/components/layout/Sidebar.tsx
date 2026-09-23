import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, BookOpen, MessageSquare, Code2, FlaskConical,
    BarChart3, Settings, ChevronLeft, ChevronRight,
    GraduationCap, Eye, ShieldCheck, Layers, Network, Target, Swords
} from 'lucide-react';

const IS_ADMIN = !!import.meta.env.VITE_ADMIN_TOKEN;
import './Sidebar.css';
import { LogoIcon } from '../LogoIcon';

const navGroups = [
    {
        label: 'Learn',
        items: [
            { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { path: '/courses', label: 'Courses', icon: BookOpen },
            { path: '/videos', label: 'Video Library', icon: Eye },
            { path: '/notes', label: 'Notes', icon: FlaskConical },
        ],
    },
    {
        label: 'Practice',
        items: [
            { path: '/chat', label: 'AI Tutor', icon: MessageSquare },
            { path: '/quiz', label: 'Quizzes', icon: GraduationCap },
            { path: '/code-lab', label: 'Coding Lab', icon: Code2 },
            { path: '/flashcards', label: 'Flashcards', icon: Layers },
            { path: '/socratic', label: 'Socratic Mode', icon: Swords },
        ],
    },
    {
        label: 'Insights',
        items: [
            { path: '/progress', label: 'Analytics', icon: BarChart3 },
            { path: '/concept-map', label: 'Concept Map', icon: Network },
            { path: '/exam-prep', label: 'Exam Prep', icon: Target },
        ],
    },
];

const bottomItems = [
    { path: '/settings', label: 'Settings', icon: Settings },
    ...(IS_ADMIN ? [{ path: '/admin', label: 'Admin Panel', icon: ShieldCheck }] : []),
];

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();

    return (
        <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
            {/* Brand */}
            <div className="sidebar-brand">
                <div className="sidebar-logo">
                    <LogoIcon size={24} />
                </div>
                {!collapsed && <span className="sidebar-brand-text">Saarthi.ai</span>}
                <button
                    className="sidebar-toggle"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label="Toggle sidebar"
                >
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <div style={{ flex: 1, overflow: 'hidden auto' }}>
                    {navGroups.map((group) => (
                        <div key={group.label} className="sidebar-nav-group">
                            {!collapsed && (
                                <span className="sidebar-section-label">{group.label}</span>
                            )}
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname.startsWith(item.path);
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={`sidebar-link ${isActive ? 'active' : ''}`}
                                        title={collapsed ? item.label : undefined}
                                    >
                                        <Icon size={18} />
                                        {!collapsed && <span>{item.label}</span>}
                                    </NavLink>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Bottom nav */}
                <div className="sidebar-nav-bottom">
                    {bottomItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={`sidebar-link ${isActive ? 'active' : ''}`}
                                title={collapsed ? item.label : undefined}
                            >
                                <Icon size={20} />
                                {!collapsed && <span>{item.label}</span>}
                            </NavLink>
                        );
                    })}
                </div>
            </nav>
        </aside>
    );
}
