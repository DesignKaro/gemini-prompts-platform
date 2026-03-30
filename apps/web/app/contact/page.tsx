import Link from 'next/link';
import { ContactMessageForm } from '../components/contact-message-form';
import { SeoSchemaScripts } from '../components/seo-schema-script';
import { buildMetadata, getNormalizedBaseUrl, getSeoSettings } from '../../lib/seo';
import { buildBreadcrumbSchema, buildWebPageSchema } from '../../lib/structured-data';

export async function generateMetadata() {
  const settings = await getSeoSettings();

  return buildMetadata({
    title: 'Contact',
    description: 'Get in touch with the Gemini Prompts team for support, feedback, and partnerships.',
    path: '/contact',
    noIndex: settings.noindexStaticPages,
  });
}

export default async function ContactPage() {
  const seoSettings = await getSeoSettings();
  const baseUrl = getNormalizedBaseUrl(seoSettings);
  const pageUrl = `${baseUrl}/contact`;
  const shouldNoIndex = seoSettings.noindexStaticPages;
  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: 'Contact',
        description:
          'Get in touch with the Gemini Prompts team for support, feedback, and partnerships.',
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'Contact', item: pageUrl },
        ],
        pageUrl,
      ),
    },
  ].filter((entry) => Boolean(entry.schema));

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
      <SeoSchemaScripts items={schemaItems} noIndex={shouldNoIndex} />

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
              Share your question and we’ll route it to the right team member.
            </p>
            <ContactMessageForm source="contact_page" pagePath="/contact" />
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
              { href: '/prompts', label: 'Trending prompts' },
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
