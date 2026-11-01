'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, Copy, Trash2, Pencil, Plus, Monitor, Smartphone, Layers, Loader2, Check, Upload, Undo2, RotateCcw, Megaphone, PanelBottom, ChevronLeft, Paintbrush, X } from 'lucide-react';
import { discardThemeDraft, publishTheme, resetThemeDefaults, saveThemeDraft } from '@/app/actions/admin/themes';
import { SECTION_REGISTRY } from '@/themes/registry';
import { SECTION_TYPES, type SectionInstance, type SectionType, type ThemeConfig } from '@/themes/types';
import { DeviceToggle, FieldControl, PreviewFrame, type Device, type StudioData } from './studio';
import { cn } from '@/lib/utils';

function Row({ s, onEdit, onToggle, onDuplicate, onDelete, onVisibility }: { s: SectionInstance; onEdit: () => void; onToggle: () => void; onDuplicate: () => void; onDelete: () => void; onVisibility: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  const def = SECTION_REGISTRY[s.type];
  const variant = def.variants.find((v) => v.id === s.variant)?.label ?? s.variant;
  const title = (s.settings.heading as string) || (Array.isArray(s.settings.slides) && s.settings.slides[0]?.heading) || '';
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn('group flex items-center gap-2 rounded-lg border bg-white px-2 py-2', isDragging ? 'z-10 border-[#a8844a] shadow-xl' : 'border-line', !s.enabled && 'opacity-55')}>
      <button {...attributes} {...listeners} className="cursor-grab p-1 text-muted active:cursor-grabbing" aria-label="Drag to reorder"><GripVertical size={15} /></button>
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[0.82rem] font-medium">{def.label}</span>
        <span className="block truncate text-[0.7rem] text-muted">{variant}{title ? ` · ${title}` : ''}</span>
      </button>
      <button onClick={onVisibility} className="rounded p-1 text-muted hover:bg-secondary hover:text-ink" title={`Visible on: ${s.visibility}`} aria-label="Change device visibility">
        {s.visibility === 'desktop' ? <Monitor size={14} /> : s.visibility === 'mobile' ? <Smartphone size={14} /> : <Layers size={14} />}
      </button>
      <button onClick={onToggle} className="rounded p-1 text-muted hover:bg-secondary hover:text-ink" aria-label={s.enabled ? 'Hide section' : 'Show section'}>{s.enabled ? <Eye size={14} /> : <EyeOff size={14} />}</button>
      <button onClick={onEdit} className="rounded p-1 text-muted hover:bg-secondary hover:text-ink" aria-label="Edit section"><Pencil size={14} /></button>
      <button onClick={onDuplicate} className="rounded p-1 text-muted opacity-0 hover:bg-secondary hover:text-ink group-hover:opacity-100" aria-label="Duplicate section"><Copy size={14} /></button>
      <button onClick={onDelete} className="rounded p-1 text-muted opacity-0 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100" aria-label="Delete section"><Trash2 size={14} /></button>
    </li>
  );
}

export function Builder({ themeId, themes, activeTheme, initial, hasDraft, data }: { themeId: string; themes: { id: string; name: string }[]; activeTheme: string; initial: ThemeConfig; hasDraft: boolean; data: StudioData }) {
  const router = useRouter();
  const [sections, setSections] = useState<SectionInstance[]>(initial.sections);
  const [settings, setSettings] = useState(initial.settings);
  const [editing, setEditing] = useState<string | 'announcement' | 'footer' | null>(null);
  const [adding, setAdding] = useState(false);
  const [device, setDevice] = useState<Device>('desktop');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(hasDraft ? 'saved' : 'idle');
  const [draft, setDraft] = useState(hasDraft);
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();
  const frame = useRef<HTMLIFrameElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ sections, settings });
  latest.current = { sections, settings };
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const reload = () => frame.current?.contentWindow?.location.reload();
  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setStatus('saving');
    const r = await saveThemeDraft(themeId, latest.current);
    setStatus(r.ok ? 'saved' : 'error');
    if (r.ok) setDraft(true);
    else setMsg(r.message);
    reload();
    return r.ok;
  }, [themeId]);
  const schedule = () => {
    setStatus('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 900);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const update = (fn: (prev: SectionInstance[]) => SectionInstance[]) => {
    setSections((prev) => {
      const next = fn(prev);
      latest.current = { ...latest.current, sections: next };
      return next;
    });
    schedule();
  };
  const patchSection = (id: string, patch: Partial<SectionInstance>) => update((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const patchSettings = (fn: (s: typeof settings) => typeof settings) => {
    setSettings((prev) => {
      const next = fn(prev);
      latest.current = { ...latest.current, settings: next };
      return next;
    });
    schedule();
  };
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    update((prev) => arrayMove(prev, prev.findIndex((s) => s.id === e.active.id), prev.findIndex((s) => s.id === e.over!.id)));
  };
  const addSection = (type: SectionType) => {
    const def = SECTION_REGISTRY[type];
    const s: SectionInstance = { id: `${type}-${Date.now().toString(36)}`, type, enabled: true, visibility: 'all', variant: def.variants[0]!.id, settings: def.defaults() };
    update((prev) => [...prev, s]);
    setAdding(false);
    setEditing(s.id);
  };

  const current = sections.find((s) => s.id === editing);
  const def = current ? SECTION_REGISTRY[current.type] : null;

  return (
    <div className="flex h-[100dvh] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin/themes" className="text-[0.78rem] text-muted hover:text-ink">← Themes</Link>
          <select value={themeId} onChange={(e) => router.push(`/admin/builder?theme=${e.target.value}`)} className="field !w-auto !py-1.5 font-medium" aria-label="Theme to edit">
            {themes.map((t) => <option key={t.id} value={t.id}>{t.name}{t.id === activeTheme ? ' (live)' : ''}</option>)}
          </select>
          <span className="text-[0.75rem] text-muted">{status === 'saving' ? <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Saving…</span> : status === 'saved' ? <span className="inline-flex items-center gap-1 text-emerald-700"><Check size={12} /> Draft saved</span> : status === 'error' ? <span className="text-rose-700">{msg}</span> : 'Up to date'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DeviceToggle device={device} setDevice={setDevice} />
          <Link href={`/admin/themes/${themeId}`} className="btn btn-secondary btn-sm"><Paintbrush size={13} /> Design</Link>
          <button disabled={pending} onClick={() => confirm('Restore this theme’s original homepage sections into the draft?') && start(async () => { await resetThemeDefaults(themeId, 'sections'); window.location.reload(); })} className="btn btn-secondary btn-sm"><RotateCcw size={13} /> Defaults</button>
          {draft && <button disabled={pending} onClick={() => confirm('Discard unpublished changes?') && start(async () => { await discardThemeDraft(themeId); window.location.reload(); })} className="btn btn-secondary btn-sm"><Undo2 size={13} /> Discard</button>}
          <button disabled={pending} onClick={() => start(async () => { if (await flush()) { const r = await publishTheme(themeId); setDraft(false); setStatus('idle'); setMsg(r.message); } })} className="btn btn-primary btn-sm">{pending ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Publish</button>
        </div>
      </div>
      {msg && status !== 'error' && <p className="border-b border-emerald-200 bg-emerald-50 px-4 py-1.5 text-[0.78rem] text-emerald-800">{msg}{themeId !== activeTheme && ' (This theme isn’t live — activate it from Themes.)'}</p>}
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[360px] shrink-0 flex-col border-r border-line bg-[#fbfaf8]">
          {editing === null ? (
            <>
              <div className="border-b border-line px-4 py-3">
                <p className="text-[0.9rem] font-semibold">Homepage sections</p>
                <p className="text-[0.72rem] text-muted">Drag to reorder · changes autosave as a draft</p>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                <button onClick={() => setEditing('announcement')} className="flex w-full items-center gap-2 rounded-lg border border-dashed border-line bg-white px-3 py-2.5 text-left text-[0.8rem]"><Megaphone size={14} className="text-[#a8844a]" /> <span className="flex-1"><span className="block font-medium">Announcement bar</span><span className="text-[0.7rem] text-muted">{settings.announcement.enabled ? `${settings.announcement.messages.length} messages · ${settings.announcement.style}` : 'Hidden'}</span></span><Pencil size={13} className="text-muted" /></button>
                <DndContext id="builder-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-2">
                      {sections.map((s) => (
                        <Row
                          key={s.id}
                          s={s}
                          onEdit={() => setEditing(s.id)}
                          onToggle={() => patchSection(s.id, { enabled: !s.enabled })}
                          onVisibility={() => patchSection(s.id, { visibility: s.visibility === 'all' ? 'desktop' : s.visibility === 'desktop' ? 'mobile' : 'all' })}
                          onDuplicate={() => update((prev) => { const i = prev.findIndex((x) => x.id === s.id); const copy = { ...structuredClone(s), id: `${s.type}-${Date.now().toString(36)}` }; return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)]; })}
                          onDelete={() => confirm(`Remove the ${SECTION_REGISTRY[s.type].label} section?`) && update((prev) => prev.filter((x) => x.id !== s.id))}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
                <button onClick={() => setAdding(true)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#a8844a] bg-white py-2.5 text-[0.82rem] font-medium text-[#8a6a2f] hover:bg-[#fbf6ec]"><Plus size={15} /> Add section</button>
                <button onClick={() => setEditing('footer')} className="flex w-full items-center gap-2 rounded-lg border border-dashed border-line bg-white px-3 py-2.5 text-left text-[0.8rem]"><PanelBottom size={14} className="text-[#a8844a]" /> <span className="flex-1"><span className="block font-medium">Footer</span><span className="text-[0.7rem] text-muted">{settings.footer.variant} layout</span></span><Pencil size={13} className="text-muted" /></button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-line px-3 py-3">
                <button onClick={() => setEditing(null)} className="rounded p-1 hover:bg-secondary" aria-label="Back to sections"><ChevronLeft size={17} /></button>
                <p className="flex-1 text-[0.9rem] font-semibold">{editing === 'announcement' ? 'Announcement bar' : editing === 'footer' ? 'Footer' : def?.label}</p>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {editing === 'announcement' && (
                  <>
                    <label className="flex items-center gap-2 text-[0.84rem]"><input type="checkbox" className="checkbox" checked={settings.announcement.enabled} onChange={(e) => patchSettings((s) => ({ ...s, announcement: { ...s.announcement, enabled: e.target.checked } }))} /> Show announcement bar</label>
                    <div><label className="label">Style</label><select value={settings.announcement.style} onChange={(e) => patchSettings((s) => ({ ...s, announcement: { ...s.announcement, style: e.target.value as 'rotate' } }))} className="field"><option value="rotate">Rotating</option><option value="marquee">Marquee</option><option value="static">Static</option></select></div>
                    <FieldControl field={{ key: 'messages', label: 'Messages', type: 'list', itemLabel: 'Message', fields: [{ key: 'text', label: 'Text', type: 'text' }, { key: 'link', label: 'Link (optional)', type: 'url' }] }} value={settings.announcement.messages} data={data} onChange={(v) => patchSettings((s) => ({ ...s, announcement: { ...s.announcement, messages: v } }))} />
                  </>
                )}
                {editing === 'footer' && (
                  <>
                    <div><label className="label">Layout</label><select value={settings.footer.variant} onChange={(e) => patchSettings((s) => ({ ...s, footer: { ...s.footer, variant: e.target.value as 'soft' } }))} className="field">{['soft', 'minimal', 'boutique', 'noir', 'editorial', 'heritage', 'nordic', 'parisian', 'glamour', 'bento'].map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
                    <div><label className="label">Tagline</label><input value={settings.footer.tagline} onChange={(e) => patchSettings((s) => ({ ...s, footer: { ...s.footer, tagline: e.target.value } }))} className="field" /></div>
                    {(['showNewsletter', 'showSocial', 'showPayments'] as const).map((k) => (
                      <label key={k} className="flex items-center gap-2 text-[0.84rem]"><input type="checkbox" className="checkbox" checked={settings.footer[k]} onChange={(e) => patchSettings((s) => ({ ...s, footer: { ...s.footer, [k]: e.target.checked } }))} /> {k === 'showNewsletter' ? 'Newsletter sign-up' : k === 'showSocial' ? 'Social icons' : 'Payment methods'}</label>
                    ))}
                    <p className="text-[0.75rem] text-muted">Edit footer links in <Link href="/admin/settings" className="underline">Settings → Footer menus</Link>.</p>
                  </>
                )}
                {current && def && (
                  <>
                    <div>
                      <label className="label">Layout variant</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {def.variants.map((v) => (
                          <button key={v.id} onClick={() => patchSection(current.id, { variant: v.id })} className={cn('rounded-lg border px-2.5 py-2 text-left text-[0.75rem]', current.variant === v.id ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink')}>{v.label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-4 text-[0.8rem]">
                      <label className="flex items-center gap-2"><input type="checkbox" className="checkbox" checked={current.enabled} onChange={(e) => patchSection(current.id, { enabled: e.target.checked })} /> Visible</label>
                      <select value={current.visibility} onChange={(e) => patchSection(current.id, { visibility: e.target.value as SectionInstance['visibility'] })} className="field !w-auto !py-1 !text-[0.75rem]"><option value="all">All devices</option><option value="desktop">Desktop only</option><option value="mobile">Mobile only</option></select>
                    </div>
                    <div className="space-y-4 border-t border-line pt-4">
                      {def.fields.map((f) => (
                        <FieldControl key={f.key} field={f} value={current.settings[f.key]} all={current.settings} data={data} onChange={(v) => patchSection(current.id, { settings: { ...current.settings, [f.key]: v } })} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </aside>
        <div className="min-w-0 flex-1">
          <PreviewFrame ref={frame} src={`/?__preview=${themeId}&__mode=draft`} device={device} onReload={reload} openHref={`/?__preview=${themeId}&__mode=draft`} status="Draft preview — publish to make changes live" />
        </div>
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAdding(false)}>
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-[1.6rem]">Add a section</h2>
              <button onClick={() => setAdding(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SECTION_TYPES.map((t) => (
                <button key={t} onClick={() => addSection(t)} className="rounded-lg border border-line p-4 text-left transition hover:border-[#a8844a] hover:bg-[#fbf6ec]">
                  <p className="text-[0.88rem] font-medium">{SECTION_REGISTRY[t].label}</p>
                  <p className="mt-1 text-[0.75rem] text-muted">{SECTION_REGISTRY[t].description}</p>
                  <p className="mt-2 text-[0.68rem] text-[#8a6a2f]">{SECTION_REGISTRY[t].variants.length} layout{SECTION_REGISTRY[t].variants.length > 1 ? 's' : ''}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
