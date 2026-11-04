import { Img } from '@/components/ui/img';
import { viewUrl } from '@/lib/locations';
import type { StoreLocation } from '@/db/schema';

export function LocationsSection({ locations }: { locations: StoreLocation[] }) {
  return (
    <section className="section-y border-t border-line" aria-labelledby="stores-heading">
      <div className="container-x">
        <p className="eyebrow">Showcase</p>
        <h2 id="stores-heading" className="t-2 mt-3">Jewelry cities</h2>
        <p className="mt-3 max-w-2xl text-muted">These cards are sample destinations for the EVERMOON lookbook. They are not retail branches, and they are not a claim that a store exists there. Addresses appear only when an admin saves a verified location.</p>
        {locations.length === 0 ? (
          <div className="mt-8 rounded-theme border border-line bg-surface px-6 py-12 text-center">
            <p className="font-heading text-2xl text-ink">No locations listed yet</p>
            <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-muted">When a location is added in admin, activated and marked for the homepage, it will appear here.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {locations.map((l) => {
              const view = viewUrl(l);
              const showcase = /showcase/i.test(l.address) || /showcase/i.test(l.hours || '');
              return (
                <article key={l.id} className="group flex h-full flex-col overflow-hidden rounded-theme border border-line bg-surface transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_40px_-28px_rgba(0,0,0,.45)] motion-reduce:transform-none">
                  <div className="relative aspect-[4/5] overflow-hidden bg-bg">
                    {l.image ? <Img src={l.image} alt={`${l.city}, ${l.country}`} sizes="(max-width:640px) 100vw, 25vw" className="object-cover transition duration-700 group-hover:scale-105 motion-reduce:transform-none" /> : <div className="grid h-full place-items-center px-4 text-center text-[0.75rem] uppercase tracking-[0.16em] text-muted">Photo not added</div>}
                    {showcase && <span className="absolute left-3 top-3 rounded-full bg-bg/90 px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.14em] text-ink">Sample</span>}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-heading text-2xl text-ink">{l.city}</h3>
                    <p className="mt-1 text-[0.85rem] text-muted">{l.country}</p>
                    <p className="mt-3 text-[0.92rem] leading-relaxed text-ink">{l.name}</p>
                    <p className="mt-2 text-[0.82rem] leading-relaxed text-muted">{l.address}</p>
                    <div className="mt-4">
                      {view ? (
                        <a className="btn btn-secondary btn-sm" href={view} target="_blank" rel="noreferrer">View location</a>
                      ) : (
                        <p className="text-[0.78rem] text-muted">A map link can be added in admin.</p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
