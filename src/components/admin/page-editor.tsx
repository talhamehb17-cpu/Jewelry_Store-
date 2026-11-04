'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Eye, Pencil, Save, Trash2, Loader2, Bold, Heading2, List, Link2 } from 'lucide-react';
import { deletePage, savePage } from '@/app/actions/admin/content';
import { renderMarkdown } from '@/lib/markdown';
import { Card, Field } from './ui';
import { slugify } from '@/lib/utils';

type P = { id?: number; title: string; slug: string; content: string; template: 'default' | 'about' | 'faq' | 'contact' | 'policy'; status: 'published' | 'draft'; seoTitle: string; seoDescription: string };

export function PageEditor({ initial, system }: { initial: P; system: boolean }) {
  const router = useRouter();
  const [p, setP] = useState<P>(initial);
  const [preview, setPreview] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof P>(k: K, v: P[K]) => setP((x) => ({ ...x, [k]: v }));
  const insert = (before: string, after = '') => {
    const ta = document.getElementById('md') as HTMLTextAreaElement | null;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const v = p.content;
    set('content', v.slice(0, s) + before + v.slice(s, e) + after + v.slice(e));
  };
  const save = () =>
    start(async () => {
      const r = await savePage(p);
      setMsg(r);
      if (r.ok && !p.id && r.id) router.replace(`/admin/pages/${r.id}`);
      else if (r.ok) router.refresh();
    });
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/pages" className="text-[0.78rem] text-muted hover:text-ink">← Pages</Link>
          <h1 className="font-heading text-[1.8rem]">{p.title || 'New page'}</h1>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-2">
          {msg && <span className={`text-[0.78rem] ${msg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{msg.message}</span>}
          {p.id && !system && <button onClick={() => confirm('Delete this page?') && start(async () => { const r = await deletePage(p.id!); if (r.ok) router.push('/admin/pages'); else setMsg(r); })} className="btn btn-secondary !text-rose-700"><Trash2 size={14} /> Delete</button>}
          <button onClick={save} disabled={pending} className="btn btn-primary">{pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save</button>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card title="Content" actions={<button onClick={() => setPreview((v) => !v)} className="btn btn-secondary btn-sm">{preview ? <><Pencil size={13} /> Edit</> : <><Eye size={13} /> Preview</>}</button>}>
          <Field label="Title"><input value={p.title} onChange={(e) => set('title', e.target.value)} className="field" /></Field>
          <div className="mt-4">
            {preview ? (
              <div className="prose-aurelle max-h-[65vh] overflow-y-auto rounded-lg border border-line bg-[#fdfcfa] p-6" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.content) }} />
            ) : (
              <>
                <div className="mb-2 flex flex-wrap gap-1">
                  <button type="button" onClick={() => insert('\n## ', '')} className="rounded p-1.5 hover:bg-secondary" aria-label="Heading"><Heading2 size={15} /></button>
                  <button type="button" onClick={() => insert('**', '**')} className="rounded p-1.5 hover:bg-secondary" aria-label="Bold"><Bold size={15} /></button>
                  <button type="button" onClick={() => insert('\n- ', '')} className="rounded p-1.5 hover:bg-secondary" aria-label="List"><List size={15} /></button>
                  <button type="button" onClick={() => insert('[', '](/link)')} className="rounded p-1.5 hover:bg-secondary" aria-label="Link"><Link2 size={15} /></button>
                  <span className="basis-full self-center text-[0.72rem] text-muted sm:ml-auto sm:basis-auto">Markdown: ## heading, **bold**, - list, [text](/link), | tables |</span>
                </div>
                <textarea id="md" value={p.content} onChange={(e) => set('content', e.target.value)} rows={24} className="field font-mono !text-[0.8rem] leading-relaxed" />
                {p.template === 'faq' && <p className="mt-2 text-[0.75rem] text-muted">FAQ format: use “## Section” for groups and “### Question” followed by the answer.</p>}
              </>
            )}
          </div>
        </Card>
        <div className="space-y-6">
          <Card title="Publishing">
            <div className="space-y-4">
              <Field label="Status"><select value={p.status} onChange={(e) => set('status', e.target.value as P['status'])} className="field"><option value="published">Published</option><option value="draft">Draft (staff only)</option></select></Field>
              <Field label="Template"><select value={p.template} onChange={(e) => set('template', e.target.value as P['template'])} className="field" disabled={system}><option value="default">Standard page</option><option value="policy">Policy</option><option value="faq">FAQ</option><option value="about">About</option><option value="contact">Contact</option></select></Field>
              <Field label="URL handle" hint={system ? 'System page URLs are fixed.' : `/${p.template === 'policy' ? 'policies' : 'pages'}/${slugify(p.slug || p.title)}`}><input value={p.slug} onChange={(e) => set('slug', e.target.value)} disabled={system} className="field" placeholder={slugify(p.title)} /></Field>
            </div>
          </Card>
          <Card title="SEO">
            <div className="space-y-4">
              <Field label="SEO title"><input value={p.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} className="field" /></Field>
              <Field label="Meta description"><textarea value={p.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} rows={3} className="field" /></Field>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
