import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthModal } from '../app/components/auth-modal';

const { signInMock, redirectToAuthPathMock, fetchMock } = vi.hoisted(() => ({
  signInMock: vi.fn(),
  redirectToAuthPathMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  signIn: signInMock,
}));

vi.mock('../lib/utils/auth-callback', async () => {
  const actual = await vi.importActual<typeof import('../lib/utils/auth-callback')>(
    '../lib/utils/auth-callback',
  );
  return {
    ...actual,
    redirectToAuthPath: redirectToAuthPathMock,
  };
});

describe('AuthModal callback redirect safety', () => {
  beforeEach(() => {
    signInMock.mockReset();
    redirectToAuthPathMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/search?q=prompt');
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to safe callback when provider returns unsafe redirect url', async () => {
    signInMock.mockResolvedValue({
      ok: true,
      url: '//evil.com/phish',
    });

    render(<AuthModal variant="page" callbackUrl="/safe-return" />);

    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(redirectToAuthPathMock).toHaveBeenCalledWith('/safe-return');
    });
  });

  it('falls back to root when both result and callback are unsafe', async () => {
    signInMock.mockResolvedValue({
      ok: true,
      url: 'https://evil.com/steal',
    });

    render(<AuthModal variant="page" callbackUrl="//evil.com" />);

    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(redirectToAuthPathMock).toHaveBeenCalledWith('/');
    });
  });
});
