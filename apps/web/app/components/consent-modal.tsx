'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  CONSENT_COOKIE_NAME,
  CONSENT_MODAL_OPEN_EVENT,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  type ConsentRecord,
  parseConsentRecord,
} from '../../lib/consent';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function readStoredConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseConsentRecord(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

function persistConsent(record: ConsentRecord) {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(record);
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, serialized);
  } catch {
    // Ignore storage write errors and still keep cookie fallback below.
  }
  document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(serialized)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

type PreferenceRowProps = {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  optional?: boolean;
  onToggle?: () => void;
};

function PreferenceRow({
  label,
  description,
  checked,
  disabled = false,
  optional = false,
  onToggle,
}: PreferenceRowProps) {
  const toggleClasses = checked
    ? 'border-transparent bg-[#d5ea52] text-[#0f1116]'
    : 'border-white/40 bg-transparent text-white';

  return (
    <div className="py-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onToggle}
        className={`flex w-full items-start gap-2.5 text-left ${disabled ? 'cursor-not-allowed opacity-80' : ''}`}
      >
        <span
          className={`mt-[1px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[0.82rem] transition-colors ${toggleClasses}`}
          aria-hidden="true"
        >
          {checked ? '✓' : ''}
        </span>
        <span className="min-w-0">
          <span className="block text-[0.92rem] font-medium tracking-[0.01em] text-white">
            {label}
            {optional ? <span className="ml-2 text-[0.74rem] font-normal text-white/55">Optional</span> : null}
          </span>
          <span className="mt-0.5 block text-[0.78rem] leading-[1.45] text-white/70">{description}</span>
        </span>
      </button>
    </div>
  );
}

export function ConsentModal() {
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [hasPriorConsent, setHasPriorConsent] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = readStoredConsent();
    if (saved && saved.version === CONSENT_VERSION && saved.legalAccepted) {
      setHasPriorConsent(true);
      setLegalAccepted(true);
      setFunctional(saved.functional);
      setMarketing(saved.marketing);
      setOpen(false);
    } else {
      if (saved) {
        setFunctional(saved.functional);
        setMarketing(saved.marketing);
      }
      setOpen(true);
    }

    const handleOpenEvent = () => {
      const latest = readStoredConsent();
      setHasPriorConsent(Boolean(latest?.legalAccepted));
      setLegalAccepted(latest?.legalAccepted ?? false);
      setFunctional(latest?.functional ?? false);
      setMarketing(latest?.marketing ?? false);
      setError(null);
      setOpen(true);
    };

    window.addEventListener(CONSENT_MODAL_OPEN_EVENT, handleOpenEvent);
    setHydrated(true);

    return () => {
      window.removeEventListener(CONSENT_MODAL_OPEN_EVENT, handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const previousOverflow = document.body.style.overflow;
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [hydrated, open]);

  if (!hydrated || !open) return null;

  const saveConsent = (nextFunctional: boolean, nextMarketing: boolean) => {
    if (!legalAccepted) {
      setError('Please accept the policies and fair-use notice to continue.');
      return;
    }

    const record: ConsentRecord = {
      version: CONSENT_VERSION,
      acceptedAt: new Date().toISOString(),
      legalAccepted: true,
      functional: nextFunctional,
      marketing: nextMarketing,
    };

    persistConsent(record);
    setHasPriorConsent(true);
    setError(null);
    setOpen(false);
    window.dispatchEvent(new CustomEvent('gp:consent-updated', { detail: record }));
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/70 p-3 backdrop-blur-[2px] sm:items-center sm:p-5">
      <div className="no-scrollbar w-full max-w-[560px] max-h-[88vh] overflow-y-auto rounded-[24px] border border-white/15 bg-[#050914] px-5 py-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.45)] sm:px-7 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-[1.55rem] leading-[1.1] tracking-[-0.02em] text-white sm:text-[1.85rem]">
            Consent & Cookies
          </h2>
          {hasPriorConsent ? (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white/85 transition-colors hover:border-[#d5ea52] hover:text-[#d5ea52]"
              aria-label="Close consent preferences"
            >
              ×
            </button>
          ) : null}
        </div>

        <p className="mt-3 text-[0.92rem] leading-[1.75] text-white/80">
          We use cookies to keep Gemini Prompts reliable, personalize experience, and improve
          analytics. By continuing, you accept our policies and confirm prompts on this platform are
          provided for fair use only.
        </p>

        <p className="mt-3 text-[0.8rem] leading-[1.7] text-white/70">
          By checking legal acceptance, you agree to our{' '}
          <Link href="/terms" className="text-[#d5ea52] underline underline-offset-4">
            Terms & Conditions
          </Link>
          ,{' '}
          <Link href="/privacy-policy" className="text-[#d5ea52] underline underline-offset-4">
            Privacy Policy
          </Link>
          ,{' '}
          <Link href="/privacy-policy" className="text-[#d5ea52] underline underline-offset-4">
            Cookies Policy
          </Link>
          , and{' '}
          <Link href="/disclaimer" className="text-[#d5ea52] underline underline-offset-4">
            other site policies
          </Link>
          .
        </p>

        <div className="mt-4 divide-y divide-white/12 rounded-[16px] border border-white/12 bg-white/[0.03] px-3.5 py-1.5">
          <PreferenceRow
            label="Essential"
            description="Required for login, security, and core site functionality."
            checked
            disabled
          />
          <PreferenceRow
            label="Functional"
            description="Remembers settings and improves usability."
            checked={functional}
            optional
            onToggle={() => setFunctional((value) => !value)}
          />
          <PreferenceRow
            label="Marketing"
            description="Helps us measure campaigns and optimize growth."
            checked={marketing}
            optional
            onToggle={() => setMarketing((value) => !value)}
          />

          <div className="py-2.5">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={legalAccepted}
                onChange={(event) => setLegalAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/40 bg-transparent text-[#d5ea52] accent-[#d5ea52]"
              />
              <span>
                <span className="block text-[0.92rem] font-medium text-white">Legal acceptance</span>
                <span className="mt-0.5 block text-[0.78rem] leading-[1.45] text-white/70">
                  Required to continue using the site and access prompt content.
                </span>
              </span>
            </label>
          </div>
        </div>

        {showDetails ? (
          <div className="mt-3 rounded-[14px] border border-white/12 bg-white/[0.02] p-3 text-[0.79rem] leading-[1.65] text-white/70">
            <p>
              Essential data is always active for security and account access. Functional and
              marketing preferences can be updated anytime from footer “Manage consent”.
            </p>
            <p className="mt-2">
              If policies are updated, we may ask you to review consent again with the new policy
              version.
            </p>
          </div>
        ) : null}

        {error ? <p className="mt-3 text-[0.82rem] text-[#ff9c7d]">{error}</p> : null}

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => saveConsent(functional, marketing)}
            className="rounded-full bg-[#d5ea52] px-5 py-3 text-[0.9rem] font-medium tracking-[0.02em] text-[#0f1116] transition hover:bg-[#c6dd34]"
          >
            Accept selected
          </button>
          <button
            type="button"
            onClick={() => saveConsent(false, false)}
            className="rounded-full border border-white/35 px-5 py-3 text-[0.9rem] font-medium tracking-[0.02em] text-white transition hover:border-[#d5ea52] hover:text-[#d5ea52]"
          >
            Reject optional
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails((value) => !value)}
          className="mt-3 inline-flex items-center gap-2 text-[0.82rem] font-medium uppercase tracking-[0.07em] text-white/75 transition hover:text-[#d5ea52]"
        >
          <span aria-hidden="true" className="text-[1rem]">
            {showDetails ? '−' : '+'}
          </span>
          {showDetails ? 'Hide details' : 'Show details'}
        </button>
      </div>
    </div>
  );
}
