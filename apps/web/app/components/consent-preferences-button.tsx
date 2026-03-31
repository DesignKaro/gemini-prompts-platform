'use client';

import { CONSENT_MODAL_OPEN_EVENT } from '../../lib/consent';

type ConsentPreferencesButtonProps = {
  className?: string;
};

export function ConsentPreferencesButton({ className }: ConsentPreferencesButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(new Event(CONSENT_MODAL_OPEN_EVENT));
      }}
      className={className}
    >
      Manage consent
    </button>
  );
}
