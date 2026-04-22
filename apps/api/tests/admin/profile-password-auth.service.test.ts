import { BadRequestException } from '@nestjs/common';
import { MembershipPlan, UserRole } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/modules/auth/utils/password.util';
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

function createMediaStorageService() {
  return {
    maybeUploadImageDataUrl: vi.fn(async (value: string | null | undefined) => value ?? null),
  } as unknown as ConstructorParameters<typeof AuthService>[2];
}

function createUser(params?: {
  passwordCredential?: { userId: string; passwordHash: string } | { userId: string } | null;
}) {
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
    passwordCredential: params?.passwordCredential ?? null,
    suspendedAt: null,
    role: UserRole.USER,
    plan: MembershipPlan.FREE,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthService profile password update flow', () => {
  it('rejects password change when previous password is incorrect', async () => {
    const oldPasswordHash = await hashPassword('old-password-123');
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(
          createUser({
            passwordCredential: {
              userId: 'user_1',
              passwordHash: oldPasswordHash,
            },
          }),
        ),
      },
      passwordCredential: {
        update: vi.fn(),
      },
    } as unknown as ConstructorParameters<typeof AuthService>[0];

    const service = new AuthService(prisma, createConfigService(), createMediaStorageService());
    await expect(
      service.updateProfile('user_1', {
        previousPassword: 'wrong-old-password',
        newPassword: 'new-password-123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.passwordCredential.update).not.toHaveBeenCalled();
  });

  it('updates password hash when previous password is valid', async () => {
    const oldPassword = 'old-password-123';
    const oldPasswordHash = await hashPassword(oldPassword);
    const passwordUpdate = vi.fn();
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(
          createUser({
            passwordCredential: {
              userId: 'user_1',
              passwordHash: oldPasswordHash,
            },
          }),
        ),
        update: vi.fn().mockResolvedValue(
          createUser({
            passwordCredential: {
              userId: 'user_1',
            },
          }),
        ),
      },
      passwordCredential: {
        update: passwordUpdate,
      },
      authAccount: {
        upsert: vi.fn(),
      },
      mediaUsage: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    } as unknown as ConstructorParameters<typeof AuthService>[0];

    const service = new AuthService(prisma, createConfigService(), createMediaStorageService());
    const result = await service.updateProfile('user_1', {
      previousPassword: oldPassword,
      newPassword: 'new-password-123',
    });

    const newHash = passwordUpdate.mock.calls[0]?.[0]?.data?.passwordHash;
    expect(typeof newHash).toBe('string');
    expect(await verifyPassword('new-password-123', newHash)).toBe(true);
    expect(result.user.hasPassword).toBe(true);
  });

  it('rejects setting a first password when confirm password does not match', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(createUser({ passwordCredential: null })),
      },
      passwordCredential: {
        create: vi.fn(),
      },
      authAccount: {
        upsert: vi.fn(),
      },
    } as unknown as ConstructorParameters<typeof AuthService>[0];

    const service = new AuthService(prisma, createConfigService(), createMediaStorageService());
    await expect(
      service.updateProfile('user_1', {
        newPassword: 'new-password-123',
        confirmPassword: 'different-password',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.passwordCredential.create).not.toHaveBeenCalled();
    expect(prisma.authAccount.upsert).not.toHaveBeenCalled();
  });

  it('creates password credential for user without password when new+confirm are valid', async () => {
    const passwordCreate = vi.fn();
    const authAccountUpsert = vi.fn();
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(createUser({ passwordCredential: null })),
        update: vi.fn().mockResolvedValue(
          createUser({
            passwordCredential: {
              userId: 'user_1',
            },
          }),
        ),
      },
      passwordCredential: {
        create: passwordCreate,
      },
      authAccount: {
        upsert: authAccountUpsert,
      },
      mediaUsage: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    } as unknown as ConstructorParameters<typeof AuthService>[0];

    const service = new AuthService(prisma, createConfigService(), createMediaStorageService());
    const result = await service.updateProfile('user_1', {
      newPassword: 'new-password-123',
      confirmPassword: 'new-password-123',
    });

    expect(passwordCreate).toHaveBeenCalledTimes(1);
    expect(authAccountUpsert).toHaveBeenCalledTimes(1);
    expect(result.user.hasPassword).toBe(true);
  });

  it('keeps profile-only updates working without password fields', async () => {
    const passwordUpdate = vi.fn();
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(
          createUser({
            passwordCredential: {
              userId: 'user_1',
              passwordHash: 'salt:hash',
            },
          }),
        ),
        update: vi.fn().mockResolvedValue(
          createUser({
            passwordCredential: {
              userId: 'user_1',
            },
          }),
        ),
      },
      passwordCredential: {
        update: passwordUpdate,
      },
      mediaUsage: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    } as unknown as ConstructorParameters<typeof AuthService>[0];

    const service = new AuthService(prisma, createConfigService(), createMediaStorageService());
    const result = await service.updateProfile('user_1', {
      name: 'Updated User',
      profileTitle: 'Creator',
      bio: 'Updated bio',
    });

    expect(passwordUpdate).not.toHaveBeenCalled();
    expect(result.user.hasPassword).toBe(true);
  });
});

describe('AuthService Google first login avatar normalization', () => {
  it('normalizes avatar URL before storing new Google user', async () => {
    const tx = {
      authAccount: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(
          createUser({
            passwordCredential: null,
          }),
        ),
      },
    };

    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    } as unknown as ConstructorParameters<typeof AuthService>[0];

    const service = new AuthService(prisma, createConfigService(), createMediaStorageService());
    vi.spyOn(service as unknown as { verifyGoogleProfile: (...args: unknown[]) => Promise<unknown> }, 'verifyGoogleProfile').mockResolvedValue({
      sub: 'google-sub-1',
      email: 'user@example.com',
      emailVerified: true,
      name: 'Google User',
      picture: 'http://lh3.googleusercontent.com/photo',
    });
    vi.spyOn(service as unknown as { issueSession: (...args: unknown[]) => Promise<unknown> }, 'issueSession').mockResolvedValue({
      user: createUser({ passwordCredential: null }),
      accessToken: 'token',
      accessTokenExpiresAt: new Date().toISOString(),
      refreshToken: 'refresh',
    });

    await service.exchangeGoogleToken(
      { idToken: 'id-token' },
      {},
      {
        cookie: () => undefined,
        clearCookie: () => undefined,
      },
    );

    const createCall = tx.user.create.mock.calls[0]?.[0];
    expect(createCall.data.avatarUrl).toBe('https://lh3.googleusercontent.com/photo');
    expect(createCall.data.avatarUpdatedAt).toBeInstanceOf(Date);
  });
});
