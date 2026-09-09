'use client';

import FadeIn from '@/components/FadeIn';

// Deliberately framed as "built so far / up next," not "funded by
// supporters so far" -- there's no real donation history yet to point to,
// and claiming otherwise would be fabricated. This still answers "where
// does support actually go" concretely, just grounded in real shipped work
// and a real roadmap item instead of an invented funding timeline.
//
// Both cards only ever reference free, no-paywall gameplay on purpose --
// the whole pitch of this page is keeping learning free, so nothing here
// should read as "your donation subsidizes a paid feature."
export default function SupportMilestones() {
  return (
    <section className="px-6 py-20 bg-white">
      <div className="max-w-4xl mx-auto">
        <FadeIn>
          <p className="text-[11px] tracking-[0.28em] font-bold text-orange-500 uppercase text-center mb-4">
            Where This Is Headed
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-center mb-12 text-slate-800">
            Built So Far, Headed Next
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FadeIn delay={0.05}>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 h-full">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-2">Just Shipped</p>
              <h3 className="font-bold text-slate-800 mb-2">Mixed Trainer Track</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                A shuffled, timed quiz mode pulling questions from every subject strand at once —
                free for every student, no paywall, built as a real capstone challenge rather than
                another drill.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-6 h-full">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600 mb-2">Up Next</p>
              <h3 className="font-bold text-slate-800 mb-2">More Grade &amp; Subject Content</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Expanding curriculum coverage across grades and subjects, so every child gets the
                same depth of content — still free, still no paywall on the actual learning.
              </p>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
