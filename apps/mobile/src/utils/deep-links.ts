import * as Linking from 'expo-linking';

export const APP_SCHEME = 'geminiprompts';
export const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://geminiprompts.io';

export function buildPromptWebUrl(slug: string) {
  return `${WEB_BASE_URL.replace(/\/$/, '')}/prompt/${slug}`;
}

export function buildPostWebUrl(slug: string) {
  return `${WEB_BASE_URL.replace(/\/$/, '')}/blog/${slug}`;
}

export function buildMembershipWebUrl() {
  return `${WEB_BASE_URL.replace(/\/$/, '')}/membership?source=mobile`;
}

export function buildAppReturnUrl(pathname: string) {
  return Linking.createURL(pathname);
}
