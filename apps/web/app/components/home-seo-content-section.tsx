import Link from 'next/link';

const popularCategories = [
  { title: 'Latest Prompts', href: '/latest', note: 'Fresh styles and edits updated daily' },
  {
    title: 'Couple Prompts',
    href: '/search?q=Couple+Prompts',
    note: 'Romantic reels and portraits',
  },
  {
    title: 'Boys Prompts',
    href: '/search?q=Boys+Prompts',
    note: 'Gym, attitude, retro, street looks',
  },
  {
    title: 'Girls Prompts',
    href: '/search?q=Girls+Prompts',
    note: 'Aesthetic and festive creator styles',
  },
  {
    title: 'Girl Saree Prompts',
    href: '/search?q=Girl+Saree+Prompts',
    note: 'Traditional and royal edits',
  },
  {
    title: 'Bike Lover & Thar Lover',
    href: '/search?q=Bike+Lover+Thar+Lover+Prompts',
    note: 'Cinematic vehicle visuals',
  },
  {
    title: 'Festival Prompts',
    href: '/search?q=Festival+Prompts',
    note: 'Diwali to Navratri campaigns',
  },
  {
    title: 'Devotional & Culture',
    href: '/search?q=Devotional+Culture+Prompts',
    note: 'Meaningful faith and heritage content',
  },
  {
    title: 'Kids Prompts',
    href: '/search?q=Kids+Prompts',
    note: 'Fun cartoon and fairy-tale concepts',
  },
];

const exclusivePromptTopics = [
  'Prompt for Gemini AI girl',
  'Prompt for Gemini AI boy',
  'Prompt for Gemini AI retro style',
  'Gemini & ChatGPT trending prompts',
  'ChatGPT photo editing prompts free',
  'ChatGPT trending prompts',
];

const useCases = [
  'Create AI photos, posters, and profile pictures in minutes.',
  'Generate captions, hooks, and short stories for social media.',
  'Try new photo editing prompts and visual styles quickly.',
  'Explore trending Gemini prompts for viral creator content.',
  'Build festival and event visuals without complex workflows.',
];

const exploreMoreTopics = [
  "Valentine's Day Prompts",
  'Independence Day Prompts',
  'Holi Prompts',
  'Raksha Bandhan Prompts',
  'Republic Day Prompts',
  'Christmas Prompts',
  'Friendship Day Prompts',
  'School & College Life Prompts',
  'Travel & Nature Prompts',
  'Rare Animals Prompts',
];

export function HomeSeoContentSection() {
  return (
    <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
      <div className="page-container-wide">
        <div className="relative overflow-hidden rounded-[34px] bg-white text-[#121620]">
          <div className="pointer-events-none absolute -left-24 -top-16 h-64 w-64 rounded-full bg-[#d5ea52]/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-8 h-56 w-56 rounded-full bg-[#b7f0de]/35 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-[#dbe4ff]/45 blur-3xl" />

          <div className="relative px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-[24px] bg-[#f8fbff] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
                <h3 className="text-[1.3rem] leading-[1.12] tracking-[-0.03em] text-[#121620] sm:text-[1.55rem]">
                  Popular Categories on GeminiPrompts.io
                </h3>
                <p className="mt-2 text-[0.9rem] leading-6 text-[#5f6b7e]">
                  Explore practical categories designed for reels, edits, portraits, festivals, and
                  daily creator workflows.
                </p>
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {popularCategories.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="group rounded-[16px] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors hover:bg-[#fbfdeb]"
                    >
                      <p className="text-[0.94rem] font-medium text-[#131722]">{item.title}</p>
                      <p className="mt-1 text-[0.77rem] text-[#6e7a8f] transition-colors group-hover:text-[#4f5a6e]">
                        {item.note}
                      </p>
                    </Link>
                  ))}
                </div>
              </article>

              <article className="rounded-[24px] bg-[#f7f9fd] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
                <h3 className="text-[1.3rem] leading-[1.12] tracking-[-0.03em] text-[#121620] sm:text-[1.55rem]">
                  Exclusive Gemini & ChatGPT Prompts
                </h3>
                <p className="mt-2 text-[0.9rem] leading-6 text-[#5f6b7e]">
                  Use proven prompt patterns to generate realistic portraits, scroll-stopping
                  visuals, and social-first creative assets.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {exclusivePromptTopics.map((topic) => (
                    <li
                      key={topic}
                      className="rounded-[14px] bg-white px-3.5 py-2.5 text-[0.88rem] text-[#313a4c] shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                    >
                      {topic}
                    </li>
                  ))}
                </ul>
              </article>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <article className="rounded-[24px] bg-[#f8fbff] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
                <h3 className="text-[1.22rem] leading-[1.12] tracking-[-0.03em] text-[#121620] sm:text-[1.42rem]">
                  What You Can Do with Our Prompts
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {useCases.map((item) => (
                    <li key={item} className="flex gap-2.5 text-[0.88rem] leading-6 text-[#4f5a6f]">
                      <span className="mt-[8px] inline-flex h-2 w-2 shrink-0 rounded-full bg-[#d5ea52]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="rounded-[24px] bg-[#f7f9fd] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
                <h3 className="text-[1.22rem] leading-[1.12] tracking-[-0.03em] text-[#121620] sm:text-[1.42rem]">
                  Explore More on GeminiPrompts.io
                </h3>
                <p className="mt-2 text-[0.9rem] leading-6 text-[#5f6b7e]">
                  We publish new prompt themes every week, so you always have options for seasons,
                  festivals, and trend cycles.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {exploreMoreTopics.map((topic) => (
                    <Link
                      key={topic}
                      href={`/search?q=${encodeURIComponent(topic)}`}
                      className="rounded-full bg-white px-3 py-1.5 text-[0.78rem] text-[#425068] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors hover:bg-[#fbfdeb] hover:text-[#1b2435]"
                    >
                      {topic}
                    </Link>
                  ))}
                </div>
              </article>
            </div>

            <div className="mt-5 rounded-[24px] bg-gradient-to-r from-[#f7fce0] via-[#f3fbef] to-[#edf6ff] p-5 shadow-[0_2px_8px_rgba(16,24,40,0.06)] sm:p-6">
              <h3 className="text-[1.35rem] leading-[1.08] tracking-[-0.03em] text-[#10131a] sm:text-[1.62rem]">
                Start Exploring Now
              </h3>
              <p className="mt-2 max-w-[48rem] text-[0.9rem] leading-6 text-[#4e5a6f] sm:text-[0.96rem]">
                Unlock hundreds of free, ready-to-use AI prompts for Gemini, ChatGPT, and visual
                editing workflows. Discover what&apos;s trending and ship better content faster.
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <Link
                  href="/prompts"
                  className="inline-flex items-center justify-center rounded-full bg-[#d5ea52] px-5 py-2.5 text-[0.9rem] font-medium text-[#101218] transition-colors hover:bg-[#c8dd46]"
                >
                  Browse all prompts
                </Link>
                <Link
                  href="/exclusive"
                  className="inline-flex items-center justify-center rounded-full border border-[#c8d2e1] bg-white px-5 py-2.5 text-[0.9rem] font-medium text-[#162032] transition-colors hover:border-[#162032] hover:bg-[#162032] hover:text-white"
                >
                  Explore exclusive
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
