import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#FBF7F1', color: '#2B2622', fontFamily: 'Georgia, serif', textAlign: 'center', padding: 24 }}>
      <div>
        <p style={{ fontSize: 96, margin: 0, color: '#D8C3A0' }}>404</p>
        <h1 style={{ fontWeight: 400, fontSize: 32, margin: '0 0 12px' }}>Page not found</h1>
        <p style={{ fontFamily: 'system-ui, sans-serif', color: '#8A7F74' }}>The page you are looking for does not exist.</p>
        <Link href="/" style={{ display: 'inline-block', marginTop: 24, padding: '12px 24px', background: '#2B2622', color: '#FBF7F1', textDecoration: 'none', fontFamily: 'system-ui, sans-serif', fontSize: 13, letterSpacing: 2 }}>
          RETURN HOME
        </Link>
      </div>
    </div>
  );
}
