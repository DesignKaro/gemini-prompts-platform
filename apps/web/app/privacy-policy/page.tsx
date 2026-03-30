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
    title: 'Privacy Policy',
    description:
      'Read the complete Privacy Policy for GeminiPrompts.io, including data collection, usage, cookies, retention, and user rights.',
    path: '/privacy-policy',
    noIndex: settings.noindexStaticPages,
  });
}

export default async function PrivacyPolicyPage() {
  const settings = await getSeoSettings();
  const baseUrl = getNormalizedBaseUrl(settings);
  const pageUrl = `${baseUrl}/privacy-policy`;
  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: 'Privacy Policy',
        description:
          'Read the complete Privacy Policy for GeminiPrompts.io, including data collection, usage, cookies, retention, and user rights.',
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'Privacy Policy', item: pageUrl },
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
            <li className="font-medium text-[#101010]">Privacy Policy</li>
          </ol>
        </nav>

        <section className="mt-8 rounded-[28px] border border-[#e8edf5] bg-white p-7 sm:p-10">
          <p className="inline-flex rounded-full bg-[#d5ea52] px-4 py-2 text-[0.9rem] text-[#111111]">
            Legal
          </p>
          <h1 className="section-heading-medium mt-5 text-[2.2rem] leading-[1.02] tracking-[-0.05em] text-[#111118] sm:text-[2.9rem]">
            Privacy Policy
          </h1>
          <p className="mt-5 inline-flex flex-col gap-1 rounded-[14px] border border-[#e7ebf2] bg-[#f8fafc] px-4 py-3 text-[0.94rem] leading-[1.6] text-[#5f6773] [&_strong]:font-medium">
            <strong>Effective Date:</strong> March 29, 2026
            <br />
            <strong>Last Updated:</strong> March 29, 2026
          </p>

          <div className={LEGAL_CONTENT_CLASS}>
            <h2>1. Introduction</h2>
            <p>
              Welcome to <strong>GeminiPrompts.io</strong> (&quot;we,&quot; &quot;our,&quot; or
              &quot;us&quot;). We are committed to protecting your personal information and your
              right to privacy. This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you visit our website <strong>geminiprompts.io</strong>{' '}
              and use our services.
            </p>
            <p>
              Please read this policy carefully. If you disagree with its terms, please discontinue
              use of the site.
            </p>

            <h2>2. Information We Collect</h2>
            <h3>2.1 Information You Provide Directly</h3>
            <ul>
              <li>
                <strong>Account registration data</strong> — name, email address, username, and
                password when you create an account.
              </li>
              <li>
                <strong>Payment information</strong> — billing details processed securely through
                third-party payment processors. We do not store full card numbers.
              </li>
              <li>
                <strong>Communications</strong> — messages, feedback, or inquiries you send us via
                email or contact forms.
              </li>
              <li>
                <strong>User-generated content</strong> — prompts, collections, or other content
                you create or submit on the platform.
              </li>
            </ul>

            <h3>2.2 Information Collected Automatically</h3>
            <ul>
              <li>
                <strong>Usage data</strong> — pages visited, features used, time spent, clicks,
                and search queries.
              </li>
              <li>
                <strong>Device &amp; technical data</strong> — IP address, browser type, operating
                system, device identifiers, and referring URLs.
              </li>
              <li>
                <strong>Cookies and tracking technologies</strong> — session cookies, persistent
                cookies, and similar technologies to enhance your experience and analyze usage.
              </li>
            </ul>

            <h3>2.3 Information from Third Parties</h3>
            <ul>
              <li>
                <strong>OAuth sign-in providers</strong> (e.g., Google) — if you choose to sign in
                via a third-party account, we may receive your name, email, and profile photo as
                permitted by that service.
              </li>
              <li>
                <strong>Analytics partners</strong> — aggregated and anonymized data from analytics
                tools to understand how users interact with our site.
              </li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>
                <strong>Provide and operate</strong> our services, including displaying and
                delivering prompts.
              </li>
              <li>
                <strong>Process transactions</strong> and send related information such as purchase
                confirmations and invoices.
              </li>
              <li>
                <strong>Manage your account</strong> and authenticate your identity.
              </li>
              <li>
                <strong>Personalize your experience</strong> by recommending relevant content.
              </li>
              <li>
                <strong>Communicate with you</strong> — respond to inquiries, send service-related
                notices, and (with your consent) send promotional emails.
              </li>
              <li>
                <strong>Improve our platform</strong> through analysis of usage trends and
                feedback.
              </li>
              <li>
                <strong>Ensure security</strong> — detect fraud, prevent abuse, and enforce our
                Terms of Service.
              </li>
              <li>
                <strong>Comply with legal obligations</strong> when required by applicable law.
              </li>
            </ul>

            <h2>4. Cookies and Tracking Technologies</h2>
            <p>We use the following types of cookies:</p>
            <div className={LEGAL_TABLE_CONTAINER_CLASS}>
              <table className={LEGAL_TABLE_CLASS}>
                <thead className={LEGAL_TABLE_HEAD_CLASS}>
                  <tr className={LEGAL_TABLE_HEAD_ROW_CLASS}>
                    <th className={LEGAL_TABLE_HEADER_CELL_CLASS}>Cookie Type</th>
                    <th className={LEGAL_TABLE_HEADER_CELL_CLASS}>Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={LEGAL_TABLE_ROW_CLASS}>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      <strong>Essential</strong>
                    </td>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      Required for core site functionality such as login sessions
                    </td>
                  </tr>
                  <tr className={LEGAL_TABLE_ROW_CLASS}>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      <strong>Analytics</strong>
                    </td>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      Help us understand how visitors interact with our site
                    </td>
                  </tr>
                  <tr className={LEGAL_TABLE_ROW_CLASS}>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      <strong>Preference</strong>
                    </td>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      Remember your settings and customizations
                    </td>
                  </tr>
                  <tr className={LEGAL_TABLE_ROW_CLASS}>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      <strong>Marketing</strong>
                    </td>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      Deliver relevant content and measure campaign effectiveness
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              You may control cookies through your browser settings. Note that disabling certain
              cookies may affect site functionality. We honor browser-based Do Not Track signals
              where technically feasible.
            </p>

            <h2>5. Sharing Your Information</h2>
            <p>We do not sell your personal information. We may share your data with:</p>
            <ul>
              <li>
                <strong>Service providers</strong> — third-party vendors who assist us in operating
                the website, processing payments, sending emails, or analyzing data. These parties
                are contractually bound to handle your data securely and only for the purposes we
                specify.
              </li>
              <li>
                <strong>Business transfers</strong> — in the event of a merger, acquisition, or
                sale of assets, your information may be transferred as part of that transaction. We
                will notify you before your data becomes subject to a different privacy policy.
              </li>
              <li>
                <strong>Legal requirements</strong> — when required by law, regulation, legal
                process, or governmental request, or to protect the rights, safety, or property of
                GeminiPrompts.io, our users, or others.
              </li>
              <li>
                <strong>With your consent</strong> — in any other circumstances where you have
                explicitly authorized the sharing.
              </li>
            </ul>

            <h2>6. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as
              needed to provide services, comply with legal obligations, resolve disputes, and
              enforce agreements. When you delete your account, we will delete or anonymize your
              data within <strong>30 days</strong>, except where retention is required by law.
            </p>

            <h2>7. Your Rights and Choices</h2>
            <p>
              Depending on your location, you may have the following rights regarding your personal
              data:
            </p>
            <ul>
              <li>
                <strong>Access</strong> — request a copy of the personal information we hold about
                you.
              </li>
              <li>
                <strong>Correction</strong> — request correction of inaccurate or incomplete data.
              </li>
              <li>
                <strong>Deletion</strong> — request deletion of your personal data (&quot;right to
                be forgotten&quot;).
              </li>
              <li>
                <strong>Portability</strong> — request your data in a structured, machine-readable
                format.
              </li>
              <li>
                <strong>Objection</strong> — object to processing of your data for direct marketing
                purposes.
              </li>
              <li>
                <strong>Restriction</strong> — request that we limit how we process your data in
                certain circumstances.
              </li>
              <li>
                <strong>Withdraw consent</strong> — where processing is based on your consent, you
                may withdraw it at any time without affecting the lawfulness of prior processing.
              </li>
            </ul>
            <p>
              To exercise any of these rights, please contact us at{' '}
              <a href="mailto:help@geminiprompts.io">help@geminiprompts.io</a>. We will respond
              within <strong>30 days</strong>.
            </p>

            <h2>8. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your information,
              including:
            </p>
            <ul>
              <li>HTTPS/TLS encryption for all data in transit.</li>
              <li>Encrypted storage of sensitive data at rest.</li>
              <li>Access controls limiting who within our team can access personal data.</li>
              <li>Regular security reviews and monitoring.</li>
            </ul>
            <p>
              No method of transmission over the internet is 100% secure. While we strive to use
              commercially acceptable means to protect your information, we cannot guarantee absolute
              security.
            </p>

            <h2>9. Children&apos;s Privacy</h2>
            <p>
              GeminiPrompts.io is not directed to individuals under the age of <strong>13</strong>{' '}
              (or <strong>16</strong> in the European Economic Area). We do not knowingly collect
              personal information from children. If you believe a child has provided us with
              personal data, please contact us immediately at{' '}
              <a href="mailto:help@geminiprompts.io">help@geminiprompts.io</a> and we will take
              steps to delete such information.
            </p>

            <h2>10. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own.
              Where such transfers occur, we ensure appropriate safeguards are in place in
              accordance with applicable data protection laws (such as Standard Contractual Clauses
              for transfers from the EEA).
            </p>

            <h2>11. Third-Party Links and Services</h2>
            <p>
              Our website may contain links to third-party websites or services. We are not
              responsible for the privacy practices of those sites and encourage you to review their
              respective privacy policies before providing any personal information.
            </p>

            <h2>12. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our
              practices or for legal, operational, or regulatory reasons. When we do, we will
              revise the &quot;Last Updated&quot; date at the top of this page and, where
              appropriate, notify you by email or by a prominent notice on our website. Your
              continued use of the site after changes take effect constitutes acceptance of the
              updated policy.
            </p>

            <h2>13. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our
              data practices, please contact us:
            </p>
            <p>
              <strong>GeminiPrompts.io</strong>
              <br />
              Email: <a href="mailto:help@geminiprompts.io">help@geminiprompts.io</a>
              <br />
              Website: <a href="https://geminiprompts.io">geminiprompts.io</a>
            </p>
            <p>We aim to respond to all inquiries within <strong>5 business days</strong>.</p>
            <p>
              <em>This Privacy Policy was last reviewed and updated on March 29, 2026.</em>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
