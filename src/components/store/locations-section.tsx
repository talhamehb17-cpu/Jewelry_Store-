import { Img } from '@/components/ui/img';
import { directionsUrl, hasCoordinates, viewUrl } from '@/lib/locations';
import type { StoreLocation } from '@/db/schema';
import { LocationMap } from './location-map';

export function LocationsSection({ locations }: { locations: StoreLocation[] }) {
  if (!locations.length) return null;
  const pins = locations.filter(hasCoordinates).map((l) => ({ id: l.id, name: l.name, city: l.city, latitude: l.latitude!, longitude: l.longitude! }));
  return (
    <section className="section-y border-t border-line" aria-labelledby="stores-heading">
      <div className="container-x">
        <p className="eyebrow">Ateliers</p>
        <h2 id="stores-heading" className="t-2 mt-3">Visit EVERMOON</h2>
        <p className="mt-3 max-w-xl text-muted">Only locations saved by the atelier are shown. A pin appears when that location has coordinates. Nothing here is guessed.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {locations.map((l) => {
            const view = viewUrl(l);
            const directions = directionsUrl(l);
            return (
              <article key={l.id} className="flex h-full flex-col overflow-hidden rounded-theme border border-line bg-surface">
                <div className="relative aspect-[16/10] bg-bg">
                  {l.image ? <Img src={l.image} alt={l.name} sizes="(max-width:768px) 100vw, 33vw" /> : <div className="grid h-full place-items-center text-[0.75rem] uppercase tracking-[0.16em] text-muted">Photo not added</div>}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-heading text-2xl">{l.name}</h3>
                  <p className="mt-1 text-[0.85rem] text-muted">{l.city}, {l.country}</p>
                  <p className="mt-3 text-[0.92rem] leading-relaxed">{l.address}</p>
                  {l.phone && <p className="mt-2 text-[0.88rem]"><a href={`tel:${l.phone.replace(/\s/g, '')}`}>{l.phone}</a></p>}
                  {l.hours && <p className="mt-1 text-[0.85rem] text-muted">{l.hours}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {view && <a className="btn btn-secondary btn-sm" href={view} target="_blank" rel="noreferrer">View location</a>}
                    {directions && <a className="btn btn-primary btn-sm" href={directions} target="_blank" rel="noreferrer">Get directions</a>}
                    {!view && !directions && <p className="text-[0.78rem] text-muted">Add a map link or coordinates in admin to enable directions.</p>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {pins.length > 0 && <LocationMap pins={pins} />}
      </div>
    </section>
  );
}
