import { describe, expect, it, vi } from 'vitest';
import { PublicService } from '../../src/modules/public/public.service';

describe('PublicService.createNewsletterSubmission', () => {
  it('returns already subscribed when email already exists', async () => {
    const existing = {
      id: 'sub_existing',
      email: 'user@example.com',
      source: 'global_cta',
      pagePath: '/',
      createdAt: new Date('2026-03-28T07:10:00.000Z'),
    };

    const findFirst = vi.fn().mockResolvedValue(existing);
    const create = vi.fn();

    const prisma = {
      newsletterSubmission: {
        findFirst,
        create,
      },
    } as unknown as ConstructorParameters<typeof PublicService>[0];

    const configService = {
      getOrThrow: vi.fn().mockReturnValue('test-secret'),
    } as unknown as ConstructorParameters<typeof PublicService>[1];

    const service = new PublicService(prisma, configService);

    const response = await service.createNewsletterSubmission({
      email: ' USER@Example.com ',
      source: 'global_cta',
      pagePath: '/',
    });

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'user@example.com' },
      }),
    );
    expect(create).not.toHaveBeenCalled();
    expect(response).toEqual(
      expect.objectContaining({
        ok: true,
        alreadySubscribed: true,
        message: 'This email is already subscribed.',
        item: existing,
      }),
    );
  });

  it('creates a submission for a new email', async () => {
    const created = {
      id: 'sub_new',
      email: 'new@example.com',
      source: 'prompt_sidebar',
      pagePath: '/uncategorized/sample',
      createdAt: new Date('2026-03-28T07:12:00.000Z'),
    };

    const findFirst = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue(created);

    const prisma = {
      newsletterSubmission: {
        findFirst,
        create,
      },
    } as unknown as ConstructorParameters<typeof PublicService>[0];

    const configService = {
      getOrThrow: vi.fn().mockReturnValue('test-secret'),
    } as unknown as ConstructorParameters<typeof PublicService>[1];

    const service = new PublicService(prisma, configService);

    const response = await service.createNewsletterSubmission({
      email: 'new@example.com',
      source: 'prompt_sidebar',
      pagePath: '/uncategorized/sample',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          email: 'new@example.com',
          source: 'prompt_sidebar',
          pagePath: '/uncategorized/sample',
        },
      }),
    );
    expect(response).toEqual(
      expect.objectContaining({
        ok: true,
        alreadySubscribed: false,
        message: 'Subscribed successfully. Thanks for joining.',
        item: created,
      }),
    );
  });
});
