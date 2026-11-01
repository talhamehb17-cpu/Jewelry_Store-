'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="t-2 mt-3">We couldn’t load this page</h1>
      <p className="mt-4 max-w-md text-muted">Please try again in a moment. If the problem continues, our client care team is happy to help.</p>
      {error.digest && <p className="mt-2 font-mono text-[0.75rem] text-muted">Reference: {error.digest}</p>}
      <div className="mt-8 flex gap-3">
        <button onClick={reset} className="btn btn-primary">Try again</button>
        <Link href="/" className="btn btn-secondary">Go home</Link>
      </div>
    </div>
  );
}
