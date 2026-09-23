import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import OnboardingModal from '../OnboardingModal';
import './AppShell.css';

const ONBOARDING_KEY = 'saarthi_onboarding_done';

export default function AppShell() {
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem(ONBOARDING_KEY)) {
            setShowOnboarding(true);
        }
    }, []);

    const handleOnboardingClose = () => {
        localStorage.setItem(ONBOARDING_KEY, '1');
        setShowOnboarding(false);
    };

    return (
        <div className="app-shell">
            <Sidebar />
            <div className="app-main">
                <Topbar />
                <main className="app-content">
                    <Outlet />
                </main>
            </div>
            <BottomNav />
            {showOnboarding && <OnboardingModal onClose={handleOnboardingClose} />}
        </div>
    );
}
