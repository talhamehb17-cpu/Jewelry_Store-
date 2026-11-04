import { Img } from '@/components/ui/img';
import { directionsUrl, pinFor, viewUrl } from '@/lib/locations';
import type { StoreLocation } from '@/db/schema';
import { LocationMap } from './location-map';

export function LocationsSection({ locations }: { locations: StoreLocation[] }) {
  const pins = locations.flatMap((l) => {
    const pin = pinFor(l);
    return pin ? [{ id: l.id, name: l.name, city: l.city, latitude: pin.latitude, longitude: pin.longitude }] : [];
  });
  return (
    <section className="section-y border-t border-line" aria-labelledby="stores-heading">
      <div className="container-x">
        <p className="eyebrow">Ateliers</p>
        <h2 id="stores-heading" className="t-2 mt-3">Visit EVERMOON</h2>
        <p className="mt-3 max-w-xl text-muted">Only locations saved in the atelier admin are shown. A map pin appears only when that location has coordinates or a map link that already contains them.</p>
        {locations.length === 0 ? (
          <div className="mt-8 rounded-theme border border-line bg-surface px-6 py-12 text-center">
            <p className="font-heading text-2xl text-ink">No stores listed yet</p>
            <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-muted">When a location is added, activated and marked for the homepage, it will appear here with its photo, address, hours and directions. This page does not invent addresses.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {locations.map((l) => {
              const view = viewUrl(l);
              const directions = directionsUrl(l);
              return (
                <article key={l.id} className="flex h-full flex-col overflow-hidden rounded-theme border border-line bg-surface">
                  <div className="relative aspect-[16/10] bg-bg">
                    {l.image ? <Img src={l.image} alt={l.name} sizes="(max-width:768px) 100vw, 33vw" /> : <div className="grid h-full place-items-center px-4 text-center text-[0.75rem] uppercase tracking-[0.16em] text-muted">Photo not added</div>}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-heading text-2xl text-ink">{l.name}</h3>
                    <p className="mt-1 text-[0.85rem] text-muted">{l.city}, {l.country}</p>
                    <p className="mt-3 text-[0.92rem] leading-relaxed text-ink">{l.address}</p>
                    {l.phone && <p className="mt-2 text-[0.88rem]"><a href={`tel:${l.phone.replace(/\s/g, '')}`}>{l.phone}</a></p>}
                    {l.hours && <p className="mt-1 text-[0.85rem] text-muted">{l.hours}</p>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <details className="min-w-0 flex-1 basis-[8rem]">
                        <summary className="btn btn-secondary btn-sm cursor-pointer list-none">View details</summary>
                        <div className="mt-3 space-y-1 text-[0.85rem] leading-relaxed text-ink">
                          <p><span className="text-muted">Store · </span>{l.name}</p>
                          <p><span className="text-muted">City · </span>{l.city}, {l.country}</p>
                          <p><span className="text-muted">Address · </span>{l.address}</p>
                          <p><span className="text-muted">Phone · </span>{l.phone || 'Not added'}</p>
                          <p><span className="text-muted">Hours · </span>{l.hours || 'Not added'}</p>
                          <p><span className="text-muted">Map · </span>{view ? 'Link saved' : 'No map link or coordinates yet'}</p>
                        </div>
                      </details>
                      {directions ? (
                        <a className="btn btn-primary btn-sm" href={directions} target="_blank" rel="noreferrer">Get directions</a>
                      ) : (
                        <p className="self-center text-[0.78rem] text-muted">Directions appear after a map link or coordinates are saved.</p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {pins.length > 0 && <LocationMap pins={pins} />}
      </div>
    </section>
  );
}
