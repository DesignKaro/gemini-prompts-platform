import { apiRequest } from './client';
import type { AuthResponse, MembershipSummary } from '../types/content';

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export function login(payload: LoginPayload) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export function register(payload: RegisterPayload) {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export function logout(refreshToken?: string | null) {
  return apiRequest('/auth/logout', {
    method: 'POST',
    body: { refreshToken },
    auth: true,
  });
}

export function getMe() {
  return apiRequest('/auth/me', { auth: true });
}

export function getProfileSummary() {
  return apiRequest('/auth/profile/summary', { auth: true });
}

export function getMembershipSummary() {
  return apiRequest<MembershipSummary>('/auth/membership', { auth: true });
}
