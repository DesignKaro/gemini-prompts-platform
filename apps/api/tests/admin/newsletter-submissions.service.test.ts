import { describe, expect, it, vi } from 'vitest';
import { NewsletterService } from '../../src/modules/admin/newsletter/newsletter.service';

describe('NewsletterService.findAll', () => {
  it('applies filters, pagination, and sort order', async () => {
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'sub_1',
          email: 'one@example.com',
          source: 'global_cta',
          pagePath: '/prompts',
          createdAt: new Date('2026-03-28T08:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([{ source: 'global_cta' }, { source: 'prompt_sidebar' }]);
    const count = vi.fn().mockResolvedValue(42);
    const prisma = {
      newsletterSubmission: {
        findMany,
        count,
      },
    } as unknown as ConstructorParameters<typeof NewsletterService>[0];

    const service = new NewsletterService(prisma);
    const response = await service.findAll({
      skip: 20,
      take: 10,
      search: 'example.com',
      source: 'global_cta',
      from: '2026-03-01',
      to: '2026-03-28',
      sort: 'oldest',
    });

    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        skip: 20,
        take: 10,
        orderBy: { createdAt: 'asc' },
        where: expect.objectContaining({
          source: 'global_cta',
          OR: [
            { email: { contains: 'example.com' } },
            { source: { contains: 'example.com' } },
            { pagePath: { contains: 'example.com' } },
          ],
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    );
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.any(Object),
      }),
    );

    expect(response.total).toBe(42);
    expect(response.items).toHaveLength(1);
    expect(response.sources).toEqual(['global_cta', 'prompt_sidebar']);
  });
});
