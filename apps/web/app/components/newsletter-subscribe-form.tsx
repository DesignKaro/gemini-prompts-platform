'use client';

import { useMemo, useState } from 'react';

type NewsletterSubscribeFormProps = {
  source: string;
  inputId: string;
  pagePath?: string;
  className?: string;
  fieldGroupClassName?: string;
  inputClassName?: string;
  buttonClassName?: string;
  buttonLabel?: string;
  pendingLabel?: string;
  successClassName?: string;
  errorClassName?: string;
  successMessage?: string;
};

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

function defaultApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  return raw ? raw.replace(/\/$/, '') : 'http://localhost:4000';
}

export function NewsletterSubscribeForm({
  source,
  inputId,
  pagePath,
  className,
  fieldGroupClassName = 'flex flex-col gap-2',
  inputClassName,
  buttonClassName,
  buttonLabel = 'Subscribe',
  pendingLabel = 'Saving...',
  successClassName = 'mt-2 text-[0.8rem] text-emerald-700',
  errorClassName = 'mt-2 text-[0.8rem] text-rose-700',
  successMessage = 'Subscribed successfully. Thanks for joining.',
}: NewsletterSubscribeFormProps) {
  const [email, setEmail] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successFeedback, setSuccessFeedback] = useState(successMessage);

  const apiBaseUrl = useMemo(() => defaultApiBaseUrl(), []);
  const isSubmitting = submitState === 'submitting';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setSubmitState('error');
      setErrorMessage('Email is required.');
      return;
    }

    setSubmitState('submitting');
    setErrorMessage('');
    setSuccessFeedback(successMessage);

    try {
      const payload = {
        email: normalizedEmail,
        source: source.trim(),
        pagePath:
          pagePath?.trim() ||
          (typeof window !== 'undefined' ? window.location.pathname || undefined : undefined),
      };

      const response = await fetch(`${apiBaseUrl}/api/public/newsletter/submissions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get('content-type') ?? '';
      const maybeJson = contentType.includes('application/json');
      const body = maybeJson
        ? await response.json().catch(() => null)
        : await response.text().catch(() => null);

      if (!response.ok) {
        const apiMessage =
          body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
            ? body.message
            : typeof body === 'string' && body.trim()
              ? body.trim()
              : 'Unable to save your subscription right now.';
        throw new Error(apiMessage);
      }

      const apiSuccessMessage =
        body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
          ? body.message
          : successMessage;

      setEmail('');
      setSuccessFeedback(apiSuccessMessage);
      setSubmitState('success');
    } catch (error) {
      setSubmitState('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save your subscription right now.',
      );
    }
  };

  return (
    <form className={className} onSubmit={handleSubmit} noValidate>
      <label className="sr-only" htmlFor={inputId}>
        Email address
      </label>
      <div className={fieldGroupClassName}>
        <input
          id={inputId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (submitState !== 'idle') {
              setSubmitState('idle');
            }
            if (errorMessage) {
              setErrorMessage('');
            }
          }}
          className={
            inputClassName ??
            'h-11 w-full rounded-full border border-[#c9d8de] bg-white px-4 text-[0.9rem] text-[#0f1d21] outline-none transition focus:border-[#0f1d21]'
          }
          disabled={isSubmitting}
          required
        />
        <button
          type="submit"
          className={
            buttonClassName ??
            'inline-flex h-11 items-center justify-center rounded-full bg-[#d5ea52] px-5 text-[0.9rem] font-medium text-[#111111] transition-colors hover:bg-[#c5db42]'
          }
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? pendingLabel : buttonLabel}
        </button>
      </div>

      {submitState === 'success' ? (
        <p className={successClassName} role="status">
          {successFeedback}
        </p>
      ) : null}

      {submitState === 'error' && errorMessage ? (
        <p className={errorClassName} role="alert">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
