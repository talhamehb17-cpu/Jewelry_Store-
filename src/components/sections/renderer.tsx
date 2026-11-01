import { HeroSection } from './hero';
import { CategoriesSection, CompleteTheLookSection, FeaturedCollectionsSection, ProductGridSection } from './catalog-sections';
import {
  BrandStorySection,
  FaqSection,
  ImageBannerSection,
  ImageTextSection,
  InstagramSection,
  NewsletterSection,
  RichTextSection,
  TestimonialsSection,
  TrustBadgesSection,
  VideoSection,
} from './content-sections';
import { cn } from '@/lib/utils';
import type { SectionInstance, SectionType, ThemeConfig } from '@/themes/types';

type Comp = (p: { section: SectionInstance; config: ThemeConfig }) => React.ReactNode | Promise<React.ReactNode>;

const MAP: Record<SectionType, Comp> = {
  hero: HeroSection,
  categories: CategoriesSection,
  'featured-collections': FeaturedCollectionsSection,
  'product-grid': ProductGridSection,
  'brand-story': BrandStorySection,
  'image-banner': ImageBannerSection,
  'image-text': ImageTextSection,
  'complete-the-look': CompleteTheLookSection,
  testimonials: TestimonialsSection,
  instagram: InstagramSection,
  newsletter: NewsletterSection,
  'rich-text': RichTextSection,
  video: VideoSection,
  faq: FaqSection,
  'trust-badges': TrustBadgesSection,
};

export function SectionRenderer({ sections, config }: { sections: SectionInstance[]; config: ThemeConfig }) {
  return (
    <>
      {sections
        .filter((s) => s.enabled)
        .map((s) => {
          const C = MAP[s.type];
          if (!C) return null;
          return (
            <div key={s.id} data-section={s.type} data-section-id={s.id} className={cn(s.visibility === 'desktop' && 'max-md:hidden', s.visibility === 'mobile' && 'md:hidden')}>
              <C section={s} config={config} />
            </div>
          );
        })}
    </>
  );
}
