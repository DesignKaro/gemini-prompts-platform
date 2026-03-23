import Link from 'next/link';

const sections = [
  {
    title: 'Be respectful',
    body:
      'Treat other users, creators, and collaborators with respect. Harassment, abuse, hate speech, threats, and demeaning behavior are not acceptable on or around the platform.',
  },
  {
    title: 'Act in good faith',
    body:
      'Do not misuse community features, impersonate others, publish deceptive content, or use the platform to spread spam, scams, or harmful material.',
  },
  {
    title: 'Protect the space',
    body:
      'If you notice behavior that undermines safety or trust, report it through support channels. We may limit access or remove accounts that violate these standards.',
  },
];

export default function CodeOfConductPage() {
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
            <li className="font-medium text-[#101010]">Code of Conduct</li>
          </ol>
        </nav>

        <section className="mt-8 rounded-[28px] border border-[#e6e9f2] bg-white p-7 shadow-[0_18px_40px_rgba(17,24,39,0.05)] sm:p-10">
          <p className="inline-flex rounded-full border border-[#e1e5ee] bg-[#f8fafc] px-4 py-2 text-[0.9rem] text-[#4b525e]">
            Legal
          </p>
          <h1 className="section-heading-medium mt-5 text-[2.2rem] leading-[1.02] tracking-[-0.05em] text-[#111118] sm:text-[2.9rem]">
            Code of Conduct
          </h1>
          <p className="mt-4 max-w-[44rem] text-[1.03rem] leading-[1.8] text-[#5f6773]">
            Gemini Prompts should feel useful, safe, and constructive. These guidelines describe
            the basic behavior expected from people using the platform and participating in its
            community spaces.
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
