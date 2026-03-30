import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NewsletterSubscribeForm } from '../app/components/newsletter-subscribe-form';

describe('NewsletterSubscribeForm', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('submits email with source and shows success feedback', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, item: { id: 'sub_1' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    window.history.pushState({}, '', '/prompt/sample');

    render(<NewsletterSubscribeForm source="prompt_sidebar" inputId="newsletter-test-input" />);

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [url, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/public/newsletter/submissions');
    expect(requestInit.method).toBe('POST');
    expect(requestInit.headers).toEqual({ 'content-type': 'application/json' });
    expect(requestInit.body).toContain('"source":"prompt_sidebar"');
    expect(requestInit.body).toContain('"email":"user@example.com"');
    expect(requestInit.body).toContain('"pagePath":"/prompt/sample"');

    expect(await screen.findByRole('status')).toHaveTextContent('Subscribed successfully');
  });

  it('shows server error feedback when submission fails', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Invalid source.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    );

    render(<NewsletterSubscribeForm source="global_cta" inputId="newsletter-test-input" />);

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid source.');
  });

  it('shows already subscribed feedback when email exists', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          alreadySubscribed: true,
          message: 'This email is already subscribed.',
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    render(<NewsletterSubscribeForm source="global_cta" inputId="newsletter-test-input" />);

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'This email is already subscribed.',
    );
  });
});
