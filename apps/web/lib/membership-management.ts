const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  process.env.API_URL?.replace(/\/$/, '') ??
  'http://localhost:4000';

export type MembershipManageStatus = 'FREE' | 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'PAST_DUE';
export type MembershipManageCycle = 'monthly' | 'yearly' | null;

export type MembershipSummaryResponse = {
  user: {
    id: string;
    email: string;
    plan: 'FREE' | 'PREMIUM';
  };
  membership: {
    status: MembershipManageStatus;
    provider: string | null;
    cycle: MembershipManageCycle;
    startAt: string | null;
    endAt: string | null;
    canceledAt: string | null;
    willAutoRenew: boolean;
  };
  billingHistory: Array<{
    id: string;
    provider: string;
    status: string;
    amount: number;
    currency: string;
    createdAt: string;
  }>;
};

export class MembershipManagementError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'MembershipManagementError';
    this.status = status;
  }
}

export async function getMembershipSummary(
  accessToken: string,
): Promise<MembershipSummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/membership`, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: unknown }).message)
        : 'Unable to load membership details.';
    throw new MembershipManagementError(response.status, message);
  }

  return (await response.json()) as MembershipSummaryResponse;
}
