export const CONSENT_STORAGE_KEY = 'gp:consent:v1';
export const CONSENT_COOKIE_NAME = 'gp_consent_v1';
export const CONSENT_VERSION = '2026-03-31';
export const CONSENT_MODAL_OPEN_EVENT = 'gp:open-consent-modal';

export type ConsentRecord = {
  version: string;
  acceptedAt: string;
  legalAccepted: boolean;
  functional: boolean;
  marketing: boolean;
};

export function parseConsentRecord(value: string | null): ConsentRecord | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<ConsentRecord> | null;
    if (
      !parsed ||
      typeof parsed.version !== 'string' ||
      typeof parsed.acceptedAt !== 'string' ||
      typeof parsed.legalAccepted !== 'boolean' ||
      typeof parsed.functional !== 'boolean' ||
      typeof parsed.marketing !== 'boolean'
    ) {
      return null;
    }

    return {
      version: parsed.version,
      acceptedAt: parsed.acceptedAt,
      legalAccepted: parsed.legalAccepted,
      functional: parsed.functional,
      marketing: parsed.marketing,
    };
  } catch {
    return null;
  }
}
