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

describe('AuthModal submit flow', () => {
  beforeEach(() => {
    signInMock.mockReset();
    redirectToAuthPathMock.mockReset();
    fetchMock.mockReset();
    fetchMock.mockRejectedValue(new Error('health endpoint unavailable'));
    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/login');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('still submits credentials when unrelated fetch calls fail', async () => {
    signInMock.mockResolvedValue({
      ok: false,
      error: 'CredentialsSignin',
      code: 'invalid_credentials',
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
      expect(signInMock).toHaveBeenCalledWith('credentials', {
        email: 'user@example.com',
        password: 'password123',
        mode: 'signin',
        callbackUrl: '/safe-return',
        redirect: false,
      });
    });

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
  });

  it('submits sign in with Enter from password field', async () => {
    signInMock.mockResolvedValue({
      ok: false,
      error: 'CredentialsSignin',
      code: 'invalid_credentials',
    });

    render(<AuthModal variant="page" callbackUrl="/safe-return" />);

    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.keyDown(screen.getByLabelText('Password'), {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith('credentials', {
        email: 'user@example.com',
        password: 'password123',
        mode: 'signin',
        callbackUrl: '/safe-return',
        redirect: false,
      });
    });
  });

  it('submits sign up with Enter from password field', async () => {
    signInMock.mockResolvedValue({
      ok: false,
      error: 'CredentialsSignin',
      code: 'invalid_credentials',
    });

    render(<AuthModal variant="page" callbackUrl="/safe-return" />);

    fireEvent.click(screen.getByRole('button', { name: 'Signup' }));
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'newuser@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.keyDown(screen.getByLabelText('Password'), {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith('credentials', {
        email: 'newuser@example.com',
        password: 'password123',
        mode: 'signup',
        callbackUrl: '/safe-return',
        redirect: false,
      });
    });
  });
});
