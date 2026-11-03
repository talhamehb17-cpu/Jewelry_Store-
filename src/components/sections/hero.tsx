import Link from 'next/link';
import Image from 'next/image';
import { Img } from '@/components/ui/img';
import { FadeSlider } from './slider';
import { BRAND } from '@/lib/brand';
import { LOOK, publicImage } from '@/lib/look';
import { cn } from '@/lib/utils';
import type { SectionInstance, ThemeConfig } from '@/themes/types';

type Slide = {
  image?: string;
  mobileImage?: string;
  video?: string;
  image2?: string;
  image3?: string;
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  primaryLabel?: string;
  primaryLink?: string;
  secondaryLabel?: string;
  secondaryLink?: string;
  align?: 'left' | 'center' | 'right';
  textColor?: 'light' | 'dark';
  overlay?: number;
};

const HEIGHT = { medium: '62vh', large: '86vh', full: '100svh' } as const;
const MOBILE_H = { auto: 'auto', '60': '60svh', '75': '75svh', '90': '90svh', '100': '100svh' } as const;

function Media({ s, priority, sizes = '100vw', className, slot }: { s: Slide; priority?: boolean; sizes?: string; className?: string; slot?: 'hero' | 'mobile' }) {
  return (
    <>
      {s.video ? (
        <video className={cn('absolute inset-0 h-full w-full object-cover', className)} src={s.video} poster={s.image} autoPlay muted loop playsInline preload="metadata" aria-hidden />
      ) : (
        <>
          <Img slot={slot} src={publicImage(s.image, LOOK.hero)} alt={s.heading ?? ''} priority={priority} sizes={sizes} className={cn('slide-img', s.mobileImage && 'max-md:hidden', className)} />
          {s.mobileImage && <Img slot={slot ? 'mobile' : undefined} src={publicImage(s.mobileImage, LOOK.hero)} alt="" priority={priority} sizes="100vw" className={cn('slide-img md:hidden', className)} />}
        </>
      )}
    </>
  );
}

function Ctas({ s, light, className }: { s: Slide; light: boolean; className?: string }) {
  if (!s.primaryLabel && !s.secondaryLabel) return null;
  return (
    <div className={cn('mt-9 flex flex-wrap gap-3', className)}>
      {s.primaryLabel && s.primaryLink && (
        <Link href={s.primaryLink} className={cn('btn', light ? 'btn-light' : 'btn-primary')}>{s.primaryLabel}</Link>
      )}
      {s.secondaryLabel && s.secondaryLink && (
        <Link href={s.secondaryLink} className={cn('btn', light ? 'btn-outline-light' : 'btn-secondary')}>{s.secondaryLabel}</Link>
      )}
    </div>
  );
}

function Copy({ s, light, size = 'display', className }: { s: Slide; light: boolean; size?: 'display' | '1'; className?: string }) {
  const align = s.align ?? 'left';
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', align === 'right' && 'ml-auto text-right', light ? 'text-white' : 'text-ink', className)}>
      {s.eyebrow && <p className={cn('eyebrow slide-up mb-5', light && '!text-white/85')}>{s.eyebrow}</p>}
      {s.heading && <h1 className={cn('slide-up text-balance [animation-delay:120ms]', size === 'display' ? 't-display' : 't-1')}>{s.heading}</h1>}
      {s.subheading && <p className={cn('slide-up mt-6 max-w-lg text-[1.02rem] leading-relaxed [animation-delay:240ms]', align === 'center' && 'mx-auto', align === 'right' && 'ml-auto', light ? 'text-white/85' : 'text-muted')}>{s.subheading}</p>}
      <Ctas s={s} light={light} className={cn('slide-up [animation-delay:360ms]', align === 'center' && 'justify-center', align === 'right' && 'justify-end')} />
    </div>
  );
}

export function HeroSection({ section, config }: { section: SectionInstance; config: ThemeConfig }) {
  const st = section.settings;
  const slides: Slide[] = Array.isArray(st.slides) && st.slides.length ? st.slides : [{}];
  const h = HEIGHT[(st.height as keyof typeof HEIGHT) ?? 'large'] ?? HEIGHT.large;
  const mh = MOBILE_H[config.settings.mobile.heroHeight] ?? '75svh';
  const vars = { ['--hero-h' as string]: h, ['--hero-h-m' as string]: mh } as React.CSSProperties;
  const hClass = 'relative overflow-hidden h-[min(var(--hero-h-m),85svh)] md:h-[var(--hero-h)] max-md:min-h-[26rem]';
  const first = slides[0]!;
  const light = (first.textColor ?? 'light') === 'light';

  switch (section.variant) {
    case 'campaign':
      return (
        <section className="overflow-hidden border-b border-line bg-bg" style={vars}>
          <div className="container-x grid items-center gap-8 py-8 md:min-h-[min(var(--hero-h),820px)] md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] md:gap-12 md:py-12">
            <div className="order-2 min-w-0 md:order-1 md:py-6">
              <Image src={BRAND.logo} alt="" width={64} height={64} className="mb-5 h-14 w-14 object-contain md:h-16 md:w-16" />
              <Copy s={{ ...first, textColor: 'dark' }} light={false} />
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[0.68rem] uppercase tracking-[0.16em] text-muted">
                <li>18k gold vermeil</li>
                <li>Freshwater pearls</li>
                <li>Cash on delivery</li>
              </ul>
            </div>
            <div className="order-1 min-w-0 md:order-2">
              <div className="relative mx-auto aspect-[4/5] max-h-[58svh] w-full overflow-hidden bg-surface md:aspect-[5/4] md:max-h-[72vh]">
                <Img src={publicImage(first.image, LOOK.hero)} alt="Gold necklace and pearl earrings in window light" priority sizes="(max-width:768px) 100vw, 54vw" className="hero-drift !object-cover !object-[center_40%]" />
              </div>
            </div>
          </div>
        </section>
      );

    case 'split':
      return (
        <section className="grid border-b border-line md:min-h-[var(--hero-h)] md:grid-cols-2" style={vars}>
          <div className="relative order-1 aspect-[4/5] max-h-[68svh] overflow-hidden bg-surface md:order-2 md:aspect-auto md:max-h-none">
            <Media s={first} priority sizes="(max-width:768px) 100vw, 50vw" slot="hero" />
          </div>
          <div className="order-2 flex items-center px-[var(--pad-x)] py-14 md:order-1 md:px-[max(var(--pad-x),5vw)]">
            <div className="max-w-xl">
              {first.eyebrow && <p className="mb-6 text-[0.8rem] text-muted">{first.eyebrow}</p>}
              <h1 className="t-display slide-up text-balance">{first.heading}</h1>
              {first.subheading && <p className="mt-6 max-w-md text-[1.05rem] text-muted">{first.subheading}</p>}
              <Ctas s={first} light={false} />
            </div>
          </div>
        </section>
      );

    case 'arch':
      return (
        <section className="relative overflow-hidden bg-surface" style={vars}>
          <div className="container-x grid items-center gap-10 py-14 md:min-h-[var(--hero-h)] md:grid-cols-[1.05fr_1fr] md:py-20">
            <div className="order-2 md:order-1">
              {first.eyebrow && <p className="eyebrow mb-5 !text-primary">{first.eyebrow}</p>}
              <h1 className="t-display slide-up text-balance">
                {(first.heading ?? '').split(' ').map((w, i, a) => (
                  <span key={i} className={i === a.length - 1 ? 'accent-italic text-primary' : ''}>{w}{i < a.length - 1 ? ' ' : ''}</span>
                ))}
              </h1>
              {first.subheading && <p className="mt-6 max-w-md text-[1.02rem] text-muted">{first.subheading}</p>}
              <Ctas s={first} light={false} />
            </div>
            <div className="relative order-1 mx-auto w-full max-w-[520px] md:order-2">
              <div className="absolute -left-6 top-10 hidden h-28 w-28 rounded-full border border-primary/30 md:block" />
              <div className="absolute -bottom-6 -right-4 h-40 w-40 rounded-full bg-secondary/70 blur-2xl" />
              <div className="arch relative aspect-[4/5] overflow-hidden bg-bg shadow-[0_40px_80px_-50px_rgba(120,60,70,.55)]">
                <Media s={first} priority sizes="(max-width:768px) 90vw, 520px" slot="hero" />
              </div>
            </div>
          </div>
        </section>
      );

    case 'cinematic':
      return (
        <section className={cn(hClass, 'bg-black')} style={vars}>
          <FadeSlider autoplay={st.autoplay !== false} interval={st.interval} dots="lines" arrows={false}>
            {slides.map((s, k) => (
              <div key={k} className="relative h-full w-full">
                <Media s={s} priority={k === 0} slot={k === 0 ? "hero" : undefined} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40" style={{ opacity: Math.min(1, ((s.overlay ?? 45) + 30) / 100) }} />
                <div className="container-x relative flex h-full items-end pb-24 md:pb-28">
                  <div className="max-w-4xl text-white">
                    {s.eyebrow && <p className="slide-up mb-6 flex items-center gap-4 text-[0.72rem] uppercase tracking-[0.4em] text-accent"><span className="h-px w-12 bg-accent" />{s.eyebrow}</p>}
                    <h1 className="t-display slide-up text-balance [animation-delay:150ms]">{s.heading}</h1>
                    {s.subheading && <p className="slide-up mt-6 max-w-lg text-white/75 [animation-delay:300ms]">{s.subheading}</p>}
                    <Ctas s={s} light className="slide-up [animation-delay:450ms] [&_.btn-light]:!border-accent [&_.btn-light]:!bg-accent [&_.btn-light]:!text-black" />
                  </div>
                </div>
              </div>
            ))}
          </FadeSlider>
          <div className="pointer-events-none absolute bottom-8 right-[var(--pad-x)] z-[3] hidden flex-col items-center gap-3 text-[0.62rem] uppercase tracking-[0.4em] text-white/60 md:flex">
            <span className="[writing-mode:vertical-rl]">Scroll</span>
            <span className="h-14 w-px bg-white/40" />
          </div>
        </section>
      );

    case 'editorial':
      return (
        <section className="relative overflow-hidden" style={vars}>
          <div className="container-x grid gap-4 py-10 md:grid-cols-12 md:gap-6 md:py-14">
            <div className="relative aspect-[3/4] overflow-hidden bg-surface md:col-span-6 md:row-span-2 md:aspect-auto md:min-h-[78vh]">
              <Media s={first} priority sizes="(max-width:768px) 100vw, 50vw" slot="hero" />
            </div>
            <div className="flex flex-col justify-between md:col-span-6">
              <div className="flex items-start justify-between border-b border-ink pb-3 text-[0.7rem] uppercase tracking-[0.24em]">
                <span>{first.eyebrow}</span>
                <span>Vol. 12 — {new Date().getFullYear()}</span>
              </div>
              <h1 className="t-display slide-up mt-8 text-balance" style={{ fontSize: 'calc(clamp(2.4rem, 5.4vw, 5.6rem) * var(--h-scale))' }}>
                <span className="accent-italic">{(first.heading ?? '').split(' ').slice(0, 2).join(' ')}</span> {(first.heading ?? '').split(' ').slice(2).join(' ')}
              </h1>
              <div className="mt-6 grid grid-cols-2 gap-4 md:gap-6">
                <div className="relative aspect-[4/5] overflow-hidden bg-surface"><Img src={publicImage(first.image2, LOOK.editorial)} alt="" sizes="25vw" /></div>
                <div className="flex flex-col justify-end">
                  <div className="relative mb-6 aspect-square overflow-hidden bg-surface"><Img src={publicImage(first.image3, LOOK.story)} alt="" sizes="25vw" /></div>
                  <p className="text-[0.95rem] leading-relaxed text-muted">{first.subheading}</p>
                  {first.primaryLink && <Link href={first.primaryLink} className="link-line mt-4 self-start text-[0.75rem] uppercase tracking-[0.2em]">{first.primaryLabel} →</Link>}
                </div>
              </div>
            </div>
          </div>
        </section>
      );

    case 'classic':
      return (
        <section className="container-x pt-8 md:pt-12" style={vars}>
          <div className="relative overflow-hidden border border-line p-2 md:p-3">
            <div className="relative aspect-[4/5] overflow-hidden bg-surface md:aspect-[21/9]">
              <Media s={first} priority slot="hero" />
              <div className="absolute inset-4 border border-white/60 md:inset-6" />
            </div>
          </div>
          <div className="mx-auto max-w-3xl py-14 text-center md:py-20">
            {first.eyebrow && <p className="eyebrow mb-4">{first.eyebrow}</p>}
            <h1 className="t-1 slide-up text-balance">{first.heading}</h1>
            <div className="mx-auto my-7 flex w-40 items-center gap-3 text-accent"><span className="h-px flex-1 bg-current" />✦<span className="h-px flex-1 bg-current" /></div>
            {first.subheading && <p className="accent-italic mx-auto max-w-xl text-[1.25rem] text-muted">{first.subheading}</p>}
            <Ctas s={first} light={false} className="justify-center" />
          </div>
        </section>
      );

    case 'minimal':
      return (
        <section className="container-x grid items-end gap-10 py-12 md:grid-cols-[1fr_1.5fr] md:py-20" style={vars}>
          <div className="pb-4 md:pb-16">
            {first.eyebrow && <p className="mb-5 text-[0.82rem] text-muted">{first.eyebrow}</p>}
            <h1 className="t-1 slide-up text-balance font-light">{first.heading}</h1>
            {first.subheading && <p className="mt-6 max-w-sm text-muted">{first.subheading}</p>}
            {first.primaryLink && (
              <Link href={first.primaryLink} className="btn btn-primary mt-10">{first.primaryLabel}</Link>
            )}
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-theme bg-surface md:aspect-[5/4]">
            <Media s={first} priority sizes="(max-width:768px) 100vw, 60vw" slot="hero" />
          </div>
        </section>
      );

    case 'romantic':
      return (
        <section className={hClass} style={vars}>
          <FadeSlider autoplay={st.autoplay !== false} interval={st.interval} dots="center" arrows={false}>
            {slides.map((s, k) => (
              <div key={k} className="relative h-full w-full">
                <Media s={s} priority={k === 0} slot={k === 0 ? "hero" : undefined} />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,.05),rgba(0,0,0,.45))]" style={{ opacity: Math.max(0.4, (s.overlay ?? 30) / 50) }} />
                <div className="container-x relative flex h-full items-center justify-center text-center text-white">
                  <div className="max-w-3xl">
                    {s.eyebrow && <p className="nav-link slide-up mb-6 !text-white/85">{s.eyebrow}</p>}
                    <h1 className="t-display accent-italic slide-up text-balance [animation-delay:150ms]">{s.heading}</h1>
                    {s.subheading && <p className="slide-up mx-auto mt-6 max-w-md text-white/85 [animation-delay:300ms]">{s.subheading}</p>}
                    {s.primaryLink && <Link href={s.primaryLink} className="btn btn-outline-light slide-up mt-10 [animation-delay:450ms]">{s.primaryLabel}</Link>}
                  </div>
                </div>
              </div>
            ))}
          </FadeSlider>
        </section>
      );

    case 'luxe':
      return (
        <section className={hClass} style={vars}>
          <FadeSlider autoplay={st.autoplay !== false} interval={st.interval} dots="center">
            {slides.map((s, k) => (
              <div key={k} className="relative h-full w-full">
                <Media s={s} priority={k === 0} slot={k === 0 ? "hero" : undefined} />
                <div className="absolute inset-0 bg-black" style={{ opacity: (s.overlay ?? 30) / 100 }} />
                <div className="container-x relative flex h-full items-center">
                  <div className={cn('relative max-w-xl border border-accent/70 bg-black/25 p-8 text-white backdrop-blur-[3px] md:p-12', s.align === 'center' && 'mx-auto text-center', s.align === 'right' && 'ml-auto')}>
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-transparent px-3 text-accent">✦</span>
                    {s.eyebrow && <p className="slide-up mb-4 text-[0.72rem] uppercase tracking-[0.3em] text-accent">{s.eyebrow}</p>}
                    <h1 className="t-1 slide-up text-balance [animation-delay:150ms]">{s.heading}</h1>
                    {s.subheading && <p className="slide-up mt-5 text-white/80 [animation-delay:300ms]">{s.subheading}</p>}
                    <Ctas s={s} light className={cn('slide-up [animation-delay:450ms] [&_.btn-light]:!border-accent [&_.btn-light]:!bg-accent [&_.btn-light]:!text-white', s.align === 'center' && 'justify-center')} />
                  </div>
                </div>
              </div>
            ))}
          </FadeSlider>
        </section>
      );

    case 'mosaic':
      return (
        <section className="container-x pb-6 pt-6 md:pt-10" style={vars}>
          <div className="grid gap-3 md:h-[min(86vh,820px)] md:grid-cols-4 md:grid-rows-2">
            <div className="flex flex-col justify-between rounded-theme bg-surface p-7 md:col-span-2 md:p-10">
              <p className="text-[0.8rem] text-muted">{first.eyebrow ?? 'Collection 2026'}</p>
              <div>
                <h1 className="font-heading slide-up text-balance leading-[0.98]" style={{ fontSize: 'calc(clamp(2.3rem, 3.7vw, 3.9rem) * var(--h-scale))', fontWeight: 'var(--h-weight)', letterSpacing: 'var(--h-tracking)' }}>{first.heading}</h1>
                {first.subheading && <p className="mt-4 max-w-md text-muted">{first.subheading}</p>}
                <Ctas s={first} light={false} className="!mt-6" />
              </div>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-theme bg-surface md:col-span-2 md:row-span-2 md:aspect-auto">
              <Media s={first} priority sizes="(max-width:768px) 100vw, 50vw" slot="hero" />
              <span className="absolute bottom-4 left-4 rounded-full bg-bg/90 px-4 py-2 text-[0.78rem] backdrop-blur">New season ↗</span>
            </div>
            <div className="relative hidden overflow-hidden rounded-theme bg-surface md:block"><Img src={publicImage(first.image2, LOOK.editorial)} alt="" sizes="25vw" /></div>
            <div className="relative hidden overflow-hidden rounded-theme bg-accent md:block">
              <Img src={publicImage(first.image3, LOOK.story)} alt="" sizes="25vw" className="mix-blend-multiply" />
            </div>
          </div>
        </section>
      );

    case 'fullbleed':
    default:
      return (
        <section className={hClass} style={vars}>
          <FadeSlider autoplay={st.autoplay !== false} interval={st.interval} dots="center" light={light}>
            {slides.map((s, k) => {
              const l = (s.textColor ?? 'light') === 'light';
              return (
                <div key={k} className="relative h-full w-full">
                  <Media s={s} priority={k === 0} slot={k === 0 ? "hero" : undefined} />
                  <div className="absolute inset-0 bg-black" style={{ opacity: (s.overlay ?? 25) / 100 }} />
                  <div className={cn('absolute inset-0', l ? 'bg-gradient-to-r from-black/30 via-transparent to-transparent' : '')} />
                  <div className="container-x relative flex h-full items-center">
                    <Copy s={s} light={l} className="w-full" />
                  </div>
                </div>
              );
            })}
          </FadeSlider>
        </section>
      );
  }
}
