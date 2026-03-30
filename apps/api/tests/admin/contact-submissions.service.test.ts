import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ContactSubmissionsService } from '../../src/modules/admin/contact-submissions/contact-submissions.service';

describe('ContactSubmissionsService.findAll', () => {
  it('applies filters, pagination, and sort order', async () => {
    const queryRaw = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'contact_1',
          name: 'Alex',
          email: 'alex@example.com',
          subject: 'Support',
          status: 'NEW',
          source: 'contact_page',
          pagePath: '/contact',
          createdAt: new Date('2026-03-30T12:00:00.000Z'),
          reviewedAt: null,
        },
      ])
      .mockResolvedValueOnce([{ total: BigInt(8) }])
      .mockResolvedValueOnce([{ source: 'contact_page' }]);

    const prisma = {
      $queryRaw: queryRaw,
    } as unknown as ConstructorParameters<typeof ContactSubmissionsService>[0];

    const service = new ContactSubmissionsService(prisma);
    const response = await service.findAll({
      skip: 20,
      take: 10,
      search: 'alex',
      status: 'NEW',
      source: 'contact_page',
      from: '2026-03-01',
      to: '2026-03-30',
      sort: 'oldest',
    });

    expect(queryRaw).toHaveBeenCalledTimes(3);
    expect(response.total).toBe(8);
    expect(response.items).toHaveLength(1);
    expect(response.sources).toEqual(['contact_page']);
    expect(response.statuses).toEqual(['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM']);
  });
});

describe('ContactSubmissionsService.update', () => {
  it('updates status and note while stamping reviewer metadata', async () => {
    const executeRaw = vi.fn().mockResolvedValue(1);
    const queryRaw = vi.fn().mockResolvedValue([
      {
        id: 'contact_1',
        name: 'Alex',
        email: 'alex@example.com',
        subject: 'Support',
        message: 'Need billing help',
        status: 'RESOLVED',
        internalNote: 'Resolved via email',
        source: 'contact_page',
        pagePath: '/contact',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date('2026-03-30T12:00:00.000Z'),
        updatedAt: new Date('2026-03-30T12:15:00.000Z'),
        reviewedAt: new Date('2026-03-30T12:15:00.000Z'),
        reviewedById: 'user_1',
        reviewedByName: 'Admin',
        reviewedByEmail: 'admin@example.com',
      },
    ]);

    const prisma = {
      $executeRaw: executeRaw,
      $queryRaw: queryRaw,
    } as unknown as ConstructorParameters<typeof ContactSubmissionsService>[0];

    const service = new ContactSubmissionsService(prisma);
    const response = await service.update(
      'contact_1',
      {
        status: 'RESOLVED',
        internalNote: 'Resolved via email',
        hasInternalNote: true,
      },
      'user_1',
    );

    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(response).toEqual(
      expect.objectContaining({
        id: 'contact_1',
        status: 'RESOLVED',
        internalNote: 'Resolved via email',
        reviewedBy: {
          id: 'user_1',
          name: 'Admin',
          email: 'admin@example.com',
        },
      }),
    );
  });

  it('rejects empty updates', async () => {
    const prisma = {
      $executeRaw: vi.fn(),
      $queryRaw: vi.fn(),
    } as unknown as ConstructorParameters<typeof ContactSubmissionsService>[0];

    const service = new ContactSubmissionsService(prisma);

    await expect(service.update('contact_1', {}, 'user_1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws not found for missing submissions', async () => {
    const executeRaw = vi.fn().mockResolvedValue(0);
    const prisma = {
      $executeRaw: executeRaw,
      $queryRaw: vi.fn(),
    } as unknown as ConstructorParameters<typeof ContactSubmissionsService>[0];

    const service = new ContactSubmissionsService(prisma);

    await expect(
      service.update('missing', { status: 'IN_PROGRESS' }, 'user_1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
