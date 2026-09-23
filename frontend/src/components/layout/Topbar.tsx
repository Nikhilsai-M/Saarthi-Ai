import { useState, useEffect, useRef } from 'react';
import { Search, Bell, ChevronDown, Menu, LogOut, User, Settings, Sun, Moon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useSettingsStore } from '../../stores/settings.store';
import { getInitials } from '../../lib/utils';
import './Topbar.css';

const ROUTE_LABELS: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/courses': 'Courses',
    '/chat': 'AI Tutor',
    '/quiz': 'Quizzes',
    '/code-lab': 'Coding Lab',
    '/videos': 'Video Library',
    '/progress': 'Analytics',
    '/notes': 'Notes',
    '/flashcards': 'Flashcards',
    '/concept-map': 'Concept Map',
    '/exam-prep': 'Exam Prep',
    '/socratic': 'Socratic Mode',
    '/search': 'Search',
    '/settings': 'Settings',
};

export default function Topbar() {
    const [showProfile, setShowProfile] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { user, isAuthenticated, logout } = useAuthStore();
    const { theme, setTheme } = useSettingsStore();
    const navigate = useNavigate();
    const location = useLocation();
    const searchRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const pageLabel = Object.entries(ROUTE_LABELS).find(([path]) =>
        location.pathname.startsWith(path)
    )?.[1] ?? '';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleTheme = () => {
        const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        setTheme(isDark ? 'light' : 'dark');
    };

    // Cmd+K focuses search
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchRef.current?.focus();
                searchRef.current?.select();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowProfile(false);
            }
        };
        if (showProfile) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showProfile]);

    return (
        <header className="topbar">
            <div className="topbar-left">
                <button className="topbar-menu-btn" aria-label="Menu">
                    <Menu size={20} />
                </button>
                {pageLabel && (
                    <span className="topbar-breadcrumb">{pageLabel}</span>
                )}
            </div>

            {/* Search */}
            <div className="topbar-search">
                <Search size={16} className="topbar-search-icon" />
                <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search courses, videos, notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchQuery.trim()) {
                            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                            setSearchQuery('');
                        }
                        if (e.key === 'Escape') searchRef.current?.blur();
                    }}
                    className="topbar-search-input"
                />
                <kbd className="topbar-search-kbd">⌘K</kbd>
            </div>

            {/* Right Actions */}
            <div className="topbar-actions">
                {/* Theme Toggle */}
                <button className="topbar-icon-btn" aria-label="Toggle theme" onClick={toggleTheme}>
                    {theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? (
                        <Sun size={18} />
                    ) : (
                        <Moon size={18} />
                    )}
                </button>
                {/* Notifications — no fake badge */}
                <button className="topbar-icon-btn" aria-label="Notifications">
                    <Bell size={18} />
                </button>

                {/* Profile Dropdown */}
                <div className="topbar-profile-wrapper" ref={dropdownRef}>
                    <button
                        className="topbar-profile"
                        onClick={() => setShowProfile(!showProfile)}
                    >
                        <div className="avatar avatar-md">
                            {user?.avatar ? (
                                <img src={user.avatar} alt={user.name} />
                            ) : (
                                getInitials(user?.name || 'User')
                            )}
                        </div>
                        <div className="topbar-profile-info">
                            <span className="topbar-profile-name">{isAuthenticated ? (user?.name || 'User') : 'Not signed in'}</span>
                            <span className="topbar-profile-role">{isAuthenticated ? (user?.role || 'user') : 'guest'}</span>
                        </div>
                        <ChevronDown size={16} />
                    </button>

                    {showProfile && (
                        <div className="topbar-dropdown animate-scale-in">
                            <div className="topbar-dropdown-header">
                                <div className="avatar avatar-lg">
                                    {getInitials(user?.name || 'User')}
                                </div>
                                <div>
                                    <p className="topbar-dropdown-name">{isAuthenticated ? (user?.name || 'User') : 'Not signed in'}</p>
                                    <p className="topbar-dropdown-email">{user?.email || '—'}</p>
                                </div>
                            </div>
                            <div className="topbar-dropdown-divider" />
                            <button className="topbar-dropdown-item" onClick={() => { navigate('/settings'); setShowProfile(false); }}>
                                <User size={16} /> Profile
                            </button>
                            <button className="topbar-dropdown-item" onClick={() => { navigate('/settings'); setShowProfile(false); }}>
                                <Settings size={16} /> Settings
                            </button>
                            <div className="topbar-dropdown-divider" />
                            <button className="topbar-dropdown-item topbar-dropdown-danger" onClick={handleLogout}>
                                <LogOut size={16} /> Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
