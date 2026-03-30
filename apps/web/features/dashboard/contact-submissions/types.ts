export type DashboardPageState = 'loading' | 'ready' | 'saving' | 'error' | 'empty';

export type ContactSubmissionStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'SPAM';

export type ContactSubmissionRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  status: ContactSubmissionStatus;
  source: string;
  pagePath: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type ContactSubmissionDetail = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactSubmissionStatus;
  internalNote: string | null;
  source: string;
  pagePath: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

export type ContactSubmissionsResponse = {
  items: ContactSubmissionRow[];
  total: number;
  statuses: ContactSubmissionStatus[];
  sources: string[];
};
