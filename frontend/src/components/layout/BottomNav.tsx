import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, MessageSquare, BarChart3, Settings } from 'lucide-react';
import './BottomNav.css';

const navItems = [
    { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
    { icon: BookOpen, label: 'Courses', path: '/courses' },
    { icon: MessageSquare, label: 'AI Tutor', path: '/chat' },
    { icon: BarChart3, label: 'Progress', path: '/progress' },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function BottomNav() {
    return (
        <nav className="bottom-nav" aria-label="Mobile navigation">
            {navItems.map(({ icon: Icon, label, path }) => (
                <NavLink
                    key={path}
                    to={path}
                    className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
                >
                    <Icon size={20} />
                    <span>{label}</span>
                </NavLink>
            ))}
        </nav>
    );
}
