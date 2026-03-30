const SITE_ASSET_BASE_URL = 'https://media.geminiprompts.io/gemini_prompts/site-assets';

export const BRAND_LOGO_URL = `${SITE_ASSET_BASE_URL}/branding/logo.svg`;
export const FAVICON_LOGO_URL = `${SITE_ASSET_BASE_URL}/favicon.svg`;
export const CTA_ROBO_URL =
  'https://media.geminiprompts.io/gemini_prompts/media/2026/03/4bc99ca2ff5846466fef1f2871fa8604.webp';

export const COMMUNITY_IMAGE_URLS = Array.from(
  { length: 20 },
  (_, index) => `${SITE_ASSET_BASE_URL}/community/${index + 1}.webp`,
);
