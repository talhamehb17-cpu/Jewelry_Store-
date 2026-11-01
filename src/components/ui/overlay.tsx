'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBodyLock } from '@/components/store/providers';

/** Accessible slide-over drawer (Escape to close, focus moved inside, scroll locked). */
export function Drawer({
  open,
  onClose,
  side = 'right',
  title,
  children,
  className,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  side?: 'right' | 'left' | 'bottom';
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useBodyLock(open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => panel.current?.focus(), 50);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);
  const pos = {
    right: 'right-0 top-0 h-full w-full max-w-[440px] translate-x-full',
    left: 'left-0 top-0 h-full w-full max-w-[400px] -translate-x-full',
    bottom: 'bottom-0 left-0 max-h-[88vh] w-full translate-y-full rounded-t-2xl',
  }[side];
  return (
    <div className={cn('fixed inset-0 z-[70]', open ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!open}>
      <div className={cn('absolute inset-0 bg-black/35 backdrop-blur-[2px] transition-opacity duration-500', open ? 'opacity-100' : 'opacity-0')} onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          'absolute flex flex-col bg-bg text-ink shadow-2xl outline-none transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)]',
          pos,
          open && '!translate-x-0 !translate-y-0',
          className,
        )}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between border-b border-line px-6 py-5">
            <div className="font-heading text-xl">{title}</div>
            <button onClick={onClose} className="-mr-2 p-2 text-muted transition hover:text-ink" aria-label="Close">
              <X size={20} strokeWidth={1.25} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="border-t border-line">{footer}</div>}
      </div>
    </div>
  );
}

export function Modal({ open, onClose, children, className, label }: { open: boolean; onClose: () => void; children: React.ReactNode; className?: string; label?: string }) {
  useBodyLock(open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={label}>
      <div className="fade-in absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cn('slide-up relative max-h-[92vh] w-full overflow-y-auto bg-bg text-ink shadow-2xl sm:max-w-4xl sm:rounded-theme', className)}>
        <button onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full bg-bg/80 p-2 text-muted backdrop-blur transition hover:text-ink" aria-label="Close">
          <X size={18} strokeWidth={1.25} />
        </button>
        {children}
      </div>
    </div>
  );
}
