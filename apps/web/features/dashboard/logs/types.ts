export type DashboardPageState = 'loading' | 'ready' | 'saving' | 'error' | 'empty';

export type ErrorLogLevelFilter = 'error' | 'warn' | 'all';

export type ErrorLogFile = {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  updatedAt: string;
};

export type ErrorLogEntry = {
  timestamp: string | null;
  level: 'error' | 'warn' | 'info' | 'unknown';
  message: string;
  raw: string;
};

export type ErrorLogsResponse = {
  files: ErrorLogFile[];
  selectedFile: ErrorLogFile | null;
  filters: {
    level: ErrorLogLevelFilter;
    search: string;
    limit: number;
  };
  entries: ErrorLogEntry[];
  truncatedFromStart: boolean;
  scannedLineCount: number;
};
