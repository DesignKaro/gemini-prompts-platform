import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactMessageForm } from '../app/components/contact-message-form';

describe('ContactMessageForm', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('submits contact payload and shows success feedback', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, message: 'Message submitted successfully.' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    render(<ContactMessageForm source="contact_page" pagePath="/contact" />);

    fireEvent.change(screen.getByPlaceholderText('Your name'), {
      target: { value: 'Alex' },
    });
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), {
      target: { value: 'alex@example.com' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Subject' }), {
      target: { value: 'Feedback' },
    });
    fireEvent.change(screen.getByPlaceholderText('Tell us what you need…'), {
      target: { value: 'I love the product.' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [url, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/public/contact/submissions');
    expect(requestInit.method).toBe('POST');
    expect(requestInit.body).toContain('"name":"Alex"');
    expect(requestInit.body).toContain('"email":"alex@example.com"');
    expect(requestInit.body).toContain('"subject":"Feedback"');
    expect(requestInit.body).toContain('"source":"contact_page"');
    expect(requestInit.body).toContain('"pagePath":"/contact"');

    expect(await screen.findByRole('status')).toHaveTextContent('Message submitted successfully');
  });

  it('shows API error when submission fails', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Invalid payload.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    );

    render(<ContactMessageForm source="contact_page" pagePath="/contact" />);

    fireEvent.change(screen.getByPlaceholderText('Your name'), {
      target: { value: 'Alex' },
    });
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), {
      target: { value: 'alex@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Tell us what you need…'), {
      target: { value: 'Need support' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid payload.');
  });
});
