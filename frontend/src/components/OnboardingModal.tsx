import { useState } from 'react';
import { BookOpen, MessageSquare, BarChart3, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './OnboardingModal.css';

const steps = [
    {
        icon: BookOpen,
        title: 'Join your first course',
        desc: 'Your teacher sends you an invite link. Click it and you\'ll be enrolled automatically — no codes to enter.',
        cta: 'Browse Courses',
        path: '/courses',
    },
    {
        icon: MessageSquare,
        title: 'Ask the AI Tutor anything',
        desc: 'Stuck on a concept? The AI Tutor is trained on your course material — it gives precise answers, not generic ones.',
        cta: 'Try AI Tutor',
        path: '/chat',
    },
    {
        icon: BarChart3,
        title: 'Track your progress',
        desc: 'See your quiz scores, study time, and how you compare with peers — all in one place.',
        cta: 'View Analytics',
        path: '/progress',
    },
];

interface Props {
    onClose: () => void;
}

export default function OnboardingModal({ onClose }: Props) {
    const [step, setStep] = useState(0);
    const navigate = useNavigate();
    const current = steps[step];
    const Icon = current.icon;
    const isLast = step === steps.length - 1;

    const handleCta = () => {
        onClose();
        navigate(current.path);
    };

    return (
        <div className="onboarding-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="onboarding-modal animate-scale-in">
                <button className="onboarding-close" onClick={onClose} aria-label="Close">
                    <X size={18} />
                </button>

                <div className="onboarding-step-indicator">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`onboarding-dot ${i === step ? 'active' : i < step ? 'done' : ''}`}
                            onClick={() => setStep(i)}
                        />
                    ))}
                </div>

                <div className="onboarding-icon-wrap">
                    <Icon size={32} />
                </div>

                <h2 className="onboarding-title">{current.title}</h2>
                <p className="onboarding-desc">{current.desc}</p>

                <div className="onboarding-actions">
                    <button className="btn btn-primary" onClick={handleCta}>
                        {current.cta} <ArrowRight size={16} />
                    </button>
                    {!isLast ? (
                        <button className="btn btn-ghost" onClick={() => setStep(step + 1)}>
                            Next
                        </button>
                    ) : (
                        <button className="btn btn-ghost" onClick={onClose}>
                            Done
                        </button>
                    )}
                </div>

                <p className="onboarding-skip" onClick={onClose}>Skip tour</p>
            </div>
        </div>
    );
}
