'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type BillingCycle = 'monthly' | 'yearly';

const PREMIUM_PRICING = {
  monthlyUsd: 12,
  yearlyUsd: 99,
};

function formatUsd(value: number) {
  return `$${value}`;
}

function calcAnnualDiscountPct(monthlyUsd: number, yearlyUsd: number) {
  const baseline = monthlyUsd * 12;
  if (baseline <= 0) return 0;
  return Math.max(0, Math.round((1 - yearlyUsd / baseline) * 100));
}

const CHECK = (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
    <path
      d="M6 12.3l3.3 3.2L18.5 6.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function MembershipPricing() {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const discountPct = useMemo(
    () => calcAnnualDiscountPct(PREMIUM_PRICING.monthlyUsd, PREMIUM_PRICING.yearlyUsd),
    [],
  );

  const premiumPriceLabel =
    cycle === 'monthly'
      ? `${formatUsd(PREMIUM_PRICING.monthlyUsd)}`
      : `${formatUsd(PREMIUM_PRICING.yearlyUsd)}`;
  const premiumSuffix = cycle === 'monthly' ? '/month' : '/year';
  const premiumSubcopy =
    cycle === 'monthly'
      ? 'Billed monthly. Cancel anytime.'
      : `Billed annually. Save ${discountPct}% vs monthly.`;

  return (
    <section className="rounded-[28px] border border-[#e6e9f2] bg-[#d5ea52] p-4 sm:p-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="inline-flex rounded-full bg-black px-4 py-2 text-[0.9rem] text-white backdrop-blur">
            Pricing
          </p>
          <h2 className="section-heading-medium mt-4 text-[1.65rem] leading-[1.08] tracking-[-0.05em] text-black sm:text-[2.25rem] lg:text-[2.65rem]">
            Simple plans that scale with you.
          </h2>
          <p className="mt-4 max-w-[42rem] text-[1.02rem] leading-[1.7] text-black">
            Start free, then unlock members-only prompts, packs, and workflows when you’re ready.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-[#d8dce2] bg-white p-1">
            <button
              type="button"
              onClick={() => setCycle('monthly')}
              className={`h-10 rounded-full px-4 text-[0.9rem] font-medium transition-colors ${
                cycle === 'monthly'
                  ? 'bg-[#111111] text-white'
                  : 'text-[#4b525e] hover:text-[#101010]'
              }`}
              aria-pressed={cycle === 'monthly'}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycle('yearly')}
              className={`flex h-10 items-center gap-2 rounded-full px-4 text-[0.9rem] font-medium transition-colors ${
                cycle === 'yearly'
                  ? 'bg-[#111111] text-white'
                  : 'text-[#4b525e] hover:text-[#101010]'
              }`}
              aria-pressed={cycle === 'yearly'}
            >
              Yearly
              <span
                className={`rounded-full px-2 py-0.5 text-[0.78rem] ${
                  cycle === 'yearly' ? 'bg-white/15 text-white' : 'bg-[#d5ea52] text-[#101418]'
                }`}
              >
                Save {discountPct}%
              </span>
            </button>
          </div>
          <span className="text-[0.9rem] text-[#6b7280]">Prices in USD</span>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:mt-10 sm:gap-6 lg:grid-cols-2">
        {/* Free */}
        <div className="rounded-[26px] border border-[#e6e9f2] bg-white p-5 sm:p-6 shadow-[0_18px_60px_rgba(16,24,40,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.9rem] font-medium text-[#6b7280]">Free</p>
              <p className="mt-2 text-[1.15rem] font-medium tracking-[-0.02em] text-[#0b0f18] sm:text-[1.3rem]">
                Explore the library
              </p>
              <p className="mt-2 max-w-[28rem] text-[0.98rem] leading-[1.65] text-[#5f6773]">
                Browse public prompts and posts. Great for getting value immediately.
              </p>
            </div>
            <div className="text-right">
              <p className="text-[2.2rem] font-medium leading-none tracking-[-0.04em] text-[#0b0f18]">
                {formatUsd(0)}
              </p>
              <p className="mt-2 text-[0.9rem] text-[#6b7280]">Forever</p>
            </div>
          </div>

          <ul className="mt-5 space-y-2.5 text-[0.95rem] text-[#3f4550] sm:mt-6 sm:space-y-3 sm:text-[0.98rem]">
            {[
              'Access public prompts and blog posts',
              'Save prompts (when signed in)',
              'Weekly newsletter archive',
              'Community submissions',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 text-[#111111]">{CHECK}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/latest"
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#111111] px-5 text-[0.95rem] text-white transition-colors hover:bg-black sm:w-auto"
            >
              Browse prompts
            </Link>
            <Link
              href="/blog"
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-[#d8dce2] bg-white px-5 text-[0.95rem] text-[#101010] transition-colors hover:border-[#101010] sm:w-auto"
            >
              Read blog
            </Link>
          </div>
        </div>

        {/* Premium */}
        <div className="relative overflow-hidden rounded-[26px] border border-[#111111] bg-[#0b0f18] p-5 sm:p-6 text-white shadow-[0_24px_70px_rgba(16,24,40,0.16)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-[120px] -top-[160px] h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle_at_center,rgba(213,234,82,0.35)_0%,rgba(213,234,82,0)_62%)] blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[180px] -left-[160px] h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.22)_0%,rgba(59,130,246,0)_62%)] blur-3xl"
          />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[0.9rem] font-medium text-white/70">Premium</p>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[0.78rem] text-white/90">
                  Most popular
                </span>
              </div>
              <p className="mt-2 text-[1.15rem] font-medium tracking-[-0.02em] text-white sm:text-[1.3rem]">
                Unlock everything
              </p>
              <p className="mt-2 max-w-[28rem] text-[0.98rem] leading-[1.65] text-white/72">
                Members-only prompts, premium packs, and faster workflows — built for creators and
                teams.
              </p>
            </div>
            <div className="text-right">
              <p className="text-[2.2rem] font-medium leading-none tracking-[-0.04em] text-white">
                {premiumPriceLabel}
              </p>
              <p className="mt-2 text-[0.9rem] text-white/70">{premiumSuffix}</p>
            </div>
          </div>

          <p className="relative mt-5 text-[0.92rem] text-white/70">{premiumSubcopy}</p>

          <ul className="relative mt-5 space-y-2.5 text-[0.95rem] text-white/88 sm:mt-6 sm:space-y-3 sm:text-[0.98rem]">
            {[
              'Access members-only (exclusive) prompts and posts',
              'Premium prompt packs + templates',
              'Early access to weekly drops',
              'Priority support and requests',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 text-[#d5ea52]">{CHECK}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="relative mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/contact"
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#d5ea52] px-5 text-[0.95rem] font-medium text-[#101418] transition-colors hover:bg-[#cbe246] sm:w-auto"
            >
              Join Premium
            </Link>
            <Link
              href="/exclusive"
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 text-[0.95rem] text-white transition-colors hover:bg-white/15 sm:w-auto"
            >
              Preview exclusives
            </Link>
          </div>

          <p className="relative mt-5 text-[0.85rem] text-white/55">
            Tip: teams and multi-seat access available on request.
          </p>
        </div>
      </div>
    </section>
  );
}
