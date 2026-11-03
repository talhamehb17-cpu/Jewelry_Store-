export default function StoreLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="min-h-[40vh]">
      <div className="h-0.5 w-full overflow-hidden bg-line">
        <div className="h-full w-1/3 animate-pulse bg-accent" />
      </div>
      <div className="container-x grid gap-6 py-10 md:grid-cols-2">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton aspect-[4/5] max-h-[52svh] w-full md:col-start-2" />
        <div className="space-y-3 md:col-start-1 md:row-start-1 md:self-end">
          <div className="skeleton h-12 w-4/5" />
          <div className="skeleton h-4 w-3/5" />
          <div className="skeleton h-11 w-40" />
        </div>
      </div>
    </div>
  );
}
