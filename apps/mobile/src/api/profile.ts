import { apiRequest } from './client';
import type { ListResponse, PublicPrompt } from '../types/content';

function queryString(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    searchParams.set(key, String(value));
  }
  const value = searchParams.toString();
  return value.length > 0 ? `?${value}` : '';
}

export function getProfileSaved(skip = 0, take = 20) {
  return apiRequest<ListResponse<PublicPrompt>>(`/auth/profile/saved${queryString({ skip, take })}`, {
    auth: true,
  });
}

export function getProfileActivity(skip = 0, take = 20) {
  return apiRequest(`/auth/profile/activity${queryString({ skip, take })}`, { auth: true });
}

export function getPublicProfileByHandle(handle: string) {
  return apiRequest(`/auth/profile/public/${handle}`);
}
