import { Img } from '@/components/ui/img';
import { IMG } from '@/lib/images';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[80vh] md:grid-cols-2">
      <div className="relative hidden md:block">
        <Img src={IMG.celestine2} alt="" sizes="50vw" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <p className="font-heading absolute bottom-10 left-10 max-w-sm text-[2rem] italic leading-snug text-white">“Jewelry should feel like a memory you can wear.”</p>
      </div>
      <div className="flex items-center justify-center px-[var(--pad-x)] py-16">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
