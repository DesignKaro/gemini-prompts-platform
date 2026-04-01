import { apiRequest } from './client';
import type {
  HomeResponse,
  ListResponse,
  PublicAuthor,
  PublicCategory,
  PublicPost,
  PublicPrompt,
  PublicTag,
  SearchResponse,
} from '../types/content';

function queryString(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    searchParams.set(key, String(value));
  }
  const value = searchParams.toString();
  return value.length > 0 ? `?${value}` : '';
}

export function getHome() {
  return apiRequest<HomeResponse>('/public/home');
}

export function searchPublicContent(query: string, take = 20) {
  return apiRequest<SearchResponse>(`/public/search${queryString({ query, take })}`);
}

export function getPrompts(params: {
  skip?: number;
  take?: number;
  search?: string;
  category?: string;
  tag?: string;
  author?: string;
  sort?: 'latest' | 'popular' | 'trending';
} = {}) {
  return apiRequest<ListResponse<PublicPrompt>>(`/public/prompts${queryString(params)}`);
}

export function getPromptBySlug(slug: string) {
  return apiRequest<PublicPrompt>(`/public/prompts/${slug}`);
}

export function trackPromptView(promptId: string) {
  return apiRequest(`/public/prompts/${promptId}/view`, { method: 'POST' });
}

export function likePrompt(promptId: string) {
  return apiRequest(`/public/prompts/${promptId}/like`, { method: 'POST' });
}

export function sharePrompt(promptId: string) {
  return apiRequest(`/public/prompts/${promptId}/share`, { method: 'POST' });
}

export function savePrompt(promptId: string) {
  return apiRequest(`/public/prompts/${promptId}/save`, {
    method: 'POST',
    auth: true,
  });
}

export function unsavePrompt(promptId: string) {
  return apiRequest(`/public/prompts/${promptId}/save`, {
    method: 'DELETE',
    auth: true,
  });
}

export function getPosts(params: {
  skip?: number;
  take?: number;
  search?: string;
  category?: string;
  tag?: string;
  author?: string;
  sort?: 'latest' | 'popular';
} = {}) {
  return apiRequest<ListResponse<PublicPost>>(`/public/posts${queryString(params)}`);
}

export function getPostBySlug(slug: string) {
  return apiRequest<PublicPost>(`/public/posts/${slug}`);
}

export function trackPostView(postId: string) {
  return apiRequest(`/public/posts/${postId}/view`, { method: 'POST' });
}

export function getCategories(take = 48) {
  return apiRequest<ListResponse<PublicCategory>>(`/public/categories${queryString({ take })}`);
}

export function getTags(take = 100) {
  return apiRequest<ListResponse<PublicTag>>(`/public/tags${queryString({ take })}`);
}

export function getAuthors(take = 48) {
  return apiRequest<ListResponse<PublicAuthor>>(`/public/authors${queryString({ take })}`);
}

export function getAuthorBySlug(slug: string) {
  return apiRequest<PublicAuthor>(`/public/authors/${slug}`);
}
