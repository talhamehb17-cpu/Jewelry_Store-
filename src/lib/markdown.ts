/**
 * Minimal, safe Markdown renderer for CMS content. All input is HTML-escaped first; only a small set
 * of Markdown constructs are converted. Links are restricted to http(s), mailto, tel and relative URLs.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function safeUrl(url: string) {
  const u = url.trim();
  return /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(u) ? u : '#';
}

function inline(text: string) {
  let s = esc(text);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, url: string) => {
    const href = safeUrl(url.replace(/&amp;/g, '&'));
    const external = /^https?:\/\//i.test(href);
    return `<a href="${esc(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return s;
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = Math.min(4, Math.max(2, h[1]!.length));
      const text = h[2]!;
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      out.push('<hr />');
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]!)) items.push(`<li>${inline(lines[i]!.replace(/^\s*[-*]\s+/, ''))}</li>`), i++;
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i]!)) items.push(`<li>${inline(lines[i]!.replace(/^\s*\d+\.\s+/, ''))}</li>`), i++;
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }
    if (/^\|.*\|\s*$/.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i]!)) {
        const cells = lines[i]!.trim().slice(1, -1).split('|').map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      out.push(`<table><thead><tr>${(head ?? []).map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(#{1,4}\s|\s*[-*]\s+|\s*\d+\.\s+|\||---+$)/.test(lines[i]!)) para.push(lines[i]!), i++;
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}

/** Parses FAQ markdown: "## Section" headings with "### Question" + answer paragraphs. */
export function parseFaq(md: string) {
  const sections: { title: string; items: { q: string; a: string }[] }[] = [];
  let current: (typeof sections)[number] | null = null;
  let q: { q: string; a: string } | null = null;
  for (const line of md.split('\n')) {
    if (line.startsWith('## ')) {
      current = { title: line.slice(3).trim(), items: [] };
      sections.push(current);
      q = null;
    } else if (line.startsWith('### ')) {
      if (!current) {
        current = { title: 'General', items: [] };
        sections.push(current);
      }
      q = { q: line.slice(4).trim(), a: '' };
      current.items.push(q);
    } else if (q && line.trim()) {
      q.a += (q.a ? '\n' : '') + line;
    }
  }
  return sections;
}

export function stripMarkdown(md: string) {
  return md.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[#*_|>-]/g, '').replace(/\s+/g, ' ').trim();
}
