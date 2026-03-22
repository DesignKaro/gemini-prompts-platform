import Link from 'next/link';

const sections = [
  {
    title: 'Using the platform',
    body:
      'Gemini Prompts is designed for browsing, saving, and working with curated prompts, editorial content, and membership experiences. Please use the platform lawfully and respectfully.',
  },
  {
    title: 'Accounts and memberships',
    body:
      'You are responsible for activity under your account. Membership features, saved content, and exclusive access are tied to your account status and plan.',
  },
  {
    title: 'Content and conduct',
    body:
      'Do not misuse the product, attempt to interfere with service availability, or publish abusive, deceptive, or unauthorized content through the platform.',
  },
];

export default function TermsPage() {
  return (
    <main className="page-shell-tight bg-white">
      <div className="mx-auto w-full max-w-[1080px]">
        <nav aria-label="Breadcrumb" className="text-[0.9rem] text-[#8b8f99]">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition-colors hover:text-[#101010]">
                Home
              </Link>
            </li>
            <li className="text-[#c0c6d1]">/</li>
            <li className="font-medium text-[#101010]">Terms</li>
          </ol>
        </nav>

        <section className="mt-8 rounded-[28px] border border-[#e6e9f2] bg-white p-7 shadow-[0_18px_40px_rgba(17,24,39,0.05)] sm:p-10">
          <p className="inline-flex rounded-full border border-[#e1e5ee] bg-[#f8fafc] px-4 py-2 text-[0.9rem] text-[#4b525e]">
            Legal
          </p>
          <h1 className="section-heading-medium mt-5 text-[2.2rem] leading-[1.02] tracking-[-0.05em] text-[#111118] sm:text-[2.9rem]">
            Terms
          </h1>
          <p className="mt-4 max-w-[44rem] text-[1.03rem] leading-[1.8] text-[#5f6773]">
            These terms are a concise overview of how Gemini Prompts should be used right now.
            If the product introduces additional billing, licensing, or team features, this page
            will be expanded here.
          </p>

          <div className="mt-10 grid gap-5">
            {sections.map((section) => (
              <article
                key={section.title}
                className="rounded-[22px] border border-[#e8ebf2] bg-[#fbfcfe] p-6"
              >
                <h2 className="text-[1.2rem] leading-[1.2] tracking-[-0.03em] text-[#111118]">
                  {section.title}
                </h2>
                <p className="mt-3 text-[0.98rem] leading-[1.75] text-[#5f6773]">
                  {section.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
