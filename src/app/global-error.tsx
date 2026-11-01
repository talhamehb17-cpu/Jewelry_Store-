'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#FBF7F1', color: '#2B2622', fontFamily: 'Georgia, serif', textAlign: 'center' }}>
        <div style={{ padding: 24 }}>
          <h1 style={{ fontWeight: 400 }}>Something went wrong</h1>
          <p style={{ fontFamily: 'system-ui, sans-serif', color: '#8A7F74' }}>Please refresh the page or try again shortly.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: '12px 24px', background: '#2B2622', color: '#FBF7F1', border: 0, cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
