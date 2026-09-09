'use client';

import FadeIn from '@/components/FadeIn';

// Same origin story as app/welcome/page.tsx, condensed for a donation-page
// context and ending on why it went public — reuses that page's visual
// language (pull-quote callout, Tatay sprite sign-off) so a supporter who's
// already seen /welcome recognizes the voice.
export default function SupportOriginStory() {
  return (
    <section className="px-6 py-20 max-w-3xl mx-auto">
      <FadeIn>
        <p className="text-[11px] tracking-[0.28em] font-bold text-orange-500 uppercase text-center mb-4">
          Why This Exists
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-black text-center mb-10 text-slate-800">
          Built for Two Kids, Growing Into Something Bigger
        </h2>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="space-y-5 text-slate-600 leading-relaxed">
          <p>
            This game started as something simple: a way to get my own kids off screens and into
            something that actually helped them do better in school. It worked well enough that it
            felt wrong to keep it to ourselves.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="relative my-8">
          <div
            className="absolute -inset-8 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 40% 50%, rgba(249,115,22,0.07), transparent 60%)' }}
          />
          <div className="relative bg-white border-l-4 border-orange-400 rounded-xl px-6 py-5 shadow-md overflow-hidden">
            <p className="relative text-slate-700 leading-relaxed italic">
              &ldquo;Turning it into something more kids and parents could use became a mission along
              the way &mdash; it only made sense to build more into it.&rdquo;
            </p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.15}>
        <div className="space-y-5 text-slate-600 leading-relaxed">
          <p>
            Every peso of support goes toward keeping the app alive, improving it, and reaching more
            families who could use it. If Learning Hall has helped your family too, this is how you
            help it reach the next one.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="flex flex-col items-end mt-6">
          <img src="/tatay sprite.webp" alt="Tatay" className="h-[180px] w-auto object-contain mb-2" />
          <p className="text-right text-sm text-slate-400 italic">— Tatay, creator of Learning Hall</p>
        </div>
      </FadeIn>
    </section>
  );
}
