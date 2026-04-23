import Link from 'next/link';
import { SeoSchemaScripts } from '../components/seo-schema-script';
import {
  LEGAL_CONTENT_CLASS,
  LEGAL_TABLE_CELL_CLASS,
  LEGAL_TABLE_CLASS,
  LEGAL_TABLE_CONTAINER_CLASS,
  LEGAL_TABLE_HEAD_CLASS,
  LEGAL_TABLE_HEADER_CELL_CLASS,
  LEGAL_TABLE_HEAD_ROW_CLASS,
  LEGAL_TABLE_ROW_CLASS,
} from '../components/legal-page-styles';
import { buildMetadata, getNormalizedBaseUrl, getSeoSettings } from '../../lib/seo';
import { buildBreadcrumbSchema, buildWebPageSchema } from '../../lib/structured-data';

export async function generateMetadata() {
  const settings = await getSeoSettings();

  return buildMetadata({
    title: 'Code of Conduct',
    description:
      'Read the GeminiPrompts.io Code of Conduct covering community standards, prohibited behavior, moderation, and reporting.',
    path: '/code-of-conduct',
    noIndex: settings.noindexStaticPages,
  });
}

export default async function CodeOfConductPage() {
  const settings = await getSeoSettings();
  const baseUrl = getNormalizedBaseUrl(settings);
  const pageUrl = `${baseUrl}/code-of-conduct`;
  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: 'Code of Conduct',
        description:
          'Read the GeminiPrompts.io Code of Conduct covering community standards, prohibited behavior, moderation, and reporting.',
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'Code of Conduct', item: pageUrl },
        ],
        pageUrl,
      ),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <main className="page-shell-tight bg-white">
      <SeoSchemaScripts items={schemaItems} noIndex={settings.noindexStaticPages} />
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

        <section className="mt-8 rounded-[28px] border border-[#e8edf5] bg-white p-7 sm:p-10">
          <p className="inline-flex rounded-full bg-[#d5ea52] px-4 py-2 text-[0.9rem] text-[#111111]">
            Legal
          </p>
          <h1 className="section-heading-medium mt-5 text-[2.2rem] leading-[1.02] tracking-[-0.05em] text-[#111118] sm:text-[2.9rem]">
            Code of Conduct
          </h1>
          <p className="mt-5 inline-flex flex-col gap-1 rounded-[14px] border border-[#e7ebf2] bg-[#f8fafc] px-4 py-3 text-[0.94rem] leading-[1.6] text-[#5f6773] [&_strong]:font-medium">
            <strong>Effective Date:</strong> March 29, 2026
            <br />
            <strong>Last Updated:</strong> March 29, 2026
          </p>

          <div className={LEGAL_CONTENT_CLASS}>
            <h2>1. Introduction</h2>
            <p>
              At <strong>GeminiPrompts.io</strong>, we are building more than a prompt library — we
              are building a community. This Code of Conduct outlines the standards of behavior we
              expect from every person who visits, uses, contributes to, or engages with our
              platform.
            </p>
            <p>
              By accessing or using GeminiPrompts.io, you agree to abide by this Code of Conduct. We
              are committed to providing a safe, respectful, and inclusive environment for everyone
              — regardless of age, gender, nationality, experience level, background, or identity.
            </p>

            <h2>2. Our Core Values</h2>
            <p>Everything we do is guided by the following principles:</p>
            <ul>
              <li>
                <strong>Respect</strong> — Treat every person on this platform with dignity and
                courtesy.
              </li>
              <li>
                <strong>Integrity</strong> — Be honest, transparent, and accountable in your
                actions.
              </li>
              <li>
                <strong>Creativity</strong> — Foster an environment where ideas are shared openly
                and generously.
              </li>
              <li>
                <strong>Responsibility</strong> — Use AI tools and prompts ethically, thoughtfully,
                and responsibly.
              </li>
              <li>
                <strong>Inclusivity</strong> — Welcome and celebrate diverse perspectives,
                experiences, and backgrounds.
              </li>
            </ul>

            <h2>3. Who This Applies To</h2>
            <p>This Code of Conduct applies to:</p>
            <ul>
              <li>All registered users and account holders.</li>
              <li>Visitors browsing the website.</li>
              <li>Contributors who submit prompts, comments, reviews, or other content.</li>
              <li>Anyone communicating with us via email, social media, or any other channel.</li>
            </ul>

            <h2>4. Expected Behavior</h2>
            <p>All users of GeminiPrompts.io are expected to:</p>
            <h3>4.1 Be Respectful</h3>
            <ul>
              <li>Engage with others in a courteous, professional, and constructive manner.</li>
              <li>Acknowledge differing opinions without hostility or personal attacks.</li>
              <li>Be patient and understanding, especially with new or less experienced users.</li>
            </ul>
            <h3>4.2 Contribute Honestly</h3>
            <ul>
              <li>Submit only original prompts or content you have the right to share.</li>
              <li>Accurately describe and categorize the prompts you publish.</li>
              <li>Provide genuine, fair, and constructive feedback or reviews.</li>
              <li>Do not misrepresent the capabilities or outcomes of any prompt.</li>
            </ul>
            <h3>4.3 Use the Platform Responsibly</h3>
            <ul>
              <li>
                Use prompts and AI-generated outputs in ways that are legal, ethical, and
                constructive.
              </li>
              <li>Do not use the platform to generate, distribute, or promote harmful content.</li>
              <li>Respect the intellectual property rights of others at all times.</li>
            </ul>
            <h3>4.4 Protect Privacy</h3>
            <ul>
              <li>
                Do not share personally identifiable information about yourself or others publicly
                on the platform.
              </li>
              <li>
                Do not use prompts to extract, expose, or misuse private or sensitive information
                about real individuals.
              </li>
              <li>
                Report any accidental exposure of private data to us immediately at{' '}
                <a href="mailto:help@geminiprompts.io">help@geminiprompts.io</a>.
              </li>
            </ul>
            <h3>4.5 Engage Constructively</h3>
            <ul>
              <li>Provide feedback that is specific, helpful, and kind.</li>
              <li>
                If you disagree with content or another user, express your perspective calmly and
                respectfully.
              </li>
              <li>Support fellow community members in learning and growing their skills.</li>
            </ul>

            <h2>5. Prohibited Behavior</h2>
            <p>
              The following behaviors are strictly prohibited on GeminiPrompts.io and may result in
              content removal, account suspension, or a permanent ban:
            </p>
            <h3>5.1 Harmful or Hateful Content</h3>
            <ul>
              <li>
                Submitting prompts or content designed to generate hate speech, discrimination, or
                harassment based on race, ethnicity, gender, sexuality, religion, disability, or any
                other characteristic.
              </li>
              <li>Promoting or glorifying violence, abuse, or self-harm.</li>
            </ul>
            <h3>5.2 Illegal Activity</h3>
            <ul>
              <li>
                Using the platform for any unlawful purpose or in violation of local, national, or
                international law.
              </li>
              <li>
                Submitting prompts intended to facilitate fraud, phishing, identity theft, or any
                other illegal activity.
              </li>
              <li>
                Sharing content that infringes on copyrights, trademarks, or other intellectual
                property rights.
              </li>
            </ul>
            <h3>5.3 Misinformation and Deception</h3>
            <ul>
              <li>
                Deliberately submitting false, misleading, or deceptive prompt descriptions or
                outcomes.
              </li>
              <li>
                Creating or sharing prompts specifically designed to generate disinformation, fake
                news, or manipulative content.
              </li>
              <li>Impersonating another person, brand, or organization.</li>
            </ul>
            <h3>5.4 Exploitation and Abuse</h3>
            <ul>
              <li>
                Using the platform to generate content that sexualizes, exploits, or endangers
                minors in any way. This is a zero-tolerance violation and will be reported to the
                relevant authorities.
              </li>
              <li>
                Attempting to manipulate AI models into bypassing their safety guidelines through
                prompts published on our platform.
              </li>
              <li>
                Scraping, harvesting, or bulk-downloading content from the site for unauthorized
                commercial redistribution.
              </li>
            </ul>
            <h3>5.5 Platform Abuse</h3>
            <ul>
              <li>
                Spamming, flooding, or repeatedly submitting low-quality or duplicate prompts.
              </li>
              <li>
                Attempting to manipulate ratings, reviews, or rankings through fake accounts or
                coordinated actions.
              </li>
              <li>Introducing malware, viruses, or malicious code into the platform.</li>
              <li>
                Attempting to gain unauthorized access to user accounts, databases, or site
                infrastructure.
              </li>
            </ul>
            <h3>5.6 Harassment and Intimidation</h3>
            <ul>
              <li>Targeting, threatening, or harassing other users publicly or privately.</li>
              <li>
                Doxxing — publishing private or identifying information about another person without
                their consent.
              </li>
              <li>
                Engaging in sustained negative behavior toward any individual or group on the
                platform.
              </li>
            </ul>

            <h2>6. AI Ethics and Responsible Use</h2>
            <p>
              GeminiPrompts.io is built on the foundation of responsible AI use. We ask all users to
              uphold the following principles when using our prompts with AI tools:
            </p>
            <ul>
              <li>
                <strong>Do not use prompts to deceive.</strong> Do not use AI-generated content to
                mislead others about its origin without appropriate disclosure.
              </li>
              <li>
                <strong>Do not use prompts to harm.</strong> Do not craft or use prompts with the
                intent to psychologically, emotionally, financially, or physically harm any
                individual or group.
              </li>
              <li>
                <strong>Respect AI limitations.</strong> Understand that AI outputs can be flawed,
                biased, or incorrect. Always apply your own critical judgment before acting on
                AI-generated content.
              </li>
              <li>
                <strong>Disclose AI use where appropriate.</strong> In professional, academic, or
                public-facing contexts, be transparent about the role AI played in producing your
                content.
              </li>
              <li>
                <strong>Avoid prompt injection abuse.</strong> Do not publish prompts designed to
                compromise, manipulate, or exploit AI systems or their users in malicious ways.
              </li>
            </ul>

            <h2>7. Content Moderation</h2>
            <p>We reserve the right to:</p>
            <ul>
              <li>Review any content submitted to the platform.</li>
              <li>
                Remove or edit any content that violates this Code of Conduct without prior notice.
              </li>
              <li>
                Suspend or permanently ban accounts that repeatedly or seriously violate these
                standards.
              </li>
              <li>
                Report illegal content or activity to the appropriate law enforcement authorities.
              </li>
            </ul>
            <p>
              Content moderation decisions are made at our sole discretion. While we aim to be fair
              and consistent, we are not obligated to provide detailed explanations for every
              moderation action.
            </p>

            <h2>8. Reporting Violations</h2>
            <p>
              If you encounter content or behavior that violates this Code of Conduct, please report
              it to us promptly. We take all reports seriously and will investigate them
              confidentially.
            </p>
            <p>
              <strong>To report a violation:</strong>
              <br />
              Email us at <a href="mailto:help@geminiprompts.io">help@geminiprompts.io</a>
              <br />
              Subject line: <code>Code of Conduct Report</code>
            </p>
            <p>Please include:</p>
            <ul>
              <li>A description of the content or behavior in question.</li>
              <li>The URL or location on the site where it occurred.</li>
              <li>Any relevant screenshots or supporting details.</li>
            </ul>
            <p>
              We will acknowledge your report within <strong>3 business days</strong> and take
              appropriate action.
            </p>

            <h2>9. Consequences of Violations</h2>
            <p>Depending on the nature and severity of the violation, consequences may include:</p>
            <div className={LEGAL_TABLE_CONTAINER_CLASS}>
              <table className={LEGAL_TABLE_CLASS}>
                <thead className={LEGAL_TABLE_HEAD_CLASS}>
                  <tr className={LEGAL_TABLE_HEAD_ROW_CLASS}>
                    <th className={LEGAL_TABLE_HEADER_CELL_CLASS}>Severity</th>
                    <th className={LEGAL_TABLE_HEADER_CELL_CLASS}>Consequence</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={LEGAL_TABLE_ROW_CLASS}>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      <strong>Minor</strong>
                    </td>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      Content removal and a written warning
                    </td>
                  </tr>
                  <tr className={LEGAL_TABLE_ROW_CLASS}>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      <strong>Moderate</strong>
                    </td>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      Temporary suspension of account access
                    </td>
                  </tr>
                  <tr className={LEGAL_TABLE_ROW_CLASS}>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      <strong>Severe</strong>
                    </td>
                    <td className={LEGAL_TABLE_CELL_CLASS}>Permanent account ban without refund</td>
                  </tr>
                  <tr className={LEGAL_TABLE_ROW_CLASS}>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      <strong>Illegal activity</strong>
                    </td>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      Immediate ban and report to law enforcement
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Repeat violations at any level will be treated with increased severity. We do not
              tolerate bad-faith appeals intended to circumvent enforcement.
            </p>

            <h2>10. Appeals</h2>
            <p>
              If you believe a moderation action taken against your account was made in error, you
              may appeal by contacting us at{' '}
              <a href="mailto:help@geminiprompts.io">help@geminiprompts.io</a> with the subject line{' '}
              <code>Moderation Appeal</code>. Please provide your account details and a clear
              explanation of why you believe the decision should be reconsidered.
            </p>
            <p>
              We will review all appeals fairly and respond within <strong>7 business days</strong>.
              Our decision following an appeal is final.
            </p>

            <h2>11. Changes to This Code of Conduct</h2>
            <p>
              We may revise this Code of Conduct periodically to reflect the evolving needs of our
              community and platform. Material changes will be communicated via a notice on the
              website or by email. Continued use of GeminiPrompts.io following any updates
              constitutes your acceptance of the revised Code of Conduct.
            </p>

            <h2>12. Contact Us</h2>
            <p>
              For any questions, concerns, or suggestions regarding this Code of Conduct, please get
              in touch:
            </p>
            <p>
              <strong>GeminiPrompts.io</strong>
              <br />
              Email: <a href="mailto:help@geminiprompts.io">help@geminiprompts.io</a>
              <br />
              Website: <a href="https://geminiprompts.io">geminiprompts.io</a>
            </p>
            <p>
              <em>
                Thank you for being a part of the GeminiPrompts.io community. Together, we can make
                this a platform that is genuinely useful, creative, and safe for everyone.
              </em>
            </p>
            <p>
              <em>This Code of Conduct was last reviewed and updated on March 29, 2026.</em>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
