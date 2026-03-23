import Link from 'next/link';

export default function ContactPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:30001';

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
        name: 'Contact',
        item: `${baseUrl}/contact`,
      },
    ],
  };

  const contactCards = [
    {
      title: 'Email us',
      description: 'Support, partnerships, and feedback.',
      href: 'mailto:hello@immihub.com',
      cta: 'hello@immihub.com',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M4 7.5h16v9H4v-9Zm0 0 8 6 8-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      title: 'Help center',
      description: 'Common questions and quick fixes.',
      href: '/help',
      cta: 'Browse help',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M9.6 10a2.4 2.4 0 1 1 4.2 1.6c-.7.7-1.3 1-1.3 2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <circle cx="12" cy="16.8" r="0.9" fill="currentColor" />
        </svg>
      ),
    },
    {
      title: 'Newsletter',
      description: 'Weekly prompt drops and curated reads.',
      href: '/newsletter',
      cta: 'View newsletter',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <rect
            x="4"
            y="6.8"
            width="16"
            height="10.4"
            rx="2.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M6.6 9.1 12 12.5l5.4-3.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      title: 'Follow us',
      description: 'Updates and new collections.',
      href: 'https://instagram.com',
      cta: 'Instagram',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
        </svg>
      ),
    },
  ];

  return (
    <main className="page-shell-tight bg-white">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="mx-auto w-full max-w-[1300px]">
        <nav aria-label="Breadcrumb" className="text-[0.9rem] text-[#8b8f99]">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition-colors hover:text-[#101010]">
                Home
              </Link>
            </li>
            <li className="text-[#c0c6d1]">/</li>
            <li className="font-medium text-[#101010]">Contact</li>
          </ol>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <h1 className="section-heading-medium text-[2.25rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[2.8rem] lg:text-[3.1rem]">
              Contact
            </h1>
            <p className="mt-4 max-w-[44rem] text-[1.05rem] leading-[1.75] text-[#5f6773]">
              Have a question, idea, or partnership request? Send us a note and we’ll get back to
              you as soon as possible.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-[0.95rem] text-[#6a7280]">
              <span className="rounded-full border border-[#e1e5ee] bg-[#f8fafc] px-4 py-2 text-[#4b525e]">
                Typical reply: 1–2 business days
              </span>
              <span className="rounded-full border border-[#e1e5ee] px-4 py-2">
                Email: hello@immihub.com
              </span>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {contactCards.map((card) => (
                <a
                  key={card.title}
                  href={card.href}
                  className="group flex h-full flex-col rounded-[24px] border border-[#e6e9f2] bg-white p-6 transition hover:border-[#d8dce2] hover:bg-[#fbfcfe]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f2f4f7] text-[#111118]">
                    {card.icon}
                  </span>
                  <h2 className="mt-4 text-[1.2rem] leading-[1.2] tracking-[-0.02em] text-[#111118]">
                    {card.title}
                  </h2>
                  <p className="mt-2 text-[0.98rem] leading-[1.65] text-[#5f6773]">
                    {card.description}
                  </p>
                  <span className="mt-auto pt-6 text-[0.95rem] text-[#101010] underline decoration-[#d8dce2] underline-offset-[6px] transition group-hover:decoration-[#101010]">
                    {card.cta}
                  </span>
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#e6e9f2] bg-[#f8fafc] p-6 sm:p-8">
            <h2 className="section-heading-medium text-[1.65rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[2rem]">
              Send a message
            </h2>
            <p className="mt-3 text-[1rem] leading-[1.7] text-[#5f6773]">
              This form is UI-only for now — we’ll wire it to the backend next.
            </p>

            <form className="mt-7 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[0.92rem] text-[#4b525e]">Name</span>
                  <input
                    type="text"
                    name="name"
                    placeholder="Your name"
                    className="mt-2 h-[48px] w-full rounded-[14px] border border-[#d8dce2] bg-white px-4 text-[1rem] text-[#101418] outline-none transition focus:border-[#101010]"
                  />
                </label>
                <label className="block">
                  <span className="text-[0.92rem] text-[#4b525e]">Email</span>
                  <input
                    type="email"
                    name="email"
                    placeholder="you@company.com"
                    className="mt-2 h-[48px] w-full rounded-[14px] border border-[#d8dce2] bg-white px-4 text-[1rem] text-[#101418] outline-none transition focus:border-[#101010]"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-[0.92rem] text-[#4b525e]">Subject</span>
                <select
                  name="subject"
                  className="mt-2 h-[48px] w-full rounded-[14px] border border-[#d8dce2] bg-white px-4 text-[1rem] text-[#101418] outline-none transition focus:border-[#101010]"
                  defaultValue="support"
                >
                  <option value="support">Support</option>
                  <option value="feedback">Feedback</option>
                  <option value="partnership">Partnership</option>
                  <option value="billing">Billing</option>
                </select>
              </label>

              <label className="block">
                <span className="text-[0.92rem] text-[#4b525e]">Message</span>
                <textarea
                  name="message"
                  rows={6}
                  placeholder="Tell us what you need…"
                  className="mt-2 w-full rounded-[14px] border border-[#d8dce2] bg-white px-4 py-3 text-[1rem] text-[#101418] outline-none transition focus:border-[#101010]"
                />
              </label>

              <button
                type="button"
                className="h-[50px] w-full rounded-full bg-[#111111] px-6 text-[1rem] text-white transition-colors hover:bg-black"
              >
                Send message
              </button>

              <p className="text-[0.9rem] leading-[1.6] text-[#6a7280]">
                Prefer email? Reach us at{' '}
                <a
                  className="text-[#111118] underline underline-offset-4"
                  href="mailto:hello@immihub.com"
                >
                  hello@immihub.com
                </a>
                .
              </p>
            </form>
          </div>
        </div>

        <section className="mt-14 rounded-[28px] border border-[#e6e9f2] bg-white p-6 sm:p-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="section-heading-medium text-[1.7rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[2.2rem]">
                Quick links
              </h2>
              <p className="mt-3 max-w-[46rem] text-[1.02rem] leading-[1.7] text-[#5f6773]">
                If you’re looking for answers fast, these pages usually help.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: '/help', label: 'Help center' },
              { href: '/membership', label: 'Membership' },
              { href: '/dashboard/saved-prompts', label: 'Saved prompts' },
              { href: '/prompt', label: 'Trending prompts' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-[20px] border border-[#e6e9f2] bg-[#f8fafc] px-5 py-4 text-[1rem] text-[#111118] transition-colors hover:bg-white"
              >
                <span>{item.label}</span>
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-[#6a7280]">
                  <path
                    d="M9 5.5 15.5 12 9 18.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
