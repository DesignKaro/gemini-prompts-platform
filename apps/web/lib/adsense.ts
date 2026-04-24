const DEFAULT_ADSENSE_PUBLISHER_ID = 'ca-pub-9138814143617371';

const DEFAULT_MANUAL_AD_SLOTS = {
  promptInline: '9399622723',
  promptMultiplex: '9910239098',
  postInline: '9399622723',
  postMultiplex: '9910239098',
} as const;

const MANUAL_AD_SLOT_ENV = {
  promptInline: 'NEXT_PUBLIC_ADSENSE_SLOT_PROMPT_INLINE',
  promptMultiplex: 'NEXT_PUBLIC_ADSENSE_SLOT_PROMPT_MULTIPLEX',
  postInline: 'NEXT_PUBLIC_ADSENSE_SLOT_POST_INLINE',
  postMultiplex: 'NEXT_PUBLIC_ADSENSE_SLOT_POST_MULTIPLEX',
} as const;

export type AdsenseManualSlotName = keyof typeof MANUAL_AD_SLOT_ENV;

export function cleanAdsensePublisherId(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  return /^ca-pub-\d{16}$/.test(trimmed) ? trimmed : null;
}

export function cleanAdsenseSlot(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return /^\d{6,}$/.test(trimmed) ? trimmed : null;
}

export function getDefaultAdsensePublisherId() {
  return DEFAULT_ADSENSE_PUBLISHER_ID;
}

export function getAdsenseManualSlot(slotName: AdsenseManualSlotName) {
  return (
    cleanAdsenseSlot(process.env[MANUAL_AD_SLOT_ENV[slotName]] ?? null) ??
    DEFAULT_MANUAL_AD_SLOTS[slotName]
  );
}

export function getAdsenseManualSlotEnvName(slotName: AdsenseManualSlotName) {
  return MANUAL_AD_SLOT_ENV[slotName];
}

export function readAdsensePublisherIdFromDom(doc?: Document | null) {
  if (!doc) {
    return null;
  }

  const meta = doc.querySelector('meta[name="google-adsense-account"]');
  return cleanAdsensePublisherId(meta?.getAttribute('content'));
}
