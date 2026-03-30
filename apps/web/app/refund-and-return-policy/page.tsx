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
    title: 'Refund and Return Policy',
    description:
      'Read the full GeminiPrompts.io Refund Policy including eligibility, timelines, subscriptions, and dispute handling.',
    path: '/refund-and-return-policy',
    noIndex: settings.noindexStaticPages,
  });
}

export default async function RefundAndReturnPolicyPage() {
  const settings = await getSeoSettings();
  const baseUrl = getNormalizedBaseUrl(settings);
  const pageUrl = `${baseUrl}/refund-and-return-policy`;
  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: 'Refund and Return Policy',
        description:
          'Read the full GeminiPrompts.io Refund Policy including eligibility, timelines, subscriptions, and dispute handling.',
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'Refund and Return Policy', item: pageUrl },
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
            <li className="font-medium text-[#101010]">Refund and Return Policy</li>
          </ol>
        </nav>

        <section className="mt-8 rounded-[28px] border border-[#e8edf5] bg-white p-7 sm:p-10">
          <p className="inline-flex rounded-full bg-[#d5ea52] px-4 py-2 text-[0.9rem] text-[#111111]">
            Legal
          </p>
          <h1 className="section-heading-medium mt-5 text-[2.2rem] leading-[1.02] tracking-[-0.05em] text-[#111118] sm:text-[2.9rem]">
            Refund and Return Policy
          </h1>
          <p className="mt-5 inline-flex flex-col gap-1 rounded-[14px] border border-[#e7ebf2] bg-[#f8fafc] px-4 py-3 text-[0.94rem] leading-[1.6] text-[#5f6773] [&_strong]:font-medium">
            <strong>Effective Date:</strong> March 29, 2026
            <br />
            <strong>Last Updated:</strong> March 29, 2026
          </p>

          <div className={LEGAL_CONTENT_CLASS}>
            <h2>1. Overview</h2>
            <p>
              At <strong>GeminiPrompts.io</strong>, we stand behind the quality of our prompt
              collections and strive to ensure every customer has a positive experience. This Refund
              Policy outlines the conditions under which refunds are granted, the process for
              requesting one, and what you can expect after submitting a request.
            </p>
            <p>
              By completing a purchase on GeminiPrompts.io, you acknowledge that you have read and
              agreed to this Refund Policy.
            </p>

            <h2>2. Digital Product Nature</h2>
            <p>
              Please note that all products sold on GeminiPrompts.io are <strong>digital goods</strong>{' '}
              — including prompt packs, collections, templates, and subscription plans. Due to the
              nature of digital products:
            </p>
            <ul>
              <li>Content is <strong>instantly accessible</strong> upon purchase.</li>
              <li>
                Digital files <strong>cannot be &quot;returned&quot;</strong> in the traditional
                sense once accessed or downloaded.
              </li>
              <li>
                We therefore apply a <strong>fair and considered refund policy</strong> rather than
                an automatic return policy.
              </li>
            </ul>

            <h2>3. Eligibility for a Refund</h2>
            <h3>3.1 Eligible for a Full Refund</h3>
            <ul>
              <li>
                <strong>Duplicate purchase</strong> — You were charged more than once for the same
                product due to a technical error.
              </li>
              <li>
                <strong>Product not delivered</strong> — You completed payment but did not receive
                access to the purchased content.
              </li>
              <li>
                <strong>Significantly not as described</strong> — The product materially differs
                from what was described or previewed on the product page.
              </li>
              <li>
                <strong>Technical failure</strong> — A verified platform error prevented you from
                accessing the content you paid for, and we are unable to resolve it within a
                reasonable timeframe.
              </li>
              <li>
                <strong>Unauthorized transaction</strong> — A purchase was made on your account
                without your knowledge or consent.
              </li>
            </ul>

            <h3>3.2 Eligible for a Partial Refund or Credit</h3>
            <ul>
              <li>
                <strong>Subscription cancellation mid-cycle</strong> — If you cancel a paid
                subscription partway through a billing period, you may be eligible for a prorated
                credit toward future use, at our discretion.
              </li>
              <li>
                <strong>Partial use of a bundle</strong> — If you purchased a bundle and only a
                portion of it was inaccessible or defective, we may offer a partial refund
                corresponding to the affected portion.
              </li>
            </ul>

            <h3>3.3 Not Eligible for a Refund</h3>
            <ul>
              <li>You changed your mind after accessing or downloading the content.</li>
              <li>You found a similar or free alternative after purchase.</li>
              <li>
                You did not achieve the AI output results you expected — as prompt outcomes depend
                on external AI platforms beyond our control.
              </li>
              <li>
                The refund request is submitted after the eligible refund window (see Section 4).
              </li>
              <li>
                Violation of our Terms of Service or Code of Conduct led to account suspension.
              </li>
              <li>
                Purchases made through third-party marketplaces or resellers — these are subject to
                the refund policies of those platforms.
              </li>
            </ul>

            <h2>4. Refund Request Window</h2>
            <p>
              Refund requests must be submitted within the following timeframes from the date of
              purchase:
            </p>
            <div className={LEGAL_TABLE_CONTAINER_CLASS}>
              <table className={LEGAL_TABLE_CLASS}>
                <thead className={LEGAL_TABLE_HEAD_CLASS}>
                  <tr className={LEGAL_TABLE_HEAD_ROW_CLASS}>
                    <th className={LEGAL_TABLE_HEADER_CELL_CLASS}>Product Type</th>
                    <th className={LEGAL_TABLE_HEADER_CELL_CLASS}>Refund Window</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={LEGAL_TABLE_ROW_CLASS}>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      <strong>Individual prompt packs</strong>
                    </td>
                    <td className={LEGAL_TABLE_CELL_CLASS}>7 days</td>
                  </tr>
                  <tr className={LEGAL_TABLE_ROW_CLASS}>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      <strong>Prompt bundles</strong>
                    </td>
                    <td className={LEGAL_TABLE_CELL_CLASS}>7 days</td>
                  </tr>
                  <tr className={LEGAL_TABLE_ROW_CLASS}>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      <strong>Monthly subscriptions</strong>
                    </td>
                    <td className={LEGAL_TABLE_CELL_CLASS}>5 days from billing date</td>
                  </tr>
                  <tr className={LEGAL_TABLE_ROW_CLASS}>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      <strong>Annual subscriptions</strong>
                    </td>
                    <td className={LEGAL_TABLE_CELL_CLASS}>14 days from billing date</td>
                  </tr>
                  <tr className={LEGAL_TABLE_ROW_CLASS}>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      <strong>Lifetime access purchases</strong>
                    </td>
                    <td className={LEGAL_TABLE_CELL_CLASS}>14 days</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Requests submitted outside these windows will not be eligible for a refund, except in
              cases of verified fraud or unauthorized transactions, which may be reviewed at any
              time.
            </p>

            <h2>5. How to Request a Refund</h2>
            <p>To initiate a refund request, please follow these steps:</p>
            <p>
              <strong>Step 1 — Contact Us</strong>
              <br />
              Send an email to <a href="mailto:info@geminiprompts.io">info@geminiprompts.io</a>{' '}
              with the subject line:
              <br />
              <code>Refund Request – [Your Order ID]</code>
            </p>
            <p>
              <strong>Step 2 — Provide the Following Information</strong>
            </p>
            <ul>
              <li>Full name and email address associated with your account.</li>
              <li>Order ID or transaction reference number.</li>
              <li>Product name and date of purchase.</li>
              <li>Reason for the refund request.</li>
              <li>
                Any supporting evidence (e.g., screenshots of errors or billing discrepancies).
              </li>
            </ul>
            <p>
              <strong>Step 3 — Wait for Review</strong>
              <br />
              We will acknowledge your request within <strong>2 business days</strong> and complete
              our review within <strong>5–7 business days</strong>.
            </p>
            <p>
              <strong>Step 4 — Resolution</strong>
              <br />
              If your request is approved, the refund will be processed to your original payment
              method. You will receive a confirmation email once the refund has been issued.
            </p>

            <h2>6. Refund Processing Times</h2>
            <p>
              Once a refund is approved, please allow the following timeframes for it to reflect in
              your account:
            </p>
            <div className={LEGAL_TABLE_CONTAINER_CLASS}>
              <table className={LEGAL_TABLE_CLASS}>
                <thead className={LEGAL_TABLE_HEAD_CLASS}>
                  <tr className={LEGAL_TABLE_HEAD_ROW_CLASS}>
                    <th className={LEGAL_TABLE_HEADER_CELL_CLASS}>Payment Method</th>
                    <th className={LEGAL_TABLE_HEADER_CELL_CLASS}>Processing Time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={LEGAL_TABLE_ROW_CLASS}>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      <strong>Credit / Debit Card</strong>
                    </td>
                    <td className={LEGAL_TABLE_CELL_CLASS}>5–10 business days</td>
                  </tr>
                  <tr className={LEGAL_TABLE_ROW_CLASS}>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      <strong>PayPal</strong>
                    </td>
                    <td className={LEGAL_TABLE_CELL_CLASS}>3–5 business days</td>
                  </tr>
                  <tr className={LEGAL_TABLE_ROW_CLASS}>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      <strong>UPI / Net Banking</strong>
                    </td>
                    <td className={LEGAL_TABLE_CELL_CLASS}>5–7 business days</td>
                  </tr>
                  <tr className={LEGAL_TABLE_ROW_CLASS}>
                    <td className={LEGAL_TABLE_CELL_CLASS}>
                      <strong>Store Credit</strong>
                    </td>
                    <td className={LEGAL_TABLE_CELL_CLASS}>Instant upon approval</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Processing times may vary depending on your bank or payment provider.
              GeminiPrompts.io is not responsible for delays caused by financial institutions once
              the refund has been issued from our end.
            </p>

            <h2>7. Subscription Cancellations</h2>
            <h3>7.1 How to Cancel</h3>
            <p>
              You may cancel your subscription at any time from your account dashboard under{' '}
              <strong>Settings → Billing → Cancel Subscription</strong>, or by emailing us at{' '}
              <a href="mailto:info@geminiprompts.io">info@geminiprompts.io</a>.
            </p>
            <h3>7.2 What Happens After Cancellation</h3>
            <ul>
              <li>Your subscription will remain active until the end of the current billing period.</li>
              <li>You will not be charged in the next billing cycle.</li>
              <li>Access to premium content will be revoked at the end of the paid period.</li>
              <li>
                Cancellation does not automatically trigger a refund for the current billing period
                unless it falls within the eligible refund window outlined in Section 4.
              </li>
            </ul>
            <h3>7.3 Auto-Renewal</h3>
            <p>
              All subscription plans auto-renew unless cancelled before the renewal date. We send a{' '}
              <strong>reminder email 3 days before</strong> each renewal. It is your responsibility
              to cancel prior to renewal if you do not wish to be charged.
            </p>

            <h2>8. Free Trials</h2>
            <p>If GeminiPrompts.io offers a free trial period:</p>
            <ul>
              <li>No charge will be made during the trial.</li>
              <li>
                If you do not cancel before the trial ends, your selected plan will automatically
                activate and your payment method will be charged.
              </li>
              <li>
                Charges made after a free trial has converted to a paid plan are subject to the
                standard refund window in Section 4.
              </li>
            </ul>

            <h2>9. Chargebacks and Disputes</h2>
            <p>
              We encourage you to contact us at{' '}
              <a href="mailto:info@geminiprompts.io">info@geminiprompts.io</a> before initiating a
              chargeback with your bank or payment provider. Most issues can be resolved quickly and
              directly.
            </p>
            <p>Filing a chargeback without contacting us first may result in:</p>
            <ul>
              <li>Immediate suspension of your GeminiPrompts.io account.</li>
              <li>Cancellation of access to all purchased content.</li>
              <li>Being flagged in our system for future purchases.</li>
            </ul>
            <p>
              If a chargeback is filed in error or in bad faith, we reserve the right to contest it
              with the relevant evidence.
            </p>

            <h2>10. Promotional and Discounted Purchases</h2>
            <ul>
              <li>
                Products purchased at a <strong>discounted price</strong> during a sale or with a
                promo code are still eligible for refunds under the standard terms, provided the
                request falls within the eligible window.
              </li>
              <li>
                <strong>Free products</strong> or items redeemed via promotional codes with no
                monetary value are not eligible for refunds.
              </li>
              <li>
                Refund amounts will reflect the actual amount paid, not the original list price.
              </li>
            </ul>

            <h2>11. Changes to This Refund Policy</h2>
            <p>
              We reserve the right to update or modify this Refund Policy at any time. Changes will
              be reflected by updating the &quot;Last Updated&quot; date at the top of this page.
              For significant changes, we will notify users via email or a prominent notice on the
              website. Continued use of GeminiPrompts.io following any updates constitutes your
              acceptance of the revised policy.
            </p>

            <h2>12. Contact Us</h2>
            <p>
              For any refund-related questions, concerns, or requests, please reach out to our
              support team:
            </p>
            <p>
              <strong>GeminiPrompts.io</strong>
              <br />
              Email: <a href="mailto:info@geminiprompts.io">info@geminiprompts.io</a>
              <br />
              Website: <a href="https://geminiprompts.io">geminiprompts.io</a>
            </p>
            <p>
              We aim to respond to all refund inquiries within <strong>2 business days</strong> and
              are committed to resolving every issue fairly and promptly.
            </p>
            <p>
              <em>
                We appreciate your trust in GeminiPrompts.io. Our goal is to ensure every purchase
                brings you genuine value.
              </em>
            </p>
            <p>
              <em>This Refund Policy was last reviewed and updated on March 29, 2026.</em>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
