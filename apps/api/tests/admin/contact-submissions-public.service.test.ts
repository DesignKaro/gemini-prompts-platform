import { describe, expect, it, vi } from 'vitest';
import { PublicService } from '../../src/modules/public/public.service';

describe('PublicService.createContactSubmission', () => {
  it('returns already submitted when duplicate exists in last 10 minutes', async () => {
    const existing = {
      id: 'contact_1',
      name: 'Alex',
      email: 'alex@example.com',
      subject: 'Support',
      status: 'NEW',
      source: 'contact_page',
      pagePath: '/contact',
      createdAt: new Date('2026-03-30T10:00:00.000Z'),
    };

    const queryRaw = vi.fn().mockResolvedValueOnce([existing]);
    const executeRaw = vi.fn();

    const prisma = {
      $queryRaw: queryRaw,
      $executeRaw: executeRaw,
    } as unknown as ConstructorParameters<typeof PublicService>[0];

    const configService = {
      getOrThrow: vi.fn().mockReturnValue('test-secret'),
    } as unknown as ConstructorParameters<typeof PublicService>[1];

    const service = new PublicService(prisma, configService);

    const response = await service.createContactSubmission({
      name: ' Alex ',
      email: ' ALEX@Example.com ',
      subject: ' Support ',
      message: 'Need billing help',
      source: 'contact_page',
      pagePath: '/contact',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    });

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(executeRaw).not.toHaveBeenCalled();
    expect(response).toEqual(
      expect.objectContaining({
        ok: true,
        alreadySubmitted: true,
        item: existing,
      }),
    );
  });

  it('creates a new contact submission when no duplicate exists', async () => {
    const created = {
      id: 'contact_2',
      name: 'Jamie',
      email: 'jamie@example.com',
      subject: 'Partnership',
      status: 'NEW',
      source: 'contact_page',
      pagePath: '/contact',
      createdAt: new Date('2026-03-30T10:10:00.000Z'),
    };

    const queryRaw = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([created]);
    const executeRaw = vi.fn().mockResolvedValue(1);

    const prisma = {
      $queryRaw: queryRaw,
      $executeRaw: executeRaw,
    } as unknown as ConstructorParameters<typeof PublicService>[0];

    const configService = {
      getOrThrow: vi.fn().mockReturnValue('test-secret'),
    } as unknown as ConstructorParameters<typeof PublicService>[1];

    const service = new PublicService(prisma, configService);

    const response = await service.createContactSubmission({
      name: 'Jamie',
      email: 'jamie@example.com',
      subject: 'Partnership',
      message: 'Need partnership details',
      source: 'contact_page',
      pagePath: '/contact',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    });

    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(response).toEqual(
      expect.objectContaining({
        ok: true,
        alreadySubmitted: false,
        item: created,
      }),
    );
  });
});
