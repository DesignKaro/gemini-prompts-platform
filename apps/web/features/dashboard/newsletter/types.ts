export type DashboardPageState = 'loading' | 'ready' | 'saving' | 'error' | 'empty';

export type NewsletterSubmissionRow = {
  id: string;
  email: string;
  source: string;
  pagePath: string | null;
  createdAt: string;
};

export type NewsletterSubmissionsResponse = {
  items: NewsletterSubmissionRow[];
  total: number;
  sources: string[];
};
