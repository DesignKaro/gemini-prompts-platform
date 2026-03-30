'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  getMembershipSummary,
  MembershipManagementError,
  type MembershipSummaryResponse,
} from '../../../lib/membership-management';
import { redirectToSignInModal } from '../../../lib/utils/auth-redirect';
import { refreshSession } from '../../../lib/utils/session';

function isAccessTokenExpired(expiresAt?: string | null) {
  if (!expiresAt) return false;
  const expiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtMs)) return false;
  return expiresAtMs <= Date.now() + 60_000;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function getStatusBadge(status: MembershipSummaryResponse['membership']['status']) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-[#e9f7ed] text-[#20633a] border-[#cde9d7]';
    case 'PAST_DUE':
      return 'bg-[#fff7e8] text-[#8b5a16] border-[#f4dfbf]';
    case 'CANCELED':
      return 'bg-[#f4f5f7] text-[#4c5564] border-[#dde2e8]';
    case 'EXPIRED':
      return 'bg-[#fff1f1] text-[#9b2c2c] border-[#f3d2d2]';
    default:
      return 'bg-[#f5f7fa] text-[#475063] border-[#e1e6ee]';
  }
}

function formatCycle(cycle: MembershipSummaryResponse['membership']['cycle']) {
  if (cycle === 'monthly') return 'Monthly';
  if (cycle === 'yearly') return 'Yearly';
  return '—';
}

type BillingHistoryRow = MembershipSummaryResponse['billingHistory'][number];

function isInvoiceEligible(status: string) {
  return status.toUpperCase().startsWith('PAID_');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildInvoiceHtml(input: {
  row: BillingHistoryRow;
  email: string;
  accountId: string;
  membershipStatus: MembershipSummaryResponse['membership']['status'];
}) {
  const invoiceDate = formatDate(input.row.createdAt);
  const amountLabel = formatCurrency(input.row.amount, input.row.currency);
  const invoiceNumber = `GP-${input.row.id.slice(0, 8).toUpperCase()}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Invoice ${invoiceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 32px; color: #0f172a; }
    .card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; }
    .title { font-size: 24px; margin: 0 0 6px; }
    .muted { color: #64748b; margin: 0; }
    .grid { display: grid; grid-template-columns: 180px 1fr; gap: 8px 12px; margin-top: 18px; }
    .label { color: #64748b; }
    .value { color: #0f172a; }
    .footer { margin-top: 22px; color: #64748b; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <h1 class="title">Invoice ${escapeHtml(invoiceNumber)}</h1>
    <p class="muted">Gemini Prompts membership payment receipt</p>
    <div class="grid">
      <div class="label">Date</div><div class="value">${escapeHtml(invoiceDate)}</div>
      <div class="label">Amount</div><div class="value">${escapeHtml(amountLabel)}</div>
      <div class="label">Status</div><div class="value">${escapeHtml(input.row.status)}</div>
      <div class="label">Provider</div><div class="value">${escapeHtml(input.row.provider)}</div>
      <div class="label">Account email</div><div class="value">${escapeHtml(input.email)}</div>
      <div class="label">Account ID</div><div class="value">${escapeHtml(input.accountId)}</div>
      <div class="label">Membership status</div><div class="value">${escapeHtml(input.membershipStatus)}</div>
      <div class="label">Transaction ID</div><div class="value">${escapeHtml(input.row.id)}</div>
    </div>
    <p class="footer">This invoice was generated from your membership billing history.</p>
  </div>
</body>
</html>`;
}

function downloadInvoice(input: {
  row: BillingHistoryRow;
  email: string;
  accountId: string;
  membershipStatus: MembershipSummaryResponse['membership']['status'];
}) {
  const html = buildInvoiceHtml(input);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const dateToken = input.row.createdAt.slice(0, 10) || 'invoice';
  const link = document.createElement('a');
  link.href = url;
  link.download = `invoice-${input.row.id.slice(0, 8)}-${dateToken}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function MembershipManageClient() {
  const { data: session, status: sessionStatus, update } = useSession();
  const [summary, setSummary] = useState<MembershipSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAccessToken = useCallback(async () => {
    const currentToken = session?.apiAccessToken ?? null;
    if (currentToken && !isAccessTokenExpired(session?.apiAccessTokenExpiresAt)) {
      return currentToken;
    }

    const refreshed = await refreshSession(update).catch(() => null);
    return refreshed?.apiAccessToken ?? null;
  }, [session?.apiAccessToken, session?.apiAccessTokenExpiresAt, update]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      redirectToSignInModal('/membership/manage');
      return;
    }

    if (sessionStatus !== 'authenticated') {
      return;
    }

    let isActive = true;
    setLoading(true);
    setError(null);

    const loadMembershipSummary = async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          redirectToSignInModal('/membership/manage');
          return;
        }

        const payload = await getMembershipSummary(accessToken);
        if (!isActive) return;
        setSummary(payload);

        if (
          payload.user.plan === 'PREMIUM' &&
          payload.membership.status === 'ACTIVE' &&
          session?.user?.plan !== 'PREMIUM'
        ) {
          await refreshSession(update, { force: true }).catch(() => null);
        }
      } catch (loadError) {
        if (!isActive) return;
        if (loadError instanceof MembershipManagementError && loadError.status === 401) {
          redirectToSignInModal('/membership/manage');
          return;
        }
        setError(
          loadError instanceof Error ? loadError.message : 'Unable to load membership details.',
        );
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadMembershipSummary();

    return () => {
      isActive = false;
    };
  }, [getAccessToken, session?.user?.plan, sessionStatus, update]);

  const isPremiumActive = summary?.membership.status === 'ACTIVE' && summary.user.plan === 'PREMIUM';
  const primaryActionHref = isPremiumActive ? '/exclusive' : '/membership';
  const primaryActionLabel = isPremiumActive ? 'Browse Exclusive Content' : 'Upgrade to Premium';

  const historyRows = useMemo(() => summary?.billingHistory.slice(0, 8) ?? [], [summary]);

  return (
    <section className="page-shell-tight bg-white">
      <div className="page-container-narrow">
        <div className="rounded-[28px] border border-[#e5e9f1] bg-[#f7f9fc] p-6 sm:p-8">
          <p className="inline-flex rounded-full bg-[#d5ea52] px-3 py-1 text-[0.76rem] uppercase tracking-[0.12em] text-black">
            Account
          </p>
          <h1 className="mt-4 text-[1.85rem] leading-[1.06] tracking-[-0.04em] text-[#111827] sm:text-[2.5rem]">
            Membership management
          </h1>
          <p className="mt-3 max-w-[40rem] text-[0.96rem] leading-[1.7] text-[#5d6677]">
            Review your current plan, access window, and recent payment history.
          </p>
        </div>

        {loading ? (
          <div className="mt-6 rounded-[24px] border border-[#e6e9f2] bg-white p-6 text-[0.95rem] text-[#636b7b]">
            Loading membership details...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="mt-6 rounded-[24px] border border-[#f0d6d6] bg-[#fff6f6] p-6 text-[0.95rem] text-[#8f2f2f]">
            {error}
          </div>
        ) : null}

        {!loading && !error && summary ? (
          <>
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-[24px] border border-[#e6e9f2] bg-white p-6">
                <p className="text-[0.84rem] uppercase tracking-[0.08em] text-[#8a93a3]">Current plan</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="text-[1.45rem] leading-none text-[#0f172a]">
                    {summary.user.plan === 'PREMIUM' ? 'Premium' : 'Free'}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-[0.78rem] font-medium ${getStatusBadge(summary.membership.status)}`}
                  >
                    {summary.membership.status}
                  </span>
                </div>

                <dl className="mt-5 space-y-2.5 text-[0.9rem]">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[#6a7282]">Billing cycle</dt>
                    <dd className="text-[#101625]">{formatCycle(summary.membership.cycle)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[#6a7282]">Provider</dt>
                    <dd className="text-[#101625]">{summary.membership.provider || '—'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[#6a7282]">Auto-renew</dt>
                    <dd className="text-[#101625]">
                      {summary.membership.willAutoRenew ? 'Enabled' : 'Disabled'}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={primaryActionHref}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#d5ea52] px-5 text-[0.92rem] font-medium text-black transition-colors hover:bg-[#c5db42]"
                  >
                    {primaryActionLabel}
                  </Link>
                  <Link
                    href="/membership"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#d4dae5] bg-white px-5 text-[0.92rem] font-medium text-[#111827] transition-colors hover:border-[#111827]"
                  >
                    View plans
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#e6e9f2] bg-white p-6">
                <p className="text-[0.84rem] uppercase tracking-[0.08em] text-[#8a93a3]">Access window</p>
                <dl className="mt-4 space-y-3 text-[0.92rem]">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[#6a7282]">Started</dt>
                    <dd className="text-[#111827]">{formatDate(summary.membership.startAt)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[#6a7282]">Valid until</dt>
                    <dd className="text-[#111827]">{formatDate(summary.membership.endAt)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[#6a7282]">Canceled at</dt>
                    <dd className="text-[#111827]">{formatDate(summary.membership.canceledAt)}</dd>
                  </div>
                </dl>

                <div className="mt-6 rounded-[16px] border border-[#e9edf5] bg-[#f8fafd] p-4 text-[0.88rem] leading-[1.7] text-[#5f697b]">
                  Membership purchases are one-time payments right now. Auto-renew is disabled by
                  default, and you can repurchase anytime from the plans page.
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-[#e6e9f2] bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[1.2rem] tracking-[-0.02em] text-[#111827]">Billing history</h2>
                <span className="text-[0.82rem] text-[#7b8496]">
                  {historyRows.length} recent payment{historyRows.length === 1 ? '' : 's'}
                </span>
              </div>

              {historyRows.length === 0 ? (
                <p className="mt-4 rounded-[14px] border border-dashed border-[#d9dee8] bg-[#fafbfd] px-4 py-3 text-[0.9rem] text-[#646d7f]">
                  No membership payments found yet.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-[14px] border border-[#edf0f5]">
                  <table className="min-w-full divide-y divide-[#edf0f5] text-left text-[0.88rem]">
                    <thead className="bg-[#f8fafd] text-[#677185]">
                      <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Provider</th>
                        <th className="px-4 py-3 font-medium">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf0f5]">
                      {historyRows.map((row) => (
                        <tr key={row.id} className="bg-white text-[#111827]">
                          <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
                          <td className="px-4 py-3">
                            {formatCurrency(row.amount, row.currency)}
                          </td>
                          <td className="px-4 py-3">{row.status}</td>
                          <td className="px-4 py-3">{row.provider}</td>
                          <td className="px-4 py-3">
                            {isInvoiceEligible(row.status) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  downloadInvoice({
                                    row,
                                    email: summary.user.email,
                                    accountId: summary.user.id,
                                    membershipStatus: summary.membership.status,
                                  })
                                }
                                className="inline-flex h-8 items-center justify-center rounded-full border border-[#d5dbe5] bg-white px-3 text-[0.8rem] font-medium text-[#111827] transition-colors hover:border-[#111827]"
                              >
                                Download
                              </button>
                            ) : (
                              <span className="text-[0.8rem] text-[#8a93a3]">Unavailable</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
