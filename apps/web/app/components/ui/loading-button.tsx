import React from 'react';
import { InlineSpinner } from './inline-spinner';

type LoadingButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pending?: boolean;
  pendingLabel?: React.ReactNode;
  spinnerSize?: 'xs' | 'sm' | 'md';
  spinnerClassName?: string;
};

export function LoadingButton({
  pending = false,
  pendingLabel,
  spinnerSize = 'sm',
  spinnerClassName = '',
  disabled,
  children,
  className = '',
  ...props
}: LoadingButtonProps) {
  const isDisabled = Boolean(disabled) || pending;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={pending || undefined}
      className={className}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <InlineSpinner size={spinnerSize} className={spinnerClassName} />
          <span>{pendingLabel ?? children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

