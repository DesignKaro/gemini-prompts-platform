import type { Metadata } from 'next';
import Link from 'next/link';
import MembershipPricing from './pricing-client';

export const metadata: Metadata = {
  title: 'Membership — Gemini Prompts',
  description:
    'Unlock members-only prompts, premium packs, and weekly drops. Simple pricing with cancel-anytime flexibility.',
};

const CHECK = (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
    <path
      d="M6 12.3l3.3 3.2L18.5 6.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function MembershipPage() {
  const sectionSpacing = 'mt-12 sm:mt-14 lg:mt-16';
  const sectionSubSpacing = 'mt-8 sm:mt-10';
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:30001';

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${baseUrl}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Membership',
        item: `${baseUrl}/membership`,
      },
    ],
  };

  const featureCards = [
    {
      title: 'Exclusive library',
      description: 'Members-only prompts and posts you won’t find in the public archive.',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M7.5 10.8V9.4a4.5 4.5 0 0 1 9 0v1.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <rect
            x="6.2"
            y="10.8"
            width="11.6"
            height="9.6"
            rx="2.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
          />
        </svg>
      ),
    },
    {
      title: 'Premium packs',
      description: 'Downloadable prompt packs for launches, research, design reviews, and more.',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M7 7.5h10M7 11.5h10M7 15.5h6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M6 3.8h9.6L18 6.2V20a1.9 1.9 0 0 1-1.9 1.9H6A1.9 1.9 0 0 1 4.1 20V5.7A1.9 1.9 0 0 1 6 3.8Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      title: 'Weekly drops',
      description: 'New prompts and curated reads every week so you always have fresh leverage.',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M8 7h8M7 11h10M9 15h6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M6 3.8h12A2 2 0 0 1 20 5.8v12.4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5.8a2 2 0 0 1 2-2Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      title: 'Save & organize',
      description: 'Keep your best prompts in one place — organized by tags and categories.',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      title: 'Quality rubric',
      description: 'Every premium prompt includes constraints, examples, and a checklist to reduce fluff.',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M6 12.3l3.3 3.2L18.5 6.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      title: 'Request prompts',
      description: 'Tell us what you need. We’ll prioritize high-signal requests for members.',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 8h8M8 12h5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  const comparisonRows = [
    { feature: 'Access public prompts + posts', free: true, premium: true },
    { feature: 'Members-only (exclusive) library', free: false, premium: true },
    { feature: 'Premium prompt packs + templates', free: false, premium: true },
    { feature: 'Save prompts (requires sign-in)', free: true, premium: true },
    { feature: 'Weekly drops + curated reads', free: true, premium: true },
    { feature: 'Priority support + requests', free: false, premium: true },
  ];

  const faqItems = [
    {
      q: 'Can I cancel anytime?',
      a: 'Yes — you can cancel whenever you want. If you’re on an annual plan, you keep access until the end of the billing period.',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M9 12l2 2 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
    {
      q: 'What is “exclusive” content?',
      a: 'Exclusive prompts and posts are members-only. They include deeper examples, better constraints, and packs built for specific roles.',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      ),
    },
    {
      q: 'Do you offer team plans?',
      a: 'Yes — we can provide multi-seat access and team onboarding. Reach out through the contact page and we’ll set it up.',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            d="M23 21v-2a4 4 0 0 0-3-3.87"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 3.13a4 4 0 0 1 0 7.75"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      q: 'What if I only need one prompt pack?',
      a: 'Start free, explore what’s public, and upgrade only when you know what’s valuable for your workflows.',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 6v6l4 2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      q: 'How often do you add new content?',
      a: 'We add new prompts and packs weekly. Premium members get early access to all new content before it goes public.',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M12 2v6m0 4v6m0 4v2M8 12l4-4 4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      q: 'Can I use prompts for commercial projects?',
      a: 'Yes — all prompts can be used for commercial projects. Premium prompts include additional commercial licensing terms.',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <polyline points="14,2 14,8 20,8" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
    {
      q: 'What formats are the prompts in?',
      a: 'Prompts come in multiple formats including text, JSON, and structured templates. Each includes examples and usage guidelines.',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M4 6h16M4 12h16M4 18h7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      q: 'Is there a mobile app?',
      a: 'Currently we’re web-only with a mobile-optimized experience. A native mobile app is in development for premium members.',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="12" y1="18" x2="12" y2="18" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
    {
      q: 'Can I share prompts with my team?',
      a: 'Premium members can share prompts within their team. We also provide collaboration tools for team accounts.',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <circle cx="18" cy="5" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="6" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="18" cy="19" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="currentColor" strokeWidth="2" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
    {
      q: 'What payment methods do you accept?',
      a: 'We accept all major credit cards, PayPal, and wire transfers for enterprise accounts. All payments are processed securely.',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
  ];

  return (
    <main className="page-shell bg-white">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="page-container">
        <nav aria-label="Breadcrumb" className="text-[0.9rem] text-[#8b8f99]">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition-colors hover:text-[#101010]">
                Home
              </Link>
            </li>
            <li className="text-[#c0c6d1]">/</li>
            <li className="font-medium text-[#101010]">Membership</li>
          </ol>
        </nav>

        {/* Hero */}
        <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="section-heading-medium text-[2.25rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[2.8rem] lg:text-[3.1rem]">
              Membership
            </h1>
            <p className="mt-4 max-w-[46rem] text-[1.05rem] leading-[1.75] text-[#5f6773]">
              Unlock members-only prompts, premium packs, and weekly drops — built to help you ship
              better work with less iteration.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-[0.95rem] text-[#6a7280]">
              <span className="rounded-full bg-[#f1f3f7] px-4 py-2 text-[#4b525e]">
                Cancel anytime
              </span>
              <span className="rounded-full bg-[#f1f3f7] px-4 py-2 text-[#4b525e]">
                Members-only exclusives
              </span>
              <span className="rounded-full bg-[#f1f3f7] px-4 py-2 text-[#4b525e]">
                Weekly drops
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/latest"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#d8dce2] bg-white px-5 text-[0.95rem] text-[#101010] transition-colors hover:border-[#101010]"
            >
              Browse prompts
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#111111] px-5 text-[0.95rem] text-white transition-colors hover:bg-black"
            >
              Contact
            </Link>
          </div>
        </div>

        {/* Pricing */}
        <div className={sectionSpacing}>
          <MembershipPricing />
        </div>

        {/* What you get */}
        <section className={sectionSpacing}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="section-heading-medium text-[1.9rem] leading-[1.1] tracking-[-0.04em] text-[#111118] sm:text-[2.2rem]">
                What you get with Premium
              </h2>
              <p className="mt-4 max-w-[46rem] text-[1.03rem] leading-[1.75] text-[#5f6773]">
                A consistent system: high-signal prompts, clear output formats, and practical packs
                you can use immediately.
              </p>
            </div>
            <Link
              href="/exclusive"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#d8dce2] bg-white px-5 text-[0.95rem] text-[#101010] transition-colors hover:border-[#101010]"
            >
              See exclusives →
            </Link>
          </div>

          <div className={`${sectionSubSpacing} grid gap-6 sm:grid-cols-2 lg:grid-cols-3`}>
            {featureCards.map((card) => (
              <div
                key={card.title}
                className="rounded-[24px] border border-[#e6e9f2] bg-white p-6 transition hover:border-[#d8dce2] hover:bg-[#fbfcfe]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d5ea52] text-[#111118]">
                  {card.icon}
                </span>
                <h3 className="mt-4 text-[1.18rem] leading-[1.2] tracking-[-0.02em] text-[#111118]">
                  {card.title}
                </h3>
                <p className="mt-2 text-[0.98rem] leading-[1.65] text-[#5f6773]">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison */}
        <section className={sectionSpacing}>
          <h2 className="section-heading-medium text-[1.9rem] leading-[1.1] tracking-[-0.04em] text-[#111118] sm:text-[2.2rem]">
            Free vs Premium
          </h2>
          <p className="mt-4 max-w-[46rem] text-[1.03rem] leading-[1.75] text-[#5f6773]">
            Start free, then upgrade when you want exclusive packs and deeper workflows.
          </p>

          <div className={`${sectionSubSpacing} overflow-hidden rounded-[10px] border border-[#e6e9f2] bg-white`}>
            {/* Mobile stacked comparison */}
            <div className="divide-y divide-[#eef1f6] sm:hidden">
              {comparisonRows.map((row) => (
                <div key={row.feature} className="px-5 py-4">
                  <p className="text-[0.98rem] font-medium text-[#0b0f18]">{row.feature}</p>
                  <div className="mt-3 space-y-2 text-[0.92rem] text-[#3f4550]">
                    <div className="flex items-center justify-between rounded-[16px] border border-[#eef1f6] bg-[#fafbff] px-4 py-3">
                      <span className="text-[#6b7382]">Free</span>
                      <span className="text-[#111111]">
                        {row.free ? CHECK : <span className="text-[#c0c6d1]">—</span>}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-[16px] border border-[#eef1f6] bg-[#fafbff] px-4 py-3">
                      <span className="text-[#6b7382]">Premium</span>
                      <span className="text-[#111111]">
                        {row.premium ? CHECK : <span className="text-[#c0c6d1]">—</span>}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table comparison */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr] gap-0 border-b border-[#eef1f6] bg-[#0b0f18] px-5 py-4 text-[0.92rem] font-medium text-white">
                <p>Feature</p>
                <p className="text-center">Free</p>
                <p className="text-center">Premium</p>
              </div>
              <div className="divide-y divide-[#eef1f6]">
                {comparisonRows.map((row) => (
                  <div
                    key={row.feature}
                    className="grid grid-cols-[1.4fr_0.8fr_0.8fr] gap-0 px-5 py-4 text-[0.98rem] text-[#3f4550]"
                  >
                    <p className="pr-4">{row.feature}</p>
                    <div className="flex items-center justify-center text-[#111111]">
                      {row.free ? CHECK : <span className="text-[#c0c6d1]">—</span>}
                    </div>
                    <div className="flex items-center justify-center text-[#111111]">
                      {row.premium ? CHECK : <span className="text-[#c0c6d1]">—</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className={sectionSpacing}>
          <h2 className="section-heading-medium text-[1.9rem] leading-[1.1] tracking-[-0.04em] text-[#111118] sm:text-[2.2rem]">
            FAQs
          </h2>
          <p className="mt-4 max-w-[46rem] text-[1.03rem] leading-[1.75] text-[#5f6773]">
            Quick answers to the most common membership questions.
          </p>

          <div className={`${sectionSubSpacing} grid grid-cols-1 gap-x-16 gap-y-8 sm:grid-cols-2`}>
            {faqItems.map((item) => (
              <div key={item.q} className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-[#d5ea52] text-black">
                  {item.icon}
                </div>
                <div>
                  <p className="text-[1.03rem] font-medium leading-[1.4] text-[#0b0f18]">{item.q}</p>
                  <p className="mt-2 text-[0.92rem] leading-[1.75] text-[#5f6773]">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className={sectionSpacing}>
          <div className="relative overflow-hidden rounded-[28px] border border-[#e6e9f2] bg-[#0b0f18] px-6 py-10 text-white sm:px-10 sm:py-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-[220px] -top-[240px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(213,234,82,0.35)_0%,rgba(213,234,82,0)_62%)] blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-[300px] -left-[240px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.22)_0%,rgba(59,130,246,0)_62%)] blur-3xl"
            />

            <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="inline-flex rounded-full bg-white/10 px-4 py-2 text-[0.9rem] text-white/85">
                  Ready to upgrade?
                </p>
                <h2 className="section-heading-medium mt-4 text-[2.05rem] leading-[1.05] tracking-[-0.05em] text-white sm:text-[2.35rem]">
                  Get better outputs with fewer retries.
                </h2>
                <p className="mt-4 max-w-[40rem] text-[1.02rem] leading-[1.75] text-white/75">
                  Premium prompts come with constraints, examples, and checklists — so you get
                  reliable results and ship faster.
                </p>
              </div>

              <div className="rounded-[26px] border border-white/12 bg-white/10 p-5 backdrop-blur sm:p-6">
                <p className="text-[0.95rem] font-medium text-white">Included with Premium</p>
                <ul className="mt-4 space-y-3 text-[0.95rem] text-white/85">
                  {[
                    'Exclusive prompts + posts',
                    'Premium packs + templates',
                    'Weekly drops and early access',
                    'Priority support',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 text-[#d5ea52]">{CHECK}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/contact"
                    className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#d5ea52] px-6 text-[0.95rem] font-medium text-[#101418] transition-colors hover:bg-[#cbe246]"
                  >
                    Join Premium
                  </Link>
                  <Link
                    href="/latest"
                    className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 text-[0.95rem] text-white transition-colors hover:bg-white/15"
                  >
                    Stay free
                  </Link>
                </div>

                <p className="mt-4 text-[0.85rem] text-white/60">
                  Questions? <Link href="/contact" className="underline underline-offset-4">Contact us</Link>.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
