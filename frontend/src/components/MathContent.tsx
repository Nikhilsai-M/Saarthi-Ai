import { useEffect, useRef } from 'react';
import { renderMath } from '../lib/renderMath';
import './MathContent.css';

interface Props {
    content: string;
    streaming?: boolean;
}

/**
 * Renders AI response text with KaTeX math + markdown.
 * Uses a ref + useEffect so KaTeX is always available by paint time,
 * even if the CDN script loaded after first React render.
 */
export default function MathContent({ content, streaming }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Don't re-render math on every streaming chunk — wait until done
        if (streaming) return;
        if (!containerRef.current) return;

        const parts = content.split(/(```[\s\S]*?```)/g);
        containerRef.current.innerHTML = '';

        for (const part of parts) {
            if (part.startsWith('```')) {
                const lines = part.slice(3).split('\n');
                const lang = lines[0].trim();
                const code = (lang ? lines.slice(1) : lines).join('\n').replace(/```$/, '').trimEnd();
                const pre = document.createElement('pre');
                pre.className = 'math-code-block';
                if (lang) {
                    const badge = document.createElement('span');
                    badge.className = 'math-code-lang';
                    badge.textContent = lang;
                    pre.appendChild(badge);
                }
                const codeEl = document.createElement('code');
                codeEl.textContent = code;
                pre.appendChild(codeEl);
                containerRef.current.appendChild(pre);
            } else {
                const span = document.createElement('span');
                span.innerHTML = renderMath(part);
                containerRef.current.appendChild(span);
            }
        }
    }, [content, streaming]);

    // While streaming: render plain text (no math processing per-chunk)
    // After streaming: useEffect above takes over with full KaTeX rendering
    if (streaming) {
        const plain = content
            .replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => t.trim())
            .replace(/\\\((.+?)\\\)/g, (_, t) => t.trim())
            .replace(/\\begin\{[^}]+\}[\s\S]+?\\end\{[^}]+\}/g, '[math]')
            .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => t.trim())
            .replace(/\$([^$\n]+?)\$/g, (_, t) => t.trim())
            .replace(/#{1,4}\s+/g, '')
            .replace(/\*\*(.+?)\*\*/g, '$1');
        return (
            <div className="math-content" ref={containerRef}>
                <span>{plain}</span>
                <span className="chat-cursor" />
            </div>
        );
    }

    return <div className="math-content" ref={containerRef} />;
}
