'use client';

import { DashboardApiError } from './use-admin-api';

type BulkActionOptions = {
  ids: string[];
  run: (id: string) => Promise<void>;
  actionLabel: string;
};

type BulkActionFailure = {
  id: string;
  message: string;
  requestId?: string;
};

export type BulkActionResult = {
  total: number;
  successCount: number;
  failureCount: number;
  failures: BulkActionFailure[];
};

function buildFailure(id: string, error: unknown): BulkActionFailure {
  if (error instanceof DashboardApiError) {
    return {
      id,
      message: error.message,
      requestId: error.requestId,
    };
  }

  return {
    id,
    message: error instanceof Error ? error.message : 'Request failed.',
  };
}

export async function runBulkAction(options: BulkActionOptions): Promise<BulkActionResult> {
  const { ids, run } = options;
  const settled = await Promise.allSettled(ids.map((id) => run(id)));
  const failures: BulkActionFailure[] = [];

  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      return;
    }
    failures.push(buildFailure(ids[index] ?? `item-${index + 1}`, result.reason));
  });

  const failureCount = failures.length;
  const successCount = ids.length - failureCount;

  return {
    total: ids.length,
    successCount,
    failureCount,
    failures,
  };
}

export function bulkActionMessage(result: BulkActionResult, actionLabel: string): string | null {
  if (result.failureCount === 0) {
    return null;
  }

  if (result.successCount === 0) {
    return `Unable to ${actionLabel} selected items. ${result.failures[0]?.message ?? ''}`.trim();
  }

  const firstFailure = result.failures[0];
  return `${actionLabel} completed with partial failures (${result.successCount}/${result.total} succeeded). ${
    firstFailure?.message ?? ''
  }`.trim();
}
