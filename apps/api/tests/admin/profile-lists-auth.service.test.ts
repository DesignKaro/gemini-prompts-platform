import { MembershipPlan, UserRole } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../src/modules/auth/auth.service';

function createConfigService() {
  return {
    getOrThrow: vi.fn((key: string) => {
      switch (key) {
        case 'JWT_SECRET':
          return 'jwt-secret';
        case 'JWT_ACCESS_TTL_SECONDS':
          return 900;
        case 'REFRESH_TOKEN_TTL_DAYS':
          return 30;
        case 'GOOGLE_CLIENT_ID':
          return 'google-client-id';
        case 'NODE_ENV':
          return 'test';
        default:
          throw new Error(`Unexpected config key: ${key}`);
      }
    }),
  } as unknown as ConstructorParameters<typeof AuthService>[1];
}

function createUserSelectResult() {
  return {
    id: 'user_1',
    email: 'user@example.com',
    name: 'Test User',
    handle: 'test-user',
    profileTitle: null,
    bio: null,
    focusTags: [],
    avatarUrl: null,
    avatarUpdatedAt: null,
    suspendedAt: null,
    role: UserRole.USER,
    plan: MembershipPlan.FREE,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthService profile lists', () => {
  it('includes stable ids and slugs in profile summary payload', async () => {
    const savedAt = new Date('2026-03-29T11:00:00.000Z');
    const likedAt = new Date('2026-03-29T10:00:00.000Z');
    const createdAt = new Date('2026-03-29T09:00:00.000Z');

    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(createUserSelectResult()),
      },
      prompt: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'prompt_created_1',
            title: 'Created prompt',
            slug: 'created-prompt',
            featuredImageUrl: null,
            createdAt,
          },
        ]),
      },
      savedPrompt: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ userId: 'audience_1' }])
          .mockResolvedValueOnce([
            {
              promptId: 'prompt_saved_1',
              createdAt: savedAt,
              prompt: {
                id: 'prompt_saved_1',
                title: 'Saved prompt',
                slug: 'saved-prompt',
                promptType: 'CONTENT',
                featuredImageUrl: null,
              },
            },
          ]),
      },
      promptLike: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            promptId: 'prompt_liked_1',
            createdAt: likedAt,
            prompt: {
              title: 'Liked prompt',
              slug: 'liked-prompt',
              featuredImageUrl: null,
            },
          },
        ]),
      },
      $transaction: vi.fn(async (input: unknown[]) => Promise.all(input)),
    } as unknown as ConstructorParameters<typeof AuthService>[0];

    const service = new AuthService(prisma, createConfigService());
    const summary = await service.getProfileSummary('user_1');

    expect(summary.recentActivity[0]).toEqual({
      id: `save:prompt_saved_1:${savedAt.toISOString()}`,
      type: 'SAVE',
      promptTitle: 'Saved prompt',
      promptSlug: 'saved-prompt',
      promptImage: null,
      createdAt: savedAt.toISOString(),
    });
    expect(summary.savedPrompts[0]).toEqual({
      id: 'prompt_saved_1',
      title: 'Saved prompt',
      slug: 'saved-prompt',
      promptType: 'CONTENT',
      image: null,
      savedAt: savedAt.toISOString(),
    });

    expect(summary.recentActivity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: `like:prompt_liked_1:${likedAt.toISOString()}`,
          promptSlug: 'liked-prompt',
        }),
        expect.objectContaining({
          id: 'create:prompt_created_1',
          promptSlug: 'created-prompt',
        }),
      ]),
    );
  });

  it('returns paginated activity sorted by latest first', async () => {
    const savedNewest = new Date('2026-03-29T11:59:00.000Z');
    const savedOlder = new Date('2026-03-29T11:40:00.000Z');
    const likedNewest = new Date('2026-03-29T11:55:00.000Z');
    const likedOlder = new Date('2026-03-29T11:35:00.000Z');
    const createdMid = new Date('2026-03-29T11:50:00.000Z');

    const savedFindMany = vi.fn().mockResolvedValue([
      {
        promptId: 'prompt_save_new',
        createdAt: savedNewest,
        prompt: { title: 'Save New', slug: 'save-new', featuredImageUrl: null },
      },
      {
        promptId: 'prompt_save_old',
        createdAt: savedOlder,
        prompt: { title: 'Save Old', slug: 'save-old', featuredImageUrl: null },
      },
    ]);
    const likedFindMany = vi.fn().mockResolvedValue([
      {
        promptId: 'prompt_like_new',
        createdAt: likedNewest,
        prompt: { title: 'Like New', slug: 'like-new', featuredImageUrl: null },
      },
      {
        promptId: 'prompt_like_old',
        createdAt: likedOlder,
        prompt: { title: 'Like Old', slug: 'like-old', featuredImageUrl: null },
      },
    ]);
    const promptFindMany = vi.fn().mockResolvedValue([
      {
        id: 'prompt_create_mid',
        title: 'Create Mid',
        slug: 'create-mid',
        featuredImageUrl: null,
        createdAt: createdMid,
      },
    ]);

    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'user_1' }),
      },
      savedPrompt: {
        count: vi.fn().mockResolvedValue(2),
        findMany: savedFindMany,
      },
      promptLike: {
        count: vi.fn().mockResolvedValue(2),
        findMany: likedFindMany,
      },
      prompt: {
        count: vi.fn().mockResolvedValue(1),
        findMany: promptFindMany,
      },
      $transaction: vi.fn(async (input: unknown[]) => Promise.all(input)),
    } as unknown as ConstructorParameters<typeof AuthService>[0];

    const service = new AuthService(prisma, createConfigService());
    const response = await service.getProfileActivity('user_1', 1, 2);

    expect(response.total).toBe(5);
    expect(response.items).toHaveLength(2);
    expect(response.items[0].id).toBe(`like:prompt_like_new:${likedNewest.toISOString()}`);
    expect(response.items[1].id).toBe('create:prompt_create_mid');

    expect(savedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
      }),
    );
    expect(likedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
      }),
    );
    expect(promptFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
      }),
    );
  });

  it('returns paginated saved prompts with slugs', async () => {
    const savedAt = new Date('2026-03-29T12:00:00.000Z');
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'user_1' }),
      },
      savedPrompt: {
        count: vi.fn().mockResolvedValue(3),
        findMany: vi.fn().mockResolvedValue([
          {
            createdAt: savedAt,
            prompt: {
              id: 'prompt_1',
              title: 'Prompt One',
              slug: 'prompt-one',
              promptType: 'CONTENT',
              featuredImageUrl: null,
            },
          },
          {
            createdAt: savedAt,
            prompt: {
              id: 'prompt_2',
              title: 'Prompt Two',
              slug: 'prompt-two',
              promptType: 'IMAGE',
              featuredImageUrl: 'https://example.com/image.jpg',
            },
          },
        ]),
      },
      $transaction: vi.fn(async (input: unknown[]) => Promise.all(input)),
    } as unknown as ConstructorParameters<typeof AuthService>[0];

    const service = new AuthService(prisma, createConfigService());
    const response = await service.getProfileSavedPrompts('user_1', 1, 2);

    expect(response.total).toBe(3);
    expect(response.items).toEqual([
      {
        id: 'prompt_1',
        title: 'Prompt One',
        slug: 'prompt-one',
        promptType: 'CONTENT',
        image: null,
        savedAt: savedAt.toISOString(),
      },
      {
        id: 'prompt_2',
        title: 'Prompt Two',
        slug: 'prompt-two',
        promptType: 'IMAGE',
        image: 'https://example.com/image.jpg',
        savedAt: savedAt.toISOString(),
      },
    ]);
  });
});
