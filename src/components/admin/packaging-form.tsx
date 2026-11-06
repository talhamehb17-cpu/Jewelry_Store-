'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveGiftPackaging } from '@/app/actions/admin/packaging';
import { ImageInput } from './image-input';
import { Card, Field } from './ui';
import type { GiftPackagingSettings } from '@/lib/gift-packaging';

export function PackagingForm({ initial }: { initial: GiftPackagingSettings }) {
  const router = useRouter();
  const [price, setPrice] = useState(String(initial.price / 100));
  const [images, setImages] = useState(initial.images);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();

  const save = () => {
    setErr('');
    setMsg('');
    start(async () => {
      const res = await saveGiftPackaging({
        enabled: true,
        priceRupees: Number(price),
        images: images.map((img, i) => ({ ...img, id: img.id || `img-${i + 1}` })),
      });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setMsg(res.message);
      router.refresh();
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Card title="Offer">
        <p className="text-[0.9rem]">Premium Gift Packaging is offered on every product. It is never added unless the customer chooses it.</p>
        <Field label="Price per piece (PKR)" className="mt-5">
          <input className="field" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <p className="mt-2 text-[0.78rem] text-muted">The starting price is Rs 250. Changing it affects new orders only. Saved orders keep the price from the day they were placed.</p>
      </Card>
      <Card title="Packaging images">
        <div className="space-y-4">
          {images.map((img, i) => (
            <div key={img.id || i} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[1fr_auto]">
              <ImageInput label={`Image ${i + 1}`} value={img.url} folder="packaging" onChange={(url) => setImages((prev) => prev.map((row, n) => (n === i ? { ...row, url } : row)))} />
              <div className="space-y-2">
                <input className="field" value={img.alt} aria-label={`Description for image ${i + 1}`} onChange={(e) => setImages((prev) => prev.map((row, n) => (n === i ? { ...row, alt: e.target.value } : row)))} />
                <button type="button" className="text-[0.78rem] text-sale" onClick={() => setImages((prev) => prev.filter((_, n) => n !== i))}>Remove</button>
              </div>
            </div>
          ))}
          {images.length < 6 && (
            <button type="button" className="btn btn-secondary" onClick={() => setImages((prev) => [...prev, { id: `img-${Date.now()}`, url: '', alt: 'Premium gift packaging' }])}>Add image</button>
          )}
        </div>
      </Card>
      {err && <p className="text-[0.85rem] text-sale" role="alert">{err}</p>}
      {msg && <p className="text-[0.85rem] text-emerald-700">{msg}</p>}
      {initial.audit && <p className="text-[0.75rem] text-muted">Last saved by {initial.audit.by} at {initial.audit.at}</p>}
      <button type="button" className="btn btn-primary" disabled={pending} onClick={save}>{pending ? 'Saving…' : 'Save packaging'}</button>
    </div>
  );
}
