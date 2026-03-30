import { createHmac } from 'node:crypto';
import { MembershipPlan, SubscriptionStatus, UserRole } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicService } from '../../src/modules/public/public.service';

function createViewer() {
  return {
    sub: 'user_1',
    email: 'user@example.com',
    role: UserRole.USER,
    plan: MembershipPlan.FREE,
    permissions: [],
    iat: 1,
    exp: 2,
  } as const;
}

function createConfigService() {
  return {
    getOrThrow: vi.fn((key: string) => {
      switch (key) {
        case 'JWT_SECRET':
          return 'jwt-secret-for-tests';
        case 'RAZORPAY_KEY_ID':
          return 'rzp_test_key';
        case 'RAZORPAY_KEY_SECRET':
          return 'rzp_test_secret';
        case 'RAZORPAY_API_BASE_URL':
          return 'https://api.razorpay.com';
        default:
          throw new Error(`Unexpected config key: ${key}`);
      }
    }),
  } as unknown as ConstructorParameters<typeof PublicService>[1];
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('PublicService membership checkout', () => {
  it('creates a Razorpay order and stores a checkout transaction', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'order_1',
          amount: 1200,
          currency: 'USD',
          status: 'created',
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const transactionUpsert = vi.fn().mockResolvedValue({ id: 'txn_1' });

    const prisma = {
      transaction: {
        upsert: transactionUpsert,
      },
    } as unknown as ConstructorParameters<typeof PublicService>[0];

    const service = new PublicService(prisma, createConfigService());

    const response = await service.createMembershipCheckoutOrder(createViewer(), 'monthly');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.razorpay.com/v1/orders');
    expect((requestInit.headers as Record<string, string>).authorization).toMatch(/^Basic\s+/);
    const requestBody = JSON.parse(String(requestInit.body)) as { receipt: string };
    expect(requestBody.receipt).toMatch(/^mem_m_/);
    expect(requestBody.receipt.length).toBeLessThanOrEqual(40);

    expect(transactionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: 'user_1',
          provider: 'RAZORPAY',
          providerRef: 'order_1',
          status: 'CREATED_MONTHLY',
          amount: 12,
          currency: 'USD',
        }),
      }),
    );

    expect(response).toEqual({
      keyId: 'rzp_test_key',
      orderId: 'order_1',
      amount: 1200,
      currency: 'USD',
      cycle: 'monthly',
      plan: 'PREMIUM',
    });
  });

  it('keeps Razorpay receipt within 40 chars for long user ids', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'order_long_receipt',
          amount: 9900,
          currency: 'USD',
          status: 'created',
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const prisma = {
      transaction: {
        upsert: vi.fn().mockResolvedValue({ id: 'txn_long_receipt' }),
      },
    } as unknown as ConstructorParameters<typeof PublicService>[0];

    const service = new PublicService(prisma, createConfigService());
    await service.createMembershipCheckoutOrder(
      {
        ...createViewer(),
        sub: 'user_with_a_very_very_long_identifier_that_breaks_receipt_limits_1234567890',
      },
      'yearly',
    );

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const requestBody = JSON.parse(String(requestInit.body)) as { receipt: string };
    expect(requestBody.receipt).toMatch(/^mem_y_/);
    expect(requestBody.receipt.length).toBeLessThanOrEqual(40);
  });

  it('rejects invalid Razorpay signatures and marks transaction as failed', async () => {
    const transactionFindFirst = vi.fn().mockResolvedValue({
      id: 'txn_1',
      status: 'CREATED_MONTHLY',
      amount: 12,
      currency: 'USD',
    });
    const transactionUpdate = vi.fn().mockResolvedValue({ id: 'txn_1' });

    const prisma = {
      transaction: {
        findFirst: transactionFindFirst,
        update: transactionUpdate,
      },
    } as unknown as ConstructorParameters<typeof PublicService>[0];

    const service = new PublicService(prisma, createConfigService());

    await expect(
      service.verifyMembershipCheckout(createViewer(), {
        razorpayOrderId: 'order_1',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'invalid-signature',
      }),
    ).rejects.toThrow('Invalid payment signature.');

    expect(transactionUpdate).toHaveBeenCalledWith({
      where: { id: 'txn_1' },
      data: { status: 'FAILED_SIGNATURE_MONTHLY' },
    });
  });

  it('verifies payment and upgrades subscription + membership plan', async () => {
    const signature = createHmac('sha256', 'rzp_test_secret')
      .update('order_1|pay_1')
      .digest('hex');

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'pay_1',
          order_id: 'order_1',
          amount: 1200,
          currency: 'USD',
          status: 'captured',
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const txMocks = {
      transaction: {
        update: vi.fn().mockResolvedValue({ id: 'txn_1' }),
      },
      subscription: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        upsert: vi.fn().mockResolvedValue({ id: 'sub_1' }),
      },
      user: {
        update: vi.fn().mockResolvedValue({ id: 'user_1' }),
      },
    };

    const transactionFindFirst = vi.fn().mockResolvedValue({
      id: 'txn_1',
      status: 'CREATED_MONTHLY',
      amount: 12,
      currency: 'USD',
    });

    const prisma = {
      transaction: {
        findFirst: transactionFindFirst,
      },
      $transaction: vi.fn(async (callback: (tx: typeof txMocks) => Promise<unknown>) =>
        callback(txMocks),
      ),
    } as unknown as ConstructorParameters<typeof PublicService>[0];

    const service = new PublicService(prisma, createConfigService());

    const response = await service.verifyMembershipCheckout(createViewer(), {
      razorpayOrderId: 'order_1',
      razorpayPaymentId: 'pay_1',
      razorpaySignature: signature,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.razorpay.com/v1/payments/pay_1',
      expect.any(Object),
    );
    expect(txMocks.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'txn_1' },
        data: expect.objectContaining({ status: 'PAID_MONTHLY' }),
      }),
    );
    expect(txMocks.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user_1',
          status: SubscriptionStatus.ACTIVE,
        },
      }),
    );
    expect(txMocks.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerRef: 'pay_1' },
        create: expect.objectContaining({
          userId: 'user_1',
          plan: MembershipPlan.PREMIUM,
          status: SubscriptionStatus.ACTIVE,
          provider: 'RAZORPAY',
        }),
      }),
    );
    expect(txMocks.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { plan: MembershipPlan.PREMIUM },
    });

    expect(response.verified).toBe(true);
    expect(response.alreadyProcessed).toBe(false);
    expect(response.plan).toBe('PREMIUM');
    expect(response.cycle).toBe('monthly');
  });

  it('handles duplicate verify callbacks without creating duplicate upgrades', async () => {
    const signature = createHmac('sha256', 'rzp_test_secret')
      .update('order_1|pay_1')
      .digest('hex');

    const activeUntil = new Date('2026-04-29T00:00:00.000Z');

    const transactionFindFirst = vi.fn().mockResolvedValue({
      id: 'txn_1',
      status: 'PAID_MONTHLY',
      amount: 12,
      currency: 'USD',
    });
    const subscriptionFindFirst = vi.fn().mockResolvedValue({ endAt: activeUntil });

    const prisma = {
      transaction: {
        findFirst: transactionFindFirst,
      },
      subscription: {
        findFirst: subscriptionFindFirst,
      },
      $transaction: vi.fn(),
    } as unknown as ConstructorParameters<typeof PublicService>[0];

    const service = new PublicService(prisma, createConfigService());

    const response = await service.verifyMembershipCheckout(createViewer(), {
      razorpayOrderId: 'order_1',
      razorpayPaymentId: 'pay_1',
      razorpaySignature: signature,
    });

    expect(response).toEqual({
      verified: true,
      alreadyProcessed: true,
      plan: 'PREMIUM',
      cycle: 'monthly',
      activeUntil: activeUntil.toISOString(),
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
