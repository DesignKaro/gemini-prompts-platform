'use client';

import { useMemo, useState } from 'react';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

type ContactMessageFormProps = {
  source?: string;
  pagePath?: string;
};

type ContactFormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

function defaultApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  return raw ? raw.replace(/\/$/, '') : 'http://localhost:4000';
}

const INITIAL_FORM_STATE: ContactFormState = {
  name: '',
  email: '',
  subject: 'Support',
  message: '',
};

export function ContactMessageForm({ source = 'contact_page', pagePath }: ContactMessageFormProps) {
  const [formState, setFormState] = useState<ContactFormState>(INITIAL_FORM_STATE);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('Message submitted successfully.');

  const apiBaseUrl = useMemo(() => defaultApiBaseUrl(), []);
  const isSubmitting = submitState === 'submitting';

  const setField = (field: keyof ContactFormState, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }));
    if (submitState !== 'idle') {
      setSubmitState('idle');
    }
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const name = formState.name.trim();
    const email = formState.email.trim().toLowerCase();
    const subject = formState.subject.trim();
    const message = formState.message.trim();

    if (!name || !email || !subject || !message) {
      setSubmitState('error');
      setErrorMessage('All fields are required.');
      return;
    }

    setSubmitState('submitting');
    setErrorMessage('');

    try {
      const payload = {
        name,
        email,
        subject,
        message,
        source: source.trim(),
        pagePath:
          pagePath?.trim() ||
          (typeof window !== 'undefined' ? window.location.pathname || undefined : undefined),
      };

      const response = await fetch(`${apiBaseUrl}/api/public/contact/submissions`, {
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
              : 'Unable to submit your message right now.';

        throw new Error(apiMessage);
      }

      const apiSuccessMessage =
        body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
          ? body.message
          : 'Message submitted successfully. We will get back to you soon.';

      setFormState(INITIAL_FORM_STATE);
      setSuccessMessage(apiSuccessMessage);
      setSubmitState('success');
    } catch (error) {
      setSubmitState('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to submit your message right now.',
      );
    }
  };

  return (
    <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[0.92rem] text-[#4b525e]">Name</span>
          <input
            type="text"
            name="name"
            placeholder="Your name"
            value={formState.name}
            onChange={(event) => setField('name', event.target.value)}
            className="mt-2 h-[48px] w-full rounded-[14px] border border-[#d8dce2] bg-white px-4 text-[1rem] text-[#101418] outline-none transition focus:border-[#101010]"
            disabled={isSubmitting}
            required
          />
        </label>
        <label className="block">
          <span className="text-[0.92rem] text-[#4b525e]">Email</span>
          <input
            type="email"
            name="email"
            placeholder="you@company.com"
            value={formState.email}
            onChange={(event) => setField('email', event.target.value)}
            className="mt-2 h-[48px] w-full rounded-[14px] border border-[#d8dce2] bg-white px-4 text-[1rem] text-[#101418] outline-none transition focus:border-[#101010]"
            disabled={isSubmitting}
            required
          />
        </label>
      </div>

      <label className="block">
        <span className="text-[0.92rem] text-[#4b525e]">Subject</span>
        <select
          name="subject"
          value={formState.subject}
          onChange={(event) => setField('subject', event.target.value)}
          className="mt-2 h-[48px] w-full rounded-[14px] border border-[#d8dce2] bg-white px-4 text-[1rem] text-[#101418] outline-none transition focus:border-[#101010]"
          disabled={isSubmitting}
          required
        >
          <option value="Support">Support</option>
          <option value="Feedback">Feedback</option>
          <option value="Partnership">Partnership</option>
          <option value="Billing">Billing</option>
        </select>
      </label>

      <label className="block">
        <span className="text-[0.92rem] text-[#4b525e]">Message</span>
        <textarea
          name="message"
          rows={6}
          placeholder="Tell us what you need…"
          value={formState.message}
          onChange={(event) => setField('message', event.target.value)}
          className="mt-2 w-full rounded-[14px] border border-[#d8dce2] bg-white px-4 py-3 text-[1rem] text-[#101418] outline-none transition focus:border-[#101010]"
          disabled={isSubmitting}
          required
        />
      </label>

      <button
        type="submit"
        className="h-[50px] w-full rounded-full bg-[#111111] px-6 text-[1rem] text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? 'Sending...' : 'Send message'}
      </button>

      {submitState === 'success' ? (
        <p className="text-[0.88rem] leading-[1.6] text-emerald-700" role="status">
          {successMessage}
        </p>
      ) : null}

      {submitState === 'error' && errorMessage ? (
        <p className="text-[0.88rem] leading-[1.6] text-rose-700" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <p className="text-[0.9rem] leading-[1.6] text-[#6a7280]">
        Prefer email? Reach us at{' '}
        <a className="text-[#111118] underline underline-offset-4" href="mailto:hello@immihub.com">
          hello@immihub.com
        </a>
        .
      </p>
    </form>
  );
}
