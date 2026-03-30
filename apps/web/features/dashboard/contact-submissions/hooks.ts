import type { ContactSubmissionStatus } from './types';

export function formatSubmissionTimestamp(value: string | null) {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }

  return parsed.toLocaleString();
}

export function formatStatusLabel(status: ContactSubmissionStatus) {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (value) => value.toUpperCase());
}
