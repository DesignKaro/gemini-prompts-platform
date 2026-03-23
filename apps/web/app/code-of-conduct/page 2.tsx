import Link from 'next/link';

const sections = [
  {
    title: 'Respectful participation',
    body: 'We expect members, contributors, and visitors to interact respectfully. Harassment, hate, intimidation, or deliberately hostile behavior is not welcome anywhere on Gemini Prompts.',
  },
  {
    title: 'Constructive contributions',
    body: 'Comments, submissions, and feedback should aim to help others. Critique is welcome when it is specific, thoughtful, and focused on the work rather than attacking the person behind it.',
  },
  {
    title: 'Safe and lawful use',
    body: 'Do not use the platform to share abusive, misleading, infringing, or unlawful material. Content that encourages harm, impersonation, or platform abuse may be removed and accounts may be restricted.',
  },
  {
    title: 'Enforcement',
    body: 'We may review reports, moderate content, suspend privileges, or remove accounts when conduct breaks these standards. Serious or repeated violations can lead to permanent removal from the platform.',
  },
];

export default function CodeOfConductPage() {
  return (
    <main className="page-shell-tight bg-white">
      <div className="mx-auto w-full max-w-[1300px]">
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

        <section className="mt-8 rounded-[28px] bg-white p-7 sm:p-10">
          <p className="inline-flex rounded-full bg-[#d5ea52] px-4 py-2 text-[0.9rem] text-[#111111]">
            Legal
          </p>
          <h1 className="section-heading-medium mt-5 text-[2.2rem] leading-[1.02] tracking-[-0.05em] text-[#111118] sm:text-[2.9rem]">
            Code of Conduct
          </h1>
          <p className="mt-4 max-w-[44rem] text-[1.03rem] leading-[1.8] text-[#5f6773]">
            This page explains the behavior standards we expect across public content, comments,
            submissions, and community interactions on Gemini Prompts.
          </p>

          <div className="mt-10 grid gap-5">
            {sections.map((section) => (
              <article key={section.title} className="rounded-[22px] bg-[#fbfcfe] p-6">
                <h2 className="text-[1.2rem] leading-[1.2] tracking-[-0.03em] text-[#111118]">
                  {section.title}
                </h2>
                <p className="mt-3 text-[0.98rem] leading-[1.75] text-[#5f6773]">{section.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
