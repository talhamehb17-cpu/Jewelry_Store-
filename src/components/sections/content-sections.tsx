import Link from 'next/link';
import { Truck, Gift, ShieldCheck, RefreshCcw, Gem, Sparkles, Lock, Phone, Quote, Plus } from 'lucide-react';
import { Img } from '@/components/ui/img';
import { Instagram } from '@/components/ui/brand-icons';
import { SectionHeading, Stars } from '@/components/ui/bits';
import { NewsletterForm } from '@/components/store/newsletter-form';
import { TextSlider, VideoPlayer } from './text-slider';
import { cn } from '@/lib/utils';
import type { SectionInstance, ThemeConfig } from '@/themes/types';

type Props = { section: SectionInstance; config: ThemeConfig };

function Cta({ label, link, className, light }: { label?: string; link?: string; className?: string; light?: boolean }) {
  if (!label || !link) return null;
  return <Link href={link} className={cn('btn', light ? 'btn-light' : 'btn-primary', className)}>{label}</Link>;
}

export function BrandStorySection({ section }: Props) {
  const st = section.settings;
  const stats: { value: string; label: string }[] = Array.isArray(st.stats) ? st.stats : [];
  switch (section.variant) {
    case 'centered':
      return (
        <section className="section-y relative overflow-hidden">
          <div className="container-x">
            <div className="reveal mx-auto max-w-3xl text-center">
              {st.eyebrow && <p className="eyebrow mb-5 !text-accent">{st.eyebrow}</p>}
              <h2 className="t-1 text-balance">{st.heading}</h2>
              <div className="hairline-gold mx-auto my-8 w-48" />
              <p className="mx-auto max-w-2xl text-[1.05rem] leading-[1.9] text-muted">{st.body}</p>
              {st.signature && <p className="accent-italic mt-6 text-xl text-accent">{st.signature}</p>}
              <Cta label={st.ctaLabel} link={st.ctaLink} className="mt-10" />
            </div>
            {st.image && (
              <div className="reveal relative mx-auto mt-16 aspect-[21/9] max-w-5xl overflow-hidden">
                <Img src={st.image} alt="" sizes="(max-width:1024px) 100vw, 1000px" />
              </div>
            )}
          </div>
        </section>
      );
    case 'heritage':
      return (
        <section className="section-y container-x">
          <div className="grid items-center gap-12 md:grid-cols-[1fr_1.1fr] md:gap-20">
            <div className="reveal frame-inset relative aspect-[4/5] overflow-hidden bg-surface">
              <Img src={st.image} alt="" sizes="(max-width:768px) 100vw, 45vw" />
            </div>
            <div className="reveal">
              <p className="font-heading text-[clamp(4rem,9vw,8rem)] leading-none text-accent/30">2019</p>
              {st.eyebrow && <p className="eyebrow -mt-3 mb-4">{st.eyebrow}</p>}
              <h2 className="t-1">{st.heading}</h2>
              <p className="mt-6 text-[1.02rem] leading-[1.9] text-muted">{st.body}</p>
              {st.signature && <p className="accent-italic mt-8 border-t border-line pt-6 text-xl">{st.signature}</p>}
              <Cta label={st.ctaLabel} link={st.ctaLink} className="mt-8" />
            </div>
          </div>
        </section>
      );
    case 'split':
    default:
      return (
        <section className="section-y container-x">
          <div className="grid items-center gap-12 md:grid-cols-2 md:gap-20">
            <div className="reveal relative pb-16 pr-10 md:pb-24 md:pr-16">
              <div className="relative aspect-[4/5] overflow-hidden bg-surface rounded-theme-sm">
                <Img src={st.image} alt="" sizes="(max-width:768px) 90vw, 40vw" />
              </div>
              {st.image2 && (
                <div className="absolute bottom-0 right-0 aspect-square w-[46%] overflow-hidden border-[6px] border-bg bg-surface shadow-xl rounded-theme-sm">
                  <Img src={st.image2} alt="" sizes="20vw" />
                </div>
              )}
            </div>
            <div className="reveal">
              {st.eyebrow && <p className="eyebrow mb-4">{st.eyebrow}</p>}
              <h2 className="t-1 text-balance">{st.heading}</h2>
              <p className="mt-6 max-w-lg text-[1.02rem] leading-[1.85] text-muted">{st.body}</p>
              {stats.length > 0 && (
                <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-y border-line py-6">
                  {stats.map((s) => (
                    <div key={s.label}>
                      <dt className="font-heading text-[1.7rem] leading-none">{s.value}</dt>
                      <dd className="mt-2 text-[0.72rem] uppercase tracking-[0.14em] text-muted">{s.label}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {st.signature && <p className="accent-italic mt-8 text-xl text-muted">— {st.signature}</p>}
              <Cta label={st.ctaLabel} link={st.ctaLink} className="mt-9" />
            </div>
          </div>
        </section>
      );
  }
}

export function ImageBannerSection({ section }: Props) {
  const st = section.settings;
  const light = (st.textColor ?? 'light') === 'light';
  const h = st.height === 'full' ? 'min-h-[90svh]' : st.height === 'large' ? 'min-h-[75vh]' : 'min-h-[58vh]';
  const align = st.align ?? 'center';
  const copy = (
    <div className={cn('max-w-xl', align === 'center' && 'mx-auto text-center', align === 'right' && 'ml-auto text-right', light ? 'text-white' : 'text-ink')}>
      {st.eyebrow && <p className={cn('eyebrow mb-4', light && '!text-white/80')}>{st.eyebrow}</p>}
      <h2 className="t-1 text-balance">{st.heading}</h2>
      {st.body && <p className={cn('mt-5 text-[1.02rem]', light ? 'text-white/85' : 'text-muted')}>{st.body}</p>}
      <Cta label={st.ctaLabel} link={st.ctaLink} light={light} className="mt-8" />
    </div>
  );
  if (section.variant === 'promo') {
    return (
      <section className="section-y-sm container-x">
        <div className="reveal grid overflow-hidden rounded-theme bg-secondary md:grid-cols-2">
          <div className="flex items-center p-10 md:p-16">
            <div className="max-w-md">
              {st.eyebrow && <p className="mb-4 text-[0.72rem] uppercase tracking-[0.26em] text-primary">{st.eyebrow}</p>}
              <h2 className="t-1 text-balance">{st.heading}</h2>
              {st.body && <p className="mt-4 text-muted">{st.body}</p>}
              <Cta label={st.ctaLabel} link={st.ctaLink} className="mt-8" />
            </div>
          </div>
          <div className="relative min-h-[320px]"><Img src={st.image} alt="" sizes="(max-width:768px) 100vw, 50vw" /></div>
        </div>
      </section>
    );
  }
  const framed = section.variant === 'framed';
  return (
    <section className={cn(framed ? 'section-y-sm container-x' : '')}>
      <div className={cn('reveal relative flex items-center overflow-hidden', h, framed && 'rounded-theme')}>
        <Img src={st.image} alt="" sizes="100vw" className={st.mobileImage ? 'max-md:hidden' : ''} />
        {st.mobileImage && <Img src={st.mobileImage} alt="" sizes="100vw" className="md:hidden" />}
        <div className="absolute inset-0 bg-black" style={{ opacity: (Number(st.overlay) || 0) / 100 }} />
        <div className={cn('relative w-full py-16', framed ? 'px-8 md:px-16' : 'container-x')}>{copy}</div>
      </div>
    </section>
  );
}

export function ImageTextSection({ section }: Props) {
  const st = section.settings;
  const right = st.imagePosition === 'right';
  switch (section.variant) {
    case 'overlap':
      return (
        <section className="section-y container-x">
          <div className="grid items-center gap-14 md:grid-cols-2 md:gap-20">
            <div className={cn('reveal relative h-[440px] md:h-[600px]', right && 'md:order-2')}>
              <div className="absolute left-0 top-0 h-[78%] w-[68%] overflow-hidden bg-surface"><Img src={st.image} alt="" sizes="40vw" /></div>
              <div className="arch absolute bottom-0 right-0 h-[62%] w-[52%] overflow-hidden border-8 border-bg bg-surface shadow-2xl"><Img src={st.image2 || st.image} alt="" sizes="30vw" /></div>
            </div>
            <div className="reveal">
              {st.eyebrow && <p className="eyebrow mb-4">{st.eyebrow}</p>}
              <h2 className="t-1 accent-italic text-balance">{st.heading}</h2>
              <p className="mt-6 max-w-lg leading-[1.85] text-muted">{st.body}</p>
              <Cta label={st.ctaLabel} link={st.ctaLink} className="mt-9" />
            </div>
          </div>
        </section>
      );
    case 'magazine':
      return (
        <section className="section-y container-x">
          <div className="grid gap-10 md:grid-cols-12">
            <div className={cn('reveal relative aspect-[3/4] overflow-hidden bg-surface md:col-span-7 md:aspect-auto md:min-h-[80vh]', right && 'md:order-2')}><Img src={st.image} alt="" sizes="60vw" /></div>
            <div className="reveal flex flex-col justify-center md:col-span-5">
              {st.eyebrow && <p className="eyebrow mb-4">{st.eyebrow}</p>}
              <h2 className="t-1 text-balance">{st.heading}</h2>
              <p className="mt-6 text-[1.02rem] leading-[1.9] first-letter:float-left first-letter:mr-3 first-letter:font-heading first-letter:text-[4.2rem] first-letter:leading-[0.85]">{st.body}</p>
              {st.quote && <blockquote className="font-heading my-10 border-l-2 border-accent pl-6 text-[1.6rem] italic leading-snug">“{st.quote}”</blockquote>}
              {st.ctaLink && <Link href={st.ctaLink} className="link-line self-start text-[0.75rem] uppercase tracking-[0.2em]">{st.ctaLabel} →</Link>}
            </div>
          </div>
        </section>
      );
    case 'bento':
      return (
        <section className="section-y-sm container-x">
          <div className="grid gap-3 md:grid-cols-3 md:grid-rows-2">
            <div className="reveal flex flex-col justify-end rounded-theme bg-ink p-8 text-bg md:col-span-1 md:row-span-2 md:p-10">
              {st.eyebrow && <p className="mb-4 text-[0.8rem] opacity-60">{st.eyebrow}</p>}
              <h2 className="t-2 text-balance">{st.heading}</h2>
              <p className="mt-4 text-[0.95rem] opacity-75">{st.body}</p>
              {st.ctaLink && <Link href={st.ctaLink} className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-bg px-5 py-3 text-[0.85rem] text-ink transition hover:scale-[1.03]">{st.ctaLabel} →</Link>}
            </div>
            <div className="reveal relative aspect-[4/3] overflow-hidden rounded-theme bg-surface md:col-span-2 md:aspect-auto"><Img src={st.image} alt="" sizes="66vw" /></div>
            <div className="reveal relative aspect-square overflow-hidden rounded-theme bg-surface md:aspect-auto"><Img src={st.image2 || st.image} alt="" sizes="33vw" /></div>
            <div className="reveal flex items-center justify-center rounded-theme bg-accent p-8 text-center text-white">
              <p className="font-heading text-[1.6rem] leading-tight">Hand-finished<br />in Lahore</p>
            </div>
          </div>
        </section>
      );
    case 'split':
    default:
      return (
        <section className="section-y container-x">
          <div className="grid items-center gap-12 md:grid-cols-2 md:gap-20">
            <div className={cn('reveal relative aspect-[4/5] overflow-hidden bg-surface rounded-theme', right && 'md:order-2')}><Img src={st.image} alt="" sizes="(max-width:768px) 100vw, 50vw" /></div>
            <div className="reveal max-w-lg">
              {st.eyebrow && <p className="eyebrow mb-4">{st.eyebrow}</p>}
              <h2 className="t-1 text-balance">{st.heading}</h2>
              <p className="mt-6 leading-[1.85] text-muted">{st.body}</p>
              <Cta label={st.ctaLabel} link={st.ctaLink} className="mt-9" />
            </div>
          </div>
        </section>
      );
  }
}

type T = { quote: string; name: string; location?: string; rating?: number; product?: string };

export function TestimonialsSection({ section }: Props) {
  const st = section.settings;
  const items: T[] = Array.isArray(st.items) ? st.items : [];
  if (!items.length) return null;
  switch (section.variant) {
    case 'cards':
      return (
        <section className="section-y container-x">
          <SectionHeading eyebrow={st.eyebrow} heading={st.heading} />
          <div className={cn('grid gap-[var(--grid-gap)]', items.length >= 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3')}>
            {items.map((t, i) => (
              <figure key={i} className="reveal flex flex-col rounded-theme border border-line bg-surface/60 p-7" style={{ ['--d' as string]: `${i * 100}ms` }}>
                <Stars value={t.rating ?? 5} size={13} />
                <blockquote className="mt-5 flex-1 text-[0.95rem] leading-relaxed">“{t.quote}”</blockquote>
                <figcaption className="mt-6 border-t border-line pt-4 text-[0.82rem]">
                  <span className="font-medium">{t.name}</span>
                  {t.location && <span className="text-muted"> · {t.location}</span>}
                  {t.product && <span className="mt-1 block text-[0.75rem] text-muted">Purchased: {t.product}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      );
    case 'letter':
      return (
        <section className="section-y container-x">
          <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
            <div className="reveal">
              {st.eyebrow && <p className="eyebrow mb-3">{st.eyebrow}</p>}
              <h2 className="t-2">{st.heading}</h2>
              <Quote size={44} strokeWidth={0.75} className="mt-8 text-accent" />
            </div>
            <div className="divide-y divide-line">
              {items.slice(0, 3).map((t, i) => (
                <figure key={i} className="reveal py-8 first:pt-0">
                  <blockquote className="font-heading text-[clamp(1.25rem,2vw,1.65rem)] italic leading-snug">“{t.quote}”</blockquote>
                  <figcaption className="mt-4 text-[0.78rem] uppercase tracking-[0.16em] text-muted">{t.name}{t.location ? ` — ${t.location}` : ''}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      );
    case 'marquee':
      return (
        <section className="section-y overflow-hidden">
          <div className="container-x"><SectionHeading heading={st.heading} align="left" /></div>
          <div className="marquee-pause">
            <div className="marquee-track flex gap-4" style={{ ['--marquee-speed' as string]: '55s' }}>
              {[...items, ...items].map((t, i) => (
                <figure key={i} className="w-[340px] shrink-0 rounded-theme bg-surface p-7">
                  <Stars value={t.rating ?? 5} size={12} />
                  <blockquote className="mt-4 text-[0.95rem] leading-relaxed">“{t.quote}”</blockquote>
                  <figcaption className="mt-5 text-[0.82rem] font-medium">{t.name} <span className="font-normal text-muted">· {t.location}</span></figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      );
    case 'slider':
    default:
      return (
        <section className="section-y bg-surface">
          <div className="container-x mx-auto max-w-4xl text-center">
            {st.eyebrow && <p className="eyebrow mb-3">{st.eyebrow}</p>}
            {st.heading && <h2 className="t-3 mb-10">{st.heading}</h2>}
            <TextSlider>
              {items.map((t, i) => (
                <figure key={i}>
                  <Stars value={t.rating ?? 5} size={14} className="justify-center" />
                  <blockquote className="font-heading mx-auto mt-6 max-w-3xl text-[clamp(1.5rem,3vw,2.4rem)] italic leading-snug text-balance">“{t.quote}”</blockquote>
                  <figcaption className="mt-7 text-[0.78rem] uppercase tracking-[0.2em] text-muted">{t.name}{t.location ? ` · ${t.location}` : ''}</figcaption>
                </figure>
              ))}
            </TextSlider>
          </div>
        </section>
      );
  }
}

export function InstagramSection({ section }: Props) {
  const st = section.settings;
  const images: string[] = Array.isArray(st.images) ? st.images.filter(Boolean) : [];
  if (!images.length) return null;
  const link = st.link || 'https://instagram.com/';
  const tile = (src: string, i: number, cls = '') => (
    <a key={i} href={link} target="_blank" rel="noopener noreferrer" className={cn('group relative block overflow-hidden bg-surface', cls)} aria-label={`View on Instagram (${i + 1})`}>
      <Img src={src} alt="" sizes="(max-width:768px) 33vw, 16vw" className="transition duration-700 group-hover:scale-105" />
      <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition duration-500 group-hover:bg-black/30 group-hover:opacity-100">
        <Instagram size={26} strokeWidth={1.25} />
      </span>
    </a>
  );
  const head = (
    <div className="container-x mb-8 flex flex-wrap items-end justify-between gap-3">
      <h2 className="t-3">{st.heading}</h2>
      <a href={link} target="_blank" rel="noopener noreferrer" className="link-line inline-flex items-center gap-2 text-[0.8rem]"><Instagram size={15} strokeWidth={1.25} /> {st.handle}</a>
    </div>
  );
  if (section.variant === 'mosaic') {
    return (
      <section className="section-y">
        {head}
        <div className="container-x grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2">
          {images.slice(0, 6).map((src, i) => tile(src, i, cn('aspect-square', i === 0 && 'col-span-2 row-span-2 md:aspect-auto')))}
        </div>
      </section>
    );
  }
  if (section.variant === 'strip') {
    return (
      <section className="section-y">
        {head}
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-[var(--pad-x)]">
          {images.map((src, i) => tile(src, i, 'aspect-[3/4] w-[46%] shrink-0 rounded-theme md:w-[19%]'))}
        </div>
      </section>
    );
  }
  return (
    <section className="section-y">
      {head}
      <div className="grid grid-cols-3 gap-1 md:grid-cols-6">{images.slice(0, 6).map((src, i) => tile(src, i, 'aspect-square'))}</div>
    </section>
  );
}

export function NewsletterSection({ section }: Props) {
  const st = section.settings;
  switch (section.variant) {
    case 'inline':
      return (
        <section className="section-y-sm container-x">
          <div className="reveal grid items-center gap-6 border-y border-line py-10 md:grid-cols-2">
            <div>
              <h2 className="t-3">{st.heading}</h2>
              {st.body && <p className="mt-2 text-[0.92rem] text-muted">{st.body}</p>}
            </div>
            <NewsletterForm source="home" variant="boxed" buttonLabel={st.buttonLabel} />
          </div>
        </section>
      );
    case 'card':
      return (
        <section className="section-y container-x">
          <div className="reveal mx-auto max-w-3xl rounded-[calc(var(--radius)*1.5)] bg-secondary px-8 py-14 text-center md:px-16">
            {st.eyebrow && <p className="eyebrow mb-3 !text-primary">{st.eyebrow}</p>}
            <h2 className="t-2">{st.heading}</h2>
            {st.body && <p className="mx-auto mt-4 max-w-lg text-muted">{st.body}</p>}
            <NewsletterForm source="home" variant="pill" buttonLabel={st.buttonLabel} className="mx-auto mt-8 max-w-md" />
            {st.disclaimer && <p className="mt-4 text-[0.72rem] text-muted">{st.disclaimer}</p>}
          </div>
        </section>
      );
    case 'split':
      return (
        <section className="section-y container-x">
          <div className="reveal grid overflow-hidden bg-surface md:grid-cols-2">
            <div className="relative min-h-[300px]"><Img src={st.image} alt="" sizes="(max-width:768px) 100vw, 50vw" /></div>
            <div className="flex items-center p-10 md:p-16">
              <div className="w-full max-w-md">
                {st.eyebrow && <p className="eyebrow mb-3">{st.eyebrow}</p>}
                <h2 className="t-2">{st.heading}</h2>
                {st.body && <p className="mt-4 text-muted">{st.body}</p>}
                <NewsletterForm source="home" variant="line" buttonLabel={st.buttonLabel} className="mt-8" />
                {st.disclaimer && <p className="mt-4 text-[0.72rem] text-muted">{st.disclaimer}</p>}
              </div>
            </div>
          </div>
        </section>
      );
    case 'centered':
    default:
      return (
        <section className="section-y container-x">
          <div className="reveal mx-auto max-w-xl text-center">
            {st.eyebrow && <p className="eyebrow mb-3">{st.eyebrow}</p>}
            <h2 className="t-2">{st.heading}</h2>
            {st.body && <p className="mt-4 text-muted">{st.body}</p>}
            <NewsletterForm source="home" variant="line" buttonLabel={st.buttonLabel} className="mx-auto mt-8 max-w-md" />
            {st.disclaimer && <p className="mt-4 text-[0.72rem] text-muted">{st.disclaimer}</p>}
          </div>
        </section>
      );
  }
}

export function RichTextSection({ section }: Props) {
  const st = section.settings;
  const align = st.align ?? 'center';
  const size = st.size === 'xl' ? 't-display' : st.size === 'lg' ? 't-1' : 't-2';
  if (section.variant === 'statement') {
    return (
      <section className="section-y container-x">
        <div className={cn('reveal max-w-5xl', align === 'center' && 'mx-auto text-center')}>
          {st.eyebrow && <p className="eyebrow mb-6">{st.eyebrow}</p>}
          <h2 className={cn(size, 'text-balance')}>{st.heading}</h2>
          {st.body && <p className={cn('mt-8 max-w-2xl text-[1.05rem] leading-[1.85] text-muted', align === 'center' && 'mx-auto')}>{st.body}</p>}
          {st.ctaLink && <Link href={st.ctaLink} className="link-line mt-8 inline-block text-[0.75rem] uppercase tracking-[0.2em]">{st.ctaLabel} →</Link>}
        </div>
      </section>
    );
  }
  return (
    <section className="section-y-sm container-x">
      <div className={cn('reveal max-w-2xl', align === 'center' && 'mx-auto text-center')}>
        {st.eyebrow && <p className="eyebrow mb-3">{st.eyebrow}</p>}
        {st.heading && <h2 className="t-3">{st.heading}</h2>}
        {st.body && <p className="mt-4 leading-relaxed text-muted">{st.body}</p>}
        <Cta label={st.ctaLabel} link={st.ctaLink} className="mt-7" />
      </div>
    </section>
  );
}

export function VideoSection({ section }: Props) {
  const st = section.settings;
  if (section.variant === 'inset') {
    return (
      <section className="section-y container-x">
        <div className="grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
          <div className="reveal relative aspect-video overflow-hidden rounded-theme bg-surface"><VideoPlayer src={st.videoUrl} poster={st.poster} /></div>
          <div className="reveal">
            {st.eyebrow && <p className="eyebrow mb-3">{st.eyebrow}</p>}
            <h2 className="t-2">{st.heading}</h2>
            {st.body && <p className="mt-4 text-muted">{st.body}</p>}
            <Cta label={st.ctaLabel} link={st.ctaLink} className="mt-8" />
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden bg-black">
      <VideoPlayer src={st.videoUrl} poster={st.poster} className="opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />
      <div className="container-x relative py-24 text-center text-white">
        {st.eyebrow && <p className="mb-5 text-[0.72rem] uppercase tracking-[0.36em] text-accent">{st.eyebrow}</p>}
        <h2 className="t-1 mx-auto max-w-3xl text-balance">{st.heading}</h2>
        {st.body && <p className="mx-auto mt-5 max-w-xl text-white/80">{st.body}</p>}
        {st.ctaLink && <Link href={st.ctaLink} className="btn btn-outline-light mt-9">{st.ctaLabel}</Link>}
      </div>
    </section>
  );
}

export function FaqSection({ section }: Props) {
  const st = section.settings;
  const items: { q: string; a: string }[] = Array.isArray(st.items) ? st.items : [];
  const list = (
    <div className="divide-y divide-line border-y border-line">
      {items.map((f, i) => (
        <details key={i} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[1.02rem] [&::-webkit-details-marker]:hidden">
            <span className="font-heading text-[1.15rem]">{f.q}</span>
            <Plus size={18} strokeWidth={1.25} className="shrink-0 transition duration-300 group-open:rotate-45" />
          </summary>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
  if (section.variant === 'two-column') {
    return (
      <section className="section-y container-x">
        <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
          <div>
            {st.eyebrow && <p className="eyebrow mb-3">{st.eyebrow}</p>}
            <h2 className="t-2">{st.heading}</h2>
            <Link href="/faq" className="link-line mt-6 inline-block text-[0.8rem]">All questions →</Link>
          </div>
          {list}
        </div>
      </section>
    );
  }
  return (
    <section className="section-y container-x">
      <div className="mx-auto max-w-3xl">
        <SectionHeading eyebrow={st.eyebrow} heading={st.heading} />
        {list}
      </div>
    </section>
  );
}

const ICONS = { truck: Truck, gift: Gift, shield: ShieldCheck, refresh: RefreshCcw, gem: Gem, sparkles: Sparkles, lock: Lock, phone: Phone } as const;

export function TrustBadgesSection({ section }: Props) {
  const items: { icon: keyof typeof ICONS; title: string; text: string }[] = Array.isArray(section.settings.items) ? section.settings.items : [];
  return (
    <section className="border-y border-line">
      <div className="container-x grid grid-cols-2 gap-x-6 gap-y-8 py-10 md:grid-cols-4">
        {items.map((b, i) => {
          const Icon = ICONS[b.icon] ?? Sparkles;
          return (
            <div key={i} className="reveal flex flex-col items-center gap-3 text-center md:flex-row md:text-left" style={{ ['--d' as string]: `${i * 80}ms` }}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-accent/40 text-accent"><Icon size={20} strokeWidth={1.25} /></span>
              <div>
                <p className="text-[0.9rem] font-medium">{b.title}</p>
                <p className="text-[0.8rem] text-muted">{b.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
