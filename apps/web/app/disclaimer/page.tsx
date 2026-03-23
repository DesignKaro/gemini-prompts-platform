import Link from 'next/link';

const sections = [
  {
    title: 'General information',
    body: 'Gemini Prompts provides prompts, editorial content, and product information for general educational and creative use. It should not be treated as legal, financial, medical, or other regulated professional advice.',
  },
  {
    title: 'AI output responsibility',
    body: 'Outputs generated from prompts can vary by model, context, and user input. You are responsible for reviewing, validating, and adapting AI-generated content before using it in public, commercial, or client-facing work.',
  },
  {
    title: 'Third-party links and tools',
    body: 'Some pages may reference external platforms, tools, or examples. We are not responsible for the availability, accuracy, or policies of those third-party services.',
  },
];

export default function DisclaimerPage() {
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
            <li className="font-medium text-[#101010]">Disclaimer</li>
          </ol>
        </nav>

        <section className="mt-8 rounded-[28px] bg-white p-7 sm:p-10">
          <p className="inline-flex rounded-full bg-[#d5ea52] px-4 py-2 text-[0.9rem] text-[#111111]">
            Legal
          </p>
          <h1 className="section-heading-medium mt-5 text-[2.2rem] leading-[1.02] tracking-[-0.05em] text-[#111118] sm:text-[2.9rem]">
            Disclaimer
          </h1>
          <p className="mt-4 max-w-[44rem] text-[1.03rem] leading-[1.8] text-[#5f6773]">
            This page outlines the boundaries of the information and AI-related content shared on
            Gemini Prompts. Please use the platform thoughtfully and verify important outputs
            independently.
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
