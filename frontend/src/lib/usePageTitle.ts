import { useEffect } from 'react';

export function usePageTitle(title: string) {
    useEffect(() => {
        document.title = title ? `${title} — Saarthi.ai` : 'Saarthi.ai';
        return () => { document.title = 'Saarthi.ai'; };
    }, [title]);
}
