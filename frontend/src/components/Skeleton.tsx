import './Skeleton.css';

interface SkeletonProps {
    width?: string;
    height?: string;
    radius?: string;
    className?: string;
}

export function Skeleton({ width = '100%', height = '1rem', radius = '0.375rem', className = '' }: SkeletonProps) {
    return (
        <div
            className={`skeleton-pulse ${className}`}
            style={{ width, height, borderRadius: radius }}
            aria-hidden="true"
        />
    );
}

export function SkeletonCard() {
    return (
        <div className="skeleton-card">
            <Skeleton height="2.5rem" width="2.5rem" radius="50%" />
            <div className="skeleton-card-body">
                <Skeleton height="0.875rem" width="60%" />
                <Skeleton height="0.75rem" width="40%" />
            </div>
        </div>
    );
}

export function SkeletonStatCard() {
    return (
        <div className="skeleton-stat-card">
            <Skeleton height="3rem" width="3rem" radius="0.75rem" />
            <div className="skeleton-card-body">
                <Skeleton height="1.75rem" width="3rem" />
                <Skeleton height="0.75rem" width="5rem" />
            </div>
        </div>
    );
}

export function SkeletonCourseCard() {
    return (
        <div className="skeleton-course-card">
            <Skeleton height="140px" radius="0.75rem 0.75rem 0 0" />
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Skeleton height="1rem" width="70%" />
                <Skeleton height="0.75rem" width="40%" />
                <Skeleton height="0.5rem" radius="9999px" />
            </div>
        </div>
    );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} height="0.875rem" width={i === lines - 1 ? '60%' : '100%'} />
            ))}
        </div>
    );
}
