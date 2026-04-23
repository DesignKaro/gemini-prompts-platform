import React from 'react';

type InlineSpinnerSize = 'xs' | 'sm' | 'md';

const SPINNER_SIZE_CLASS: Record<InlineSpinnerSize, string> = {
  xs: 'h-3 w-3 border',
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
};

type InlineSpinnerProps = {
  size?: InlineSpinnerSize;
  className?: string;
};

export function InlineSpinner({ size = 'sm', className = '' }: InlineSpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-current border-t-transparent ${SPINNER_SIZE_CLASS[size]} ${className}`.trim()}
    />
  );
}
