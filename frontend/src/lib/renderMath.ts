import katex from 'katex';
import 'katex/dist/katex.min.css';

function escapeHtml(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderKatex(tex: string, display: boolean): string {
    try {
        return katex.renderToString(tex, {
            displayMode: display,
            throwOnError: false,
            output: 'html',   // pure HTML — no SVG path data that breaks React's DOM parser
            strict: false,
        });
    } catch {
        const escaped = escapeHtml(tex);
        return display
            ? `<div class="math-fallback-display">$$${escaped}$$</div>`
            : `<span class="math-fallback-inline">$${escaped}$</span>`;
    }
}

/**
 * Strip ALL internal pipeline artifacts before rendering to student.
 * This runs on every AI response — nothing internal should ever reach the UI.
 */
function stripArtifacts(text: string): string {
    return text
        // ── Internal labels ──────────────────────────────────────────────
        .replace(/\[Knowledge\s+[Bb]ase\s+[Aa]nswer\]/gi, '')
        .replace(/\[Source:\s*[^\]]+\]/gi, '')
        .replace(/\[\d+(?:,\s*\d+)*\]/g, '')   // [1], [2,3] citation markers

        // ── "not found in knowledge base / context / excerpts" sentences ─
        .replace(/While\s+the\s+specific\s+term[^.]*?(?:knowledge base|provided|context)[^.]*\./gi, '')
        .replace(/[^\n.]*?(?:was|were|is|are)\s+not\s+(?:found|mentioned|discussed|covered|present|available)\s+in\s+(?:the\s+)?(?:provided\s+)?(?:knowledge\s+base|context|excerpts?|notes?|books?)[^.]*\./gi, '')
        .replace(/I\s+do\s+not\s+have\s+this\s+information\s+in\s+my\s+(?:notes|knowledge\s+base|context)[^.]*\./gi, '')
        .replace(/No\s+relevant\s+information\s+(?:was\s+)?found\s+in\s+(?:this\s+)?(?:the\s+)?knowledge\s+base[^.]*\./gi, '')
        .replace(/(?:the|this)\s+(?:provided\s+)?(?:knowledge\s+base|context|excerpts?)\s+(?:does not|doesn't|do not|don't)\s+(?:contain|include|mention|cover)[^.]*\./gi, '')
        .replace(/based\s+on\s+(?:the\s+)?(?:provided\s+)?(?:knowledge\s+base|context|excerpts?)[^,.]*/gi, '')

        // ── Sources / References sections — strip to end of response ─────
        .replace(/\s*(?:Sources?|References?):\s*\n[\s\S]*/gi, '')

        // ── Horizontal rules ─────────────────────────────────────────────
        .replace(/^---+\s*$/gm, '')

        // ── Collapse extra blank lines ────────────────────────────────────
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Convert full AI markdown response into safe HTML.
 *
 * Handles:
 *  - $$...$$ display math
 *  - $...$ inline math
 *  - ### / ## / # headings  →  styled heading divs
 *  - **bold**, *italic*
 *  - numbered lists  1. item
 *  - bullet lists  - / • item
 *  - [Source: ...] badges
 *  - --- horizontal rules → ignored
 *  - plain line breaks
 *
 * Code fences (```...```) should be extracted by the caller (MathContent) before calling this.
 */
export function renderMath(text: string): string {
    let out = stripArtifacts(text);

    // 1a. \[...\] display math (LaTeX standard)
    out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_, tex) => renderKatex(tex.trim(), true));

    // 1b. \(...\) inline math (LaTeX standard)
    out = out.replace(/\\\((.+?)\\\)/g, (_, tex) => renderKatex(tex.trim(), false));

    // 1c. \begin{...}...\end{...} environments (align*, equation, etc.)
    out = out.replace(/\\begin\{([^}]+)\}([\s\S]+?)\\end\{\1\}/g, (_, env, body) =>
        renderKatex(`\\begin{${env}}${body}\\end{${env}}`, true)
    );

    // 1d. Display math  $$...$$
    out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => renderKatex(tex.trim(), true));

    // 2. Inline math  $...$
    out = out.replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (_, tex) => renderKatex(tex.trim(), false));

    // 3. Headings  #### h4, ### h3, ## h2, # h1
    out = out.replace(/^####\s+(.+)$/gm, '<div class="ai-h4">$1</div>');
    out = out.replace(/^###\s+(.+)$/gm,  '<div class="ai-h3">$1</div>');
    out = out.replace(/^##\s+(.+)$/gm,   '<div class="ai-h2">$1</div>');
    out = out.replace(/^#\s+(.+)$/gm,    '<div class="ai-h1">$1</div>');

    // 4. Bold **text**
    out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // 5. Italic *text*
    out = out.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

    // 6. Horizontal rules --- → ignore (just remove)
    out = out.replace(/^---+$/gm, '');

    // 7. Source badges  [Source: ...]
    out = out.replace(/\[Source:\s*([^\]]+)\]/g, '<span class="ai-source-badge">📚 $1</span>');

    // 8. Markdown tables  | col | col |
    out = out.replace(/((?:^\|.+\|\s*\n)+)/gm, (tableBlock) => {
        const rows = tableBlock.trim().split('\n').filter(r => r.trim());
        let html = '<table class="ai-table">';
        let isHeader = true;
        for (const row of rows) {
            if (/^\|[-:| ]+\|$/.test(row.trim())) { isHeader = false; continue; }
            const cells = row.trim().replace(/^\||\|$/g, '').split('|');
            const tag = isHeader ? 'th' : 'td';
            html += `<tr>${cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('')}</tr>`;
            if (isHeader) isHeader = false;
        }
        html += '</table>';
        return html;
    });

    // 9. Numbered lists  1. item
    out = out.replace(/^\d+\.\s+(.+)$/gm, '<li class="ai-ol-item">$1</li>');
    out = out.replace(/(<li class="ai-ol-item">[\s\S]*?<\/li>)+/g, m => `<ol>${m}</ol>`);

    // 10. Bullet lists  - item or • item
    out = out.replace(/^[\-•]\s+(.+)$/gm, '<li>$1</li>');
    out = out.replace(/(<li>[\s\S]*?<\/li>)+/g, m => `<ul>${m}</ul>`);

    // 11. Line breaks — only replace \n that are outside HTML tags
    // Split on HTML tags, replace \n only in text segments
    out = out.split(/(<[^>]+>)/g).map((segment, i) => {
        // Odd-indexed segments are HTML tags — leave them alone
        if (i % 2 === 1) return segment;
        return segment.replace(/\n/g, '<br/>');
    }).join('');

    // 12. Clean up extra <br/> around block elements
    out = out.replace(/(<br\/>)+(<\/?div|<\/?ul|<\/?ol|<\/?li|<\/?table|<\/?tr|<\/?th|<\/?td)/g, '$2');
    out = out.replace(/(<\/div>|<\/ul>|<\/ol>|<\/table>)(<br\/>)+/g, '$1');

    return out;
}
