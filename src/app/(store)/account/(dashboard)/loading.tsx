export default function AccountLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-32 rounded-theme" />)}</div>
      <div className="skeleton h-64 rounded-theme" />
    </div>
  );
}
