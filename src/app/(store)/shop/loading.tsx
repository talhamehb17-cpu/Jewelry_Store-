export default function Loading() {
  return (
    <div className="container-x py-12" aria-busy="true" aria-label="Loading">
      <div className="skeleton mx-auto h-8 w-64 rounded" />
      <div className="skeleton mx-auto mt-4 h-4 w-96 max-w-full rounded" />
      <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[4/5] rounded-theme-sm" />
            <div className="skeleton mx-auto mt-4 h-4 w-3/4 rounded" />
            <div className="skeleton mx-auto mt-2 h-3 w-1/3 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
