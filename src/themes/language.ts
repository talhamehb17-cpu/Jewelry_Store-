import { IMG } from '@/lib/images';
import { LOOK, publicImage } from '@/lib/look';
import type { SectionInstance, ThemeId } from './types';

/** Deterministic stills per theme. The About photograph is never in this map. */
const THEME_LOOK: Record<ThemeId, { hero: string; editorial: string; story: string; atelier: string; finale: string; mobile: string }> = {
  'soft-luxury': { hero: LOOK.hero, editorial: IMG.celestine1, story: LOOK.story, atelier: LOOK.atelier, finale: IMG.tennis1, mobile: IMG.celeste1 },
  'modern-minimal': { hero: IMG.amara1, editorial: IMG.noor1, story: IMG.aurelia1, atelier: IMG.zoyaChain, finale: IMG.crescent1, mobile: IMG.amara1 },
  'rose-boutique': { hero: IMG.serenePearl, editorial: IMG.celeste1, story: IMG.celestine2, atelier: IMG.amara2, finale: IMG.heirloomPearl, mobile: IMG.celeste1 },
  'dark-luxury': { hero: LOOK.editorial, editorial: IMG.aurora, story: IMG.zoyaChain, atelier: LOOK.atelier, finale: IMG.soleil1, mobile: IMG.elara1 },
  editorial: { hero: LOOK.worn, editorial: LOOK.editorial, story: IMG.elara1, atelier: IMG.isabella1, finale: IMG.aurelia2, mobile: LOOK.worn },
  'old-money': { hero: LOOK.hero, editorial: IMG.elara1, story: IMG.aurelia2, atelier: LOOK.atelier, finale: IMG.noor1, mobile: IMG.elara1 },
  scandinavian: { hero: IMG.amara2, editorial: IMG.crescent1, story: LOOK.story, atelier: IMG.noor1, finale: IMG.tennis1, mobile: IMG.amara1 },
  parisian: { hero: IMG.celestine1, editorial: IMG.isabella1, story: IMG.celeste1, atelier: IMG.amara1, finale: IMG.serenePearl, mobile: IMG.celestine1 },
  'golden-glamour': { hero: IMG.soleil1, editorial: LOOK.editorial, story: IMG.raniaBridal, atelier: LOOK.atelier, finale: IMG.aurora, mobile: IMG.soleil1 },
  contemporary: { hero: LOOK.worn, editorial: IMG.crescent2, story: IMG.noor1, atelier: IMG.zoyaChain, finale: IMG.tennis1, mobile: IMG.amara1 },
};

export function themeLook(id: ThemeId) {
  return THEME_LOOK[id];
}

/** Rewrites homepage stills for the active theme without touching product photography in category tiles. */
export function applyThemeImagery(themeId: ThemeId, sections: SectionInstance[]): SectionInstance[] {
  const look = THEME_LOOK[themeId];
  return sections.map((s) => {
    const settings = { ...s.settings };
    if (s.type === 'hero' && Array.isArray(settings.slides)) {
      settings.slides = (settings.slides as Record<string, unknown>[]).map((slide, i) =>
        i === 0 ? { ...slide, image: publicImage(look.hero), mobileImage: publicImage(look.mobile) } : slide,
      );
    } else if (s.type === 'image-text') {
      settings.image = publicImage(s.variant === 'studio' ? look.story : look.editorial);
    } else if (s.type === 'brand-story') {
      settings.image = publicImage(look.story);
    } else if (s.type === 'image-banner' && s.variant === 'locations') {
      settings.image = publicImage(look.atelier);
    } else if (s.type === 'image-banner' && (s.variant === 'finale' || s.variant === 'fullwidth')) {
      settings.image = publicImage(look.finale);
    }
    return { ...s, settings };
  });
}
