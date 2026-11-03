'use client';

import { useMemo, useState } from 'react';

type Pin = { id: number; name: string; city: string; latitude: number; longitude: number };

function project(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n;
  const rad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  return { x, y };
}

export function LocationMap({ pins }: { pins: Pin[] }) {
  const [active, setActive] = useState(pins[0]?.id ?? 0);
  const view = useMemo(() => {
    const zoom = pins.length === 1 ? 13 : 6;
    const pts = pins.map((p) => ({ ...p, ...project(p.latitude, p.longitude, zoom) }));
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));
    const pad = pins.length === 1 ? 0.8 : 0.6;
    return { zoom, pts, minX: minX - pad, maxX: maxX + pad, minY: minY - pad, maxY: maxY + pad };
  }, [pins]);
  const tiles: { x: number; y: number; left: number; top: number }[] = [];
  const x0 = Math.floor(view.minX);
  const x1 = Math.floor(view.maxX);
  const y0 = Math.floor(view.minY);
  const y1 = Math.floor(view.maxY);
  for (let x = x0; x <= x1 && tiles.length < 24; x++) {
    for (let y = y0; y <= y1 && tiles.length < 24; y++) {
      tiles.push({ x, y, left: ((x - view.minX) / (view.maxX - view.minX)) * 100, top: ((y - view.minY) / (view.maxY - view.minY)) * 100 });
    }
  }
  const spanX = view.maxX - view.minX;
  const spanY = view.maxY - view.minY;
  return (
    <div className="mt-8 overflow-hidden rounded-theme border border-line">
      <div className="relative h-[320px] bg-[#d7e3d4] sm:h-[420px]">
        {tiles.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`${t.x}-${t.y}`} alt="" src={`https://tile.openstreetmap.org/${view.zoom}/${t.x}/${t.y}.png`} className="absolute h-[256px] w-[256px] max-w-none" style={{ left: `${t.left}%`, top: `${t.top}%` }} />
        ))}
        {view.pts.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActive(p.id)}
            className="absolute z-[2] -translate-x-1/2 -translate-y-full"
            style={{ left: `${((p.x - view.minX) / spanX) * 100}%`, top: `${((p.y - view.minY) / spanY) * 100}%` }}
            aria-label={p.name}
          >
            <span className={`block rounded-full border px-2 py-1 text-[0.68rem] ${active === p.id ? 'border-ink bg-ink text-bg' : 'border-line bg-bg text-ink'}`}>{p.city}</span>
          </button>
        ))}
      </div>
      <p className="border-t border-line px-4 py-2 text-[0.72rem] text-muted">Map tiles © OpenStreetMap contributors. Pins use only coordinates entered in admin.</p>
    </div>
  );
}
