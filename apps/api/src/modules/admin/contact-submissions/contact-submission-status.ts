export const CONTACT_SUBMISSION_STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM'] as const;

export type ContactSubmissionStatus = (typeof CONTACT_SUBMISSION_STATUSES)[number];
