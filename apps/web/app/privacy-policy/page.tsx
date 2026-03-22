import Link from 'next/link';

const sections = [
  {
    title: 'What we collect',
    body:
      'We currently collect the account details you provide during sign up, profile information you choose to add, and basic usage data needed to run the product.',
  },
  {
    title: 'How we use it',
    body:
      'That information is used to authenticate your account, personalize your experience, protect the platform, and improve prompts, memberships, and public content discovery.',
  },
  {
    title: 'Your controls',
    body:
      'You can update your account details from your profile, and you can contact us if you need help with account access, corrections, or support questions.',
  },
];

export default function PrivacyPolicyPage() {
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
            <li className="font-medium text-[#101010]">Privacy Policy</li>
          </ol>
        </nav>

        <section className="mt-8 rounded-[28px] bg-white p-7 sm:p-10">
          <p className="inline-flex rounded-full bg-[#d5ea52] px-4 py-2 text-[0.9rem] text-[#111111]">
            Legal
          </p>
          <h1 className="section-heading-medium mt-5 text-[2.2rem] leading-[1.02] tracking-[-0.05em] text-[#111118] sm:text-[2.9rem]">
            Privacy Policy
          </h1>
          <p className="mt-4 max-w-[44rem] text-[1.03rem] leading-[1.8] text-[#5f6773]">
            This page gives a plain-language summary of how Gemini Prompts handles account and
            usage information today. If we expand or formalize the policy, this page will be
            updated here.
          </p>

          <div className="mt-10 grid gap-5">
            {sections.map((section) => (
              <article
                key={section.title}
                className="rounded-[22px] bg-[#fbfcfe] p-6"
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
