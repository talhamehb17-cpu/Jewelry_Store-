import type { Metadata } from 'next';
import { MapPin, Phone, Mail, Clock, MessageCircle } from 'lucide-react';
import { getPage } from '@/lib/pages';
import { getSettings } from '@/lib/settings';
import { renderMarkdown } from '@/lib/markdown';
import { ContactForm } from '@/components/store/contact-form';
import { publicContact } from '@/lib/locations';
import { isLiveSchedule, isPlaceholderHours } from '@/lib/store-hours';
import { StoreHours } from '@/components/store/store-hours';

export async function generateMetadata(): Promise<Metadata> {
  const p = await getPage('contact');
  return { title: p?.seoTitle || 'Contact Us', description: p?.seoDescription ?? undefined, alternates: { canonical: '/contact' } };
}

export default async function ContactPage() {
  const [page, settings] = await Promise.all([getPage('contact'), getSettings()]);
  const s = publicContact(settings.store);
  return (
    <div className="container-x pb-[var(--section-y)] pt-12 md:pt-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Client care</p>
        <h1 className="t-1 mt-3">{page?.title ?? 'Contact Us'}</h1>
        {page && <div className="prose-aurelle mx-auto mt-5 text-muted" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }} />}
      </div>
      <div className="mt-14 grid gap-12 md:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <div className="rounded-theme bg-surface/70 p-7">
            <ul className="space-y-5 text-[0.92rem]">
              {s.address && <li className="flex gap-4"><MapPin size={20} strokeWidth={1.25} className="shrink-0 text-accent" /><span><span className="label !mb-1">Address</span>{s.address}</span></li>}
              {s.phone && <li className="flex gap-4"><Phone size={20} strokeWidth={1.25} className="shrink-0 text-accent" /><span><span className="label !mb-1">Phone</span><a href={`tel:${s.phone.replace(/\s/g, '')}`} className="link-u">{s.phone}</a></span></li>}
              {s.whatsapp && <li className="flex gap-4"><MessageCircle size={20} strokeWidth={1.25} className="shrink-0 text-accent" /><span><span className="label !mb-1">WhatsApp</span><a href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noopener noreferrer" className="link-u">Chat with a stylist</a></span></li>}
              {s.email && <li className="flex gap-4"><Mail size={20} strokeWidth={1.25} className="shrink-0 text-accent" /><span><span className="label !mb-1">Email</span><a href={`mailto:${s.email}`} className="link-u">{s.email}</a></span></li>}
              {isLiveSchedule(settings.store.hoursSchedule) ? <li className="flex gap-4"><Clock size={20} strokeWidth={1.25} className="shrink-0 text-accent" /><span><span className="label !mb-1">Hours</span><StoreHours schedule={settings.store.hoursSchedule} /></span></li> : s.hours && !isPlaceholderHours(s.hours) ? <li className="flex gap-4"><Clock size={20} strokeWidth={1.25} className="shrink-0 text-accent" /><span><span className="label !mb-1">Hours</span>{s.hours}</span></li> : null}
            </ul>
          </div>
          <p className="text-[0.85rem] text-muted">A street address, phone number and opening hours appear here only after they are saved in admin. Nothing on this page is a guessed location.</p>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
