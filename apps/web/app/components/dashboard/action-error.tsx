'use client';

type ActionErrorProps = {
  error: string | null;
  onRetry?: (() => void) | null;
};

const REQUEST_ID_PATTERN = /\(Request ID:\s*([^)]+)\)/i;

function extractRequestId(message: string): string | null {
  const match = message.match(REQUEST_ID_PATTERN);
  return match?.[1]?.trim() || null;
}

export function ActionError({ error, onRetry }: ActionErrorProps) {
  if (!error) {
    return null;
  }

  const requestId = extractRequestId(error);

  return (
    <div className="rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-[0.85rem] text-red-700">
      <p>{error}</p>
      {requestId && <p className="mt-1 text-[0.75rem] text-red-600/90">Request ID: {requestId}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-full border border-red-300 bg-white px-3 py-1 text-[0.74rem] font-medium text-red-700 transition-colors hover:bg-red-100"
        >
          Retry
        </button>
      )}
    </div>
  );
}

