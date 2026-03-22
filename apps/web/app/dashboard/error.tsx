'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[20px] border border-[#e2e6ee] bg-white px-6 py-10 text-center">
      <p className="text-[1.1rem] font-medium text-[#0f1116]">Something went wrong</p>
      <p className="mt-2 max-w-[420px] text-[0.9rem] text-gray-500">
        We hit a snag while loading the dashboard. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-full bg-[#0f1116] px-4 py-2 text-[0.85rem] font-medium text-white"
      >
        Retry
      </button>
    </div>
  );
}
