import { MembershipPlan, PromptVisibility, UserRole } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PublicService } from '../../src/modules/public/public.service';

function createService(
  prismaOverride?: Partial<ConstructorParameters<typeof PublicService>[0]>,
) {
  const prisma = (prismaOverride ?? {}) as ConstructorParameters<typeof PublicService>[0];
  const configService = {
    getOrThrow: vi.fn().mockReturnValue('test-secret'),
  } as unknown as ConstructorParameters<typeof PublicService>[1];
  return new PublicService(prisma, configService);
}

function createViewer(role: UserRole, plan: MembershipPlan) {
  return {
    sub: 'user_1',
    email: 'user@example.com',
    role,
    plan,
    permissions: [],
  } as const;
}

describe('PublicService exclusive access policy', () => {
  it('allows premium members', () => {
    const service = createService();
    const canAccessExclusiveContent = (
      service as unknown as { canAccessExclusiveContent: (viewer?: unknown) => boolean }
    ).canAccessExclusiveContent.bind(service);

    expect(canAccessExclusiveContent(createViewer(UserRole.USER, MembershipPlan.PREMIUM))).toBe(
      true,
    );
  });

  it('allows admin and superadmin regardless of plan', () => {
    const service = createService();
    const canAccessExclusiveContent = (
      service as unknown as { canAccessExclusiveContent: (viewer?: unknown) => boolean }
    ).canAccessExclusiveContent.bind(service);

    expect(canAccessExclusiveContent(createViewer(UserRole.ADMIN, MembershipPlan.FREE))).toBe(true);
    expect(canAccessExclusiveContent(createViewer(UserRole.SUPERADMIN, MembershipPlan.FREE))).toBe(
      true,
    );
  });

  it('denies non-premium user/editor/moderator roles', () => {
    const service = createService();
    const canAccessExclusiveContent = (
      service as unknown as { canAccessExclusiveContent: (viewer?: unknown) => boolean }
    ).canAccessExclusiveContent.bind(service);

    expect(canAccessExclusiveContent(createViewer(UserRole.USER, MembershipPlan.FREE))).toBe(false);
    expect(canAccessExclusiveContent(createViewer(UserRole.EDITOR, MembershipPlan.FREE))).toBe(
      false,
    );
    expect(canAccessExclusiveContent(createViewer(UserRole.MODERATOR, MembershipPlan.FREE))).toBe(
      false,
    );
  });

  it('uses FREE-only filtering in viewer mode for non-premium users', () => {
    const service = createService();
    const buildPublicPromptWhere = (
      service as unknown as {
        buildPublicPromptWhere: (options: Record<string, unknown>, viewer?: unknown, mode?: string) => {
          AND?: Array<Record<string, unknown>>;
        };
      }
    ).buildPublicPromptWhere.bind(service);

    const where = buildPublicPromptWhere(
      {},
      createViewer(UserRole.USER, MembershipPlan.FREE),
      'viewer',
    );
    const filters = Array.isArray(where.AND) ? where.AND : [];

    expect(filters).toContainEqual({ visibility: PromptVisibility.FREE });
  });

  it('does not force FREE visibility in discover mode for non-premium users', () => {
    const service = createService();
    const buildPublicPromptWhere = (
      service as unknown as {
        buildPublicPromptWhere: (options: Record<string, unknown>, viewer?: unknown, mode?: string) => {
          AND?: Array<Record<string, unknown>>;
        };
      }
    ).buildPublicPromptWhere.bind(service);
    const buildPublicPostWhere = (
      service as unknown as {
        buildPublicPostWhere: (options: Record<string, unknown>, viewer?: unknown, mode?: string) => {
          AND?: Array<Record<string, unknown>>;
        };
      }
    ).buildPublicPostWhere.bind(service);

    const promptWhere = buildPublicPromptWhere(
      {},
      createViewer(UserRole.USER, MembershipPlan.FREE),
      'discover',
    );
    const postWhere = buildPublicPostWhere(
      {},
      createViewer(UserRole.USER, MembershipPlan.FREE),
      'discover',
    );
    const promptFilters = Array.isArray(promptWhere.AND) ? promptWhere.AND : [];
    const postFilters = Array.isArray(postWhere.AND) ? postWhere.AND : [];

    expect(promptFilters).not.toContainEqual({ visibility: PromptVisibility.FREE });
    expect(postFilters).not.toContainEqual({ visibility: PromptVisibility.FREE });
  });

  it('refreshes stale FREE viewer claims to PREMIUM from latest user record', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          email: 'user@example.com',
          role: UserRole.USER,
          plan: MembershipPlan.PREMIUM,
          suspendedAt: null,
        }),
      },
    } as unknown as ConstructorParameters<typeof PublicService>[0];
    const service = createService(prisma);
    const resolveViewerForExclusiveAccess = (
      service as unknown as {
        resolveViewerForExclusiveAccess: (
          viewer?: unknown,
          prismaClient?: unknown,
        ) => Promise<unknown>;
      }
    ).resolveViewerForExclusiveAccess.bind(service);
    const canAccessExclusiveContent = (
      service as unknown as { canAccessExclusiveContent: (viewer?: unknown) => boolean }
    ).canAccessExclusiveContent.bind(service);

    const staleViewer = createViewer(UserRole.USER, MembershipPlan.FREE);
    const resolvedViewer = (await resolveViewerForExclusiveAccess(staleViewer, prisma)) as {
      plan: MembershipPlan;
    };

    expect(resolvedViewer.plan).toBe(MembershipPlan.PREMIUM);
    expect(canAccessExclusiveContent(resolvedViewer)).toBe(true);
  });

  it('drops inline or oversized media URLs from prompt summaries', () => {
    const service = createService();
    const toPromptSummary = (
      service as unknown as {
        toPromptSummary: (
          prompt: Record<string, unknown>,
          commentCount: number,
          viewer?: unknown,
          options?: { compact?: boolean },
        ) => { image: string | null; galleryImages: string[] };
      }
    ).toPromptSummary.bind(service);

    const summary = toPromptSummary(
      {
        id: 'p_1',
        slug: 'prompt-1',
        title: 'Prompt',
        description: 'Description',
        promptType: 'CONTENT',
        visibility: PromptVisibility.FREE,
        featuredImageUrl: `data:image/png;base64,${'x'.repeat(5000)}`,
        metaTitle: null,
        metaDescription: null,
        galleryImageUrls: [
          `data:image/png;base64,${'x'.repeat(5000)}`,
          'https://cdn.example.com/image.png',
        ],
        publishedAt: new Date('2026-03-30T00:00:00.000Z'),
        updatedAt: new Date('2026-03-30T00:00:00.000Z'),
        viewCount: 0,
        likeCount: 0,
        saveCount: 0,
        seoNoIndex: false,
        author: {
          id: 'u_1',
          name: 'Author',
          handle: 'author',
          avatarUrl: null,
          avatarUpdatedAt: null,
        },
        primaryCategory: { id: 'c_1', name: 'Category', slug: 'category' },
        categories: [{ id: 'c_1', name: 'Category', slug: 'category' }],
        tags: [],
      },
      0,
      undefined,
      { compact: true },
    );

    expect(summary.image).toBeNull();
    expect(summary.galleryImages).toEqual(['https://cdn.example.com/image.png']);
  });
});
