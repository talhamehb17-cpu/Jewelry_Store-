'use client';

import { useEffect, useState } from 'react';

export function ProofViewer({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-2 block text-left">
        <img src={src} alt={alt} className="max-h-72 max-w-full rounded-theme border border-line object-contain" />
      </button>
      <button type="button" onClick={() => setOpen(true)} className="mt-2 text-[0.8rem] underline">View full image</button>
      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label={alt} onClick={() => setOpen(false)}>
          <img src={src} alt={alt} className="max-h-[90vh] max-w-full object-contain" />
        </div>
      )}
    </>
  );
}
