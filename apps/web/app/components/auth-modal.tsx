'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { signIn } from 'next-auth/react';
import { getAuthRedirectTarget, redirectToAuthPath } from '../../lib/utils/auth-callback';
import { LoadingButton } from './ui/loading-button';

type AuthModalProps = {
  isOpen?: boolean;
  onClose?: () => void;
  callbackUrl: string;
  variant?: 'modal' | 'page';
};

type AuthTab = 'signin' | 'signup';
type FieldErrorTarget = 'email' | 'password' | 'form';

type AuthErrorState = {
  target: FieldErrorTarget;
  message: string;
};

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');

type HealthCheckResult = {
  ok: boolean;
  message?: string;
};

async function checkAuthHealth(): Promise<HealthCheckResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`${apiBaseUrl}/api/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as {
      status?: string;
      database?: { connected?: boolean; missingTables?: string[]; error?: string };
    } | null;

    if (!response.ok || !payload) {
      return {
        ok: false,
        message: 'Auth service is unavailable. Please make sure the API server is running.',
      };
    }

    if (payload.status !== 'ok') {
      if (payload.database?.connected === false) {
        return {
          ok: false,
          message: `Database connection failed: ${payload.database?.error ?? 'Unknown error.'}`,
        };
      }

      const missingTables = payload.database?.missingTables ?? [];
      if (missingTables.length > 0) {
        return {
          ok: false,
          message: `Database is missing required tables: ${missingTables.join(
            ', ',
          )}. Apply the SQL migrations and restart the API.`,
        };
      }

      return {
        ok: false,
        message:
          'API is running but the database is not ready. Apply migrations and restart the API.',
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      message: 'Auth service is unavailable. Please make sure the API server is running.',
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

function mapSignInError(error?: string, code?: string, mode: AuthTab = 'signin'): AuthErrorState {
  if (code === 'account_suspended' || error === 'AccountSuspended') {
    return {
      target: 'form',
      message: 'Your account has been suspended. Please contact support for help.',
    };
  }

  if (code === 'email_exists') {
    return {
      target: 'email',
      message: 'This email is already registered. Please sign in instead.',
    };
  }

  if (code === 'invalid_credentials') {
    return { target: 'password', message: 'Invalid email or password.' };
  }

  if (code === 'invalid_email') {
    return { target: 'email', message: 'Please enter a valid email address.' };
  }

  if (code === 'weak_password') {
    return { target: 'password', message: 'Password must be at least 8 characters.' };
  }

  if (code === 'auth_unavailable') {
    return {
      target: 'form',
      message:
        'Auth service is unavailable. Please make sure the API server is running and migrations are applied.',
    };
  }

  if (code === 'auth_unknown') {
    return {
      target: 'form',
      message: 'Authentication failed. Please try again in a moment.',
    };
  }

  if (code === 'credentials') {
    return {
      target: mode === 'signup' ? 'email' : 'password',
      message:
        mode === 'signup'
          ? 'Could not create account. Please check your details and try again.'
          : 'Invalid email or password.',
    };
  }

  if (error === 'Configuration') {
    return {
      target: 'form',
      message: 'Authentication is misconfigured. Check server env and restart both apps.',
    };
  }

  if (error === 'CredentialsSignin') {
    return {
      target: mode === 'signup' ? 'email' : 'password',
      message:
        mode === 'signup'
          ? 'Could not create account. Try another email or sign in instead.'
          : 'Invalid email or password.',
    };
  }

  return { target: 'form', message: 'Something went wrong. Please try again.' };
}

export function AuthModal({
  isOpen = true,
  onClose,
  callbackUrl,
  variant = 'modal',
}: AuthModalProps) {
  const isModal = variant === 'modal';
  const shouldRender = isModal ? isOpen : true;
  const [activeTab, setActiveTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailEditable, setEmailEditable] = useState(false);
  const [passwordEditable, setPasswordEditable] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  const isValidEmail = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);

  useEffect(() => {
    if (!shouldRender) return;
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setEmailError('');
    setPasswordError('');
    setFormError('');
    setEmailFocused(false);
    setPasswordFocused(false);
    setEmailEditable(false);
    setPasswordEditable(false);
    setGoogleSubmitting(false);

    const focusTimer = window.setTimeout(() => {
      firstFocusableRef.current?.focus();
    }, 40);

    if (!isModal) {
      return () => {
        window.clearTimeout(focusTimer);
      };
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled])',
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isModal, onClose, shouldRender]);

  if (!shouldRender) return null;

  const headingText = activeTab === 'signin' ? 'Welcome Back' : 'Create Account';
  const subtitleText =
    activeTab === 'signin'
      ? 'Welcome Back, Please enter your details'
      : 'Create your account, Please enter your details';

  const clearFormErrors = () => {
    if (formError) setFormError('');
  };

  const validateEmailField = (): boolean => {
    const nextEmail = email.trim();
    if (!nextEmail) {
      setEmailError('Email is required.');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(nextEmail)) {
      setEmailError('Please enter a valid email address.');
      return false;
    }

    setEmailError('');
    return true;
  };

  const validatePasswordField = (): boolean => {
    const nextPassword = password.trim();
    if (!nextPassword) {
      setPasswordError('Password is required.');
      return false;
    }
    if (activeTab === 'signup' && nextPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return false;
    }

    setPasswordError('');
    return true;
  };

  const handleEmailContinue = async () => {
    clearFormErrors();
    const isEmailValid = validateEmailField();
    const isPasswordValid = validatePasswordField();
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const healthCheck = await checkAuthHealth();
      if (!healthCheck.ok) {
        setFormError(
          healthCheck.message ??
            'Auth service is unavailable. Please make sure the API server is running.',
        );
        return;
      }

      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        mode: activeTab,
        callbackUrl,
        redirect: false,
      });

      if (!result) {
        setFormError('Auth response is empty. Please try again.');
        return;
      }

      if (result.error || !result.ok) {
        const mapped = mapSignInError(result.error, result.code, activeTab);
        if (mapped.target === 'email') {
          setEmailError(mapped.message);
        } else if (mapped.target === 'password') {
          setPasswordError(mapped.message);
        } else {
          setFormError(mapped.message);
        }
        return;
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const targetPath = getAuthRedirectTarget({
        resultUrl: result?.url,
        callbackUrl,
        origin,
        fallback: '/',
      });

      onClose?.();
      redirectToAuthPath(targetPath);
    } catch {
      setFormError(
        'Auth service is unavailable. Please make sure web and API servers are running.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleContinue = async () => {
    if (googleSubmitting) return;
    setGoogleSubmitting(true);
    try {
      await signIn('google', { callbackUrl });
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div
      role={isModal ? 'presentation' : undefined}
      className={
        isModal
          ? 'fixed inset-0 z-[80] flex items-center justify-center bg-[#0f141fcc] px-4 py-6'
          : 'flex w-full items-center justify-center'
      }
      onClick={isModal && onClose ? onClose : undefined}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Authentication"
        className={`w-full max-w-[420px] rounded-[26px] bg-white px-4 pb-6 pt-5 sm:px-6 sm:pb-7 sm:pt-6 ${
          isModal ? 'shadow-[0_26px_80px_rgba(8,12,24,0.22)]' : 'shadow-none'
        }`}
        onClick={isModal ? (event) => event.stopPropagation() : undefined}
      >
        {isModal && onClose ? (
          <div className="flex justify-end">
            <button
              type="button"
              aria-label="Close authentication modal"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e3e5eb] text-[#4f5668]"
              onClick={onClose}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                <path
                  d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ) : null}

        <div className="mt-2 text-center">
          <h2 className="text-[1.75rem] leading-[1.08] text-[#111319] sm:text-[1.9rem]">
            {headingText}
          </h2>
          <p className="mt-2 text-[0.95rem] leading-[1.35] text-[#9299a9] sm:text-[1rem]">
            {subtitleText}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-[15px] bg-[#f1f2f5] p-1.5">
          <button
            ref={firstFocusableRef}
            type="button"
            className={`h-10 rounded-[11px] text-[0.95rem] leading-none transition sm:text-[1rem] ${
              activeTab === 'signin' ? 'bg-white text-[#161a21]' : 'text-[#6d7380]'
            }`}
            onClick={() => {
              setActiveTab('signin');
              setEmailError('');
              setPasswordError('');
              setFormError('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`h-10 rounded-[11px] text-[0.95rem] leading-none transition sm:text-[1rem] ${
              activeTab === 'signup' ? 'bg-white text-[#161a21]' : 'text-[#6d7380]'
            }`}
            onClick={() => {
              setActiveTab('signup');
              setEmailError('');
              setPasswordError('');
              setFormError('');
            }}
          >
            Signup
          </button>
        </div>

        <div
          className={`mt-4 rounded-[16px] border bg-white p-3 ${
            emailError ? 'border-[#e15c5c]' : 'border-[#e4e7ee]'
          }`}
        >
          <label htmlFor="auth-email" className="flex items-center gap-3.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-[#dde1e8] text-[#20242f]">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                <rect
                  x="3.5"
                  y="5.5"
                  width="17"
                  height="13"
                  rx="2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="m4.2 7 7.8 6 7.8-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="h-9 w-px bg-[#eaedf2]" />
            <span className="relative min-w-0 flex-1 pt-4 pb-2">
              <span
                className={`pointer-events-none absolute left-0 text-[#757d8b] transition-all duration-200 ${
                  emailFocused || email
                    ? 'top-0 text-[0.82rem] leading-none'
                    : 'top-1/2 -translate-y-1/2 text-[0.95rem] leading-none'
                }`}
              >
                Email Address
              </span>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (emailError) setEmailError('');
                  clearFormErrors();
                }}
                name="gp_email_input"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                onFocus={() => {
                  setEmailEditable(true);
                  setEmailFocused(true);
                }}
                onBlur={() => {
                  setEmailFocused(false);
                  validateEmailField();
                }}
                onPointerDown={() => setEmailEditable(true)}
                placeholder=""
                readOnly={!emailEditable}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'auth-email-error' : undefined}
                className="w-full border-none p-0 text-[0.98rem] leading-none text-[#151922] outline-none sm:text-[1rem]"
              />
            </span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                isValidEmail ? 'bg-[#1bc47d] text-white' : 'bg-[#ebedf2] text-[#8f96a4]'
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5">
                <path
                  d="m6 12.7 3.3 3.3L18 7.3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </label>
        </div>
        <div className="min-h-[24px]">
          {emailError ? (
            <p id="auth-email-error" className="mt-2 text-[0.86rem] leading-[1.2] text-[#cd3f3f]">
              {emailError}
            </p>
          ) : null}
        </div>
        <div
          className={`mt-2.5 rounded-[16px] border bg-white p-3 ${
            passwordError ? 'border-[#e15c5c]' : 'border-[#e4e7ee]'
          }`}
        >
          <label htmlFor="auth-password" className="flex items-center gap-3.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-[#dde1e8] text-[#20242f]">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                <rect
                  x="5"
                  y="10"
                  width="14"
                  height="10"
                  rx="2.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M8.2 10V8.3a3.8 3.8 0 1 1 7.6 0V10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            </span>
            <span className="h-9 w-px bg-[#eaedf2]" />
            <span className="relative min-w-0 flex-1 pt-4 pb-2">
              <span
                className={`pointer-events-none absolute left-0 text-[#757d8b] transition-all duration-200 ${
                  passwordFocused || password
                    ? 'top-0 text-[0.82rem] leading-none'
                    : 'top-1/2 -translate-y-1/2 text-[0.95rem] leading-none'
                }`}
              >
                Password
              </span>
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (passwordError) setPasswordError('');
                  clearFormErrors();
                }}
                name="gp_password_input"
                autoComplete="new-password"
                onFocus={() => {
                  setPasswordEditable(true);
                  setPasswordFocused(true);
                }}
                onBlur={() => {
                  setPasswordFocused(false);
                  validatePasswordField();
                }}
                onPointerDown={() => setPasswordEditable(true)}
                placeholder=""
                readOnly={!passwordEditable}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? 'auth-password-error' : undefined}
                className="w-full border-none p-0 pr-10 text-[0.98rem] leading-none text-[#151922] outline-none sm:text-[1rem]"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-0 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[#ebedf2] text-[#8f96a4]"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5">
                    <path
                      d="M3.5 3.5 20.5 20.5M9.9 9.9A3 3 0 0 0 14.1 14.1M6.1 6.1A15.9 15.9 0 0 0 2.8 12c2.2 4 5.6 6 9.2 6 1.7 0 3.2-.4 4.6-1.2M10.5 6.1c.5-.1 1-.1 1.5-.1 3.6 0 7 2 9.2 6-.7 1.3-1.4 2.4-2.3 3.3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5">
                    <path
                      d="M2.8 12c2.2-4 5.6-6 9.2-6s7 2 9.2 6c-2.2 4-5.6 6-9.2 6s-7-2-9.2-6Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="2.8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                )}
              </button>
            </span>
          </label>
        </div>
        <div className="min-h-[24px]">
          {passwordError ? (
            <p
              id="auth-password-error"
              className="mt-2 text-[0.86rem] leading-[1.2] text-[#cd3f3f]"
            >
              {passwordError}
            </p>
          ) : activeTab === 'signup' ? (
            <p className="mt-2 text-[0.82rem] leading-[1.2] text-[#7e8697]">
              Use at least 8 characters.
            </p>
          ) : null}
        </div>

        <LoadingButton
          type="button"
          pending={isSubmitting}
          pendingLabel="Please wait..."
          spinnerSize="xs"
          className="mt-3.5 h-[54px] w-full rounded-[14px] bg-[#1f6bff] text-[1rem] leading-none text-white transition hover:bg-[#1c5ddd] disabled:cursor-not-allowed disabled:opacity-70"
          onClick={handleEmailContinue}
        >
          Continue
        </LoadingButton>
        {formError ? (
          <p className="mt-3 text-center text-[0.95rem] leading-[1.3] text-[#c94040]">
            {formError}
          </p>
        ) : null}

        <div className="mt-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-[#e5e7ec]" />
          <p className="text-[0.9rem] leading-none text-[#7d8391] sm:text-[0.95rem]">
            Or Continue With
          </p>
          <span className="h-px flex-1 bg-[#e5e7ec]" />
        </div>

        <LoadingButton
          type="button"
          pending={googleSubmitting}
          pendingLabel="Please wait..."
          spinnerSize="xs"
          aria-label="Continue with Google"
          className="mt-4 flex h-[50px] w-full items-center justify-center gap-3 rounded-[12px] border border-[#d6dae2] bg-white text-[0.95rem] leading-none text-[#161a22] transition hover:border-[#bbc2ce]"
          onClick={() => {
            void handleGoogleContinue();
          }}
          disabled={isSubmitting}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f6f7fa]">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
              <path
                d="M21.6 12.2c0-.7-.1-1.2-.2-1.8H12v3.4h5.4a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3-4.2 3-7.3Z"
                fill="#4285F4"
              />
              <path
                d="M12 22c2.7 0 5-1 6.6-2.5l-3.2-2.6a5.9 5.9 0 0 1-8.8-3H3.3v2.7A10 10 0 0 0 12 22Z"
                fill="#34A853"
              />
              <path
                d="M6.6 13.9a5.8 5.8 0 0 1 0-3.8V7.4H3.3a10 10 0 0 0 0 9l3.3-2.5Z"
                fill="#FBBC05"
              />
              <path
                d="M12 6a5.4 5.4 0 0 1 3.8 1.5l2.8-2.8A10 10 0 0 0 3.3 7.4L6.6 10A5.8 5.8 0 0 1 12 6Z"
                fill="#EA4335"
              />
            </svg>
          </span>
          <span>Continue with Google</span>
        </LoadingButton>
      </div>
    </div>
  );
}
