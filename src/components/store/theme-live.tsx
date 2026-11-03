'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ThemeId } from '@/themes/types';

export type LookSet = { hero: string; editorial: string; story: string; atelier: string; finale: string; mobile: string };

type Live = {
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  look: LookSet | null;
};

const Ctx = createContext<Live | null>(null);

export function ThemeLiveProvider({
  initialId,
  looks,
  children,
}: {
  initialId: ThemeId;
  looks: Record<string, LookSet>;
  children: React.ReactNode;
}) {
  const [themeId, setThemeId] = useState(initialId);
  useEffect(() => setThemeId(initialId), [initialId]);
  return <Ctx.Provider value={{ themeId, setThemeId, look: looks[themeId] ?? null }}>{children}</Ctx.Provider>;
}

export function useThemeLive() {
  return useContext(Ctx);
}
