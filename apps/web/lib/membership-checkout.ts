const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  process.env.API_URL?.replace(/\/$/, '') ??
  'http://localhost:4000';

export type MembershipCheckoutCycle = 'monthly' | 'yearly';

export type MembershipCheckoutOrderResponse = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  cycle: MembershipCheckoutCycle;
  plan: 'PREMIUM';
};

export type MembershipCheckoutVerifyResponse = {
  verified: boolean;
  alreadyProcessed: boolean;
  plan: 'PREMIUM';
  cycle: MembershipCheckoutCycle;
  activeUntil: string;
};

export class MembershipCheckoutError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'MembershipCheckoutError';
    this.status = status;
  }
}

type MembershipCheckoutRequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  accessToken: string;
};

async function requestMembershipCheckoutApi<T>(
  path: string,
  options: MembershipCheckoutRequestOptions,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api/public${path}`, {
    method: options.method ?? 'POST',
    headers: {
      authorization: `Bearer ${options.accessToken}`,
      ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: unknown }).message)
        : 'Membership checkout request failed.';
    throw new MembershipCheckoutError(response.status, message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

export async function createMembershipCheckoutOrder(
  cycle: MembershipCheckoutCycle,
  accessToken: string,
) {
  return requestMembershipCheckoutApi<MembershipCheckoutOrderResponse>(
    '/membership/checkout/order',
    {
      method: 'POST',
      body: { cycle },
      accessToken,
    },
  );
}

export async function verifyMembershipCheckout(
  request: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  },
  accessToken: string,
) {
  return requestMembershipCheckoutApi<MembershipCheckoutVerifyResponse>(
    '/membership/checkout/verify',
    {
      method: 'POST',
      body: request,
      accessToken,
    },
  );
}
