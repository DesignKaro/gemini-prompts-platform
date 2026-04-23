import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { UsersService } from '../../src/modules/admin/users/users.service';

type CountTarget = {
  prompt: { count: ReturnType<typeof vi.fn> };
  post: { count: ReturnType<typeof vi.fn> };
  collab: { count: ReturnType<typeof vi.fn> };
  submission: { count: ReturnType<typeof vi.fn>; updateMany?: ReturnType<typeof vi.fn> };
  transaction: { count: ReturnType<typeof vi.fn>; updateMany?: ReturnType<typeof vi.fn> };
  subscription: { count: ReturnType<typeof vi.fn>; updateMany?: ReturnType<typeof vi.fn> };
};

function createPrismaMock() {
  const tx = {
    prompt: { count: vi.fn(), updateMany: vi.fn() },
    post: { count: vi.fn(), updateMany: vi.fn() },
    collab: { count: vi.fn(), updateMany: vi.fn() },
    submission: { count: vi.fn(), updateMany: vi.fn() },
    transaction: { count: vi.fn(), updateMany: vi.fn() },
    subscription: { count: vi.fn(), updateMany: vi.fn() },
    comment: { updateMany: vi.fn() },
    mediaAsset: { updateMany: vi.fn() },
    auditLog: { updateMany: vi.fn() },
    engagementEvent: { updateMany: vi.fn() },
    promptLike: { deleteMany: vi.fn() },
    commentLike: { deleteMany: vi.fn() },
    savedPrompt: { deleteMany: vi.fn() },
    authorFollow: { deleteMany: vi.fn() },
    userRoleAssignment: { deleteMany: vi.fn() },
    authAccount: { deleteMany: vi.fn() },
    refreshToken: { deleteMany: vi.fn() },
    passwordCredential: { deleteMany: vi.fn() },
    user: { delete: vi.fn() },
  };

  const prisma = {
    user: { findUnique: vi.fn() },
    prompt: { count: vi.fn() },
    post: { count: vi.fn() },
    collab: { count: vi.fn() },
    submission: { count: vi.fn() },
    transaction: { count: vi.fn() },
    subscription: { count: vi.fn() },
    $transaction: vi.fn(async (input: unknown) => {
      if (typeof input === 'function') {
        return input(tx);
      }
      return Promise.all(input as Promise<unknown>[]);
    }),
  };

  return { prisma, tx };
}

function setOwnedCounts(
  target: CountTarget,
  counts: {
    prompts: number;
    posts: number;
    collabs: number;
    submissions: number;
    transactions: number;
    subscriptions: number;
  },
) {
  target.prompt.count.mockResolvedValue(counts.prompts);
  target.post.count.mockResolvedValue(counts.posts);
  target.collab.count.mockResolvedValue(counts.collabs);
  target.submission.count.mockResolvedValue(counts.submissions);
  target.transaction.count.mockResolvedValue(counts.transactions);
  target.subscription.count.mockResolvedValue(counts.subscriptions);
}

function resolveCleanupMutations(tx: ReturnType<typeof createPrismaMock>['tx']) {
  tx.prompt.updateMany.mockResolvedValue({ count: 0 });
  tx.post.updateMany.mockResolvedValue({ count: 0 });
  tx.collab.updateMany.mockResolvedValue({ count: 0 });
  tx.submission.updateMany.mockResolvedValue({ count: 0 });
  tx.transaction.updateMany.mockResolvedValue({ count: 0 });
  tx.subscription.updateMany.mockResolvedValue({ count: 0 });
  tx.comment.updateMany.mockResolvedValue({ count: 0 });
  tx.mediaAsset.updateMany.mockResolvedValue({ count: 0 });
  tx.auditLog.updateMany.mockResolvedValue({ count: 0 });
  tx.engagementEvent.updateMany.mockResolvedValue({ count: 0 });
  tx.promptLike.deleteMany.mockResolvedValue({ count: 0 });
  tx.commentLike.deleteMany.mockResolvedValue({ count: 0 });
  tx.savedPrompt.deleteMany.mockResolvedValue({ count: 0 });
  tx.authorFollow.deleteMany.mockResolvedValue({ count: 0 });
  tx.userRoleAssignment.deleteMany.mockResolvedValue({ count: 0 });
  tx.authAccount.deleteMany.mockResolvedValue({ count: 0 });
  tx.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
  tx.passwordCredential.deleteMany.mockResolvedValue({ count: 0 });
}

describe('UsersService delete transfer flow', () => {
  it('returns owned record counts for the delete impact preview', async () => {
    const { prisma } = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ id: 'user_1' });
    setOwnedCounts(prisma, {
      prompts: 1,
      posts: 2,
      collabs: 0,
      submissions: 3,
      transactions: 4,
      subscriptions: 0,
    });

    const service = new UsersService(prisma as never);
    const impact = await service.getDeleteImpact('user_1');

    expect(impact).toEqual({
      owned: {
        prompts: 1,
        posts: 2,
        collabs: 0,
        submissions: 3,
        transactions: 4,
        subscriptions: 0,
        total: 10,
      },
      requiresTransfer: true,
    });
  });

  it('transfers owned records before deleting the user', async () => {
    const { prisma, tx } = createPrismaMock();
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: 'user_1',
        email: 'creator@example.com',
        role: UserRole.USER,
      })
      .mockResolvedValueOnce({
        id: 'user_2',
      });
    setOwnedCounts(tx, {
      prompts: 1,
      posts: 1,
      collabs: 1,
      submissions: 1,
      transactions: 1,
      subscriptions: 1,
    });
    resolveCleanupMutations(tx);
    tx.user.delete.mockResolvedValue({ id: 'user_1' });

    const service = new UsersService(prisma as never);
    const deleted = await service.remove(
      { sub: 'admin_1', role: UserRole.ADMIN } as never,
      'user_1',
      { transferToUserId: 'user_2' },
    );

    expect(tx.prompt.updateMany).toHaveBeenCalledWith({
      where: { authorId: 'user_1' },
      data: { authorId: 'user_2' },
    });
    expect(tx.post.updateMany).toHaveBeenCalledWith({
      where: { authorId: 'user_1' },
      data: { authorId: 'user_2' },
    });
    expect(tx.collab.updateMany).toHaveBeenCalledWith({
      where: { authorId: 'user_1' },
      data: { authorId: 'user_2' },
    });
    expect(tx.submission.updateMany).toHaveBeenNthCalledWith(1, {
      where: { submittedById: 'user_1' },
      data: { submittedById: 'user_2' },
    });
    expect(tx.submission.updateMany).toHaveBeenNthCalledWith(2, {
      where: { reviewerId: 'user_1' },
      data: { reviewerId: null },
    });
    expect(tx.transaction.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      data: { userId: 'user_2' },
    });
    expect(tx.subscription.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      data: { userId: 'user_2' },
    });
    expect(tx.commentLike.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user_1' } });
    expect(tx.authorFollow.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [{ followerId: 'user_1' }, { authorId: 'user_1' }],
      },
    });
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 'user_1' } });
    expect(deleted).toEqual({ id: 'user_1' });
  });

  it('requires a transfer target when the user still owns records', async () => {
    const { prisma, tx } = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'creator@example.com',
      role: UserRole.USER,
    });
    setOwnedCounts(tx, {
      prompts: 0,
      posts: 0,
      collabs: 0,
      submissions: 1,
      transactions: 0,
      subscriptions: 0,
    });

    const service = new UsersService(prisma as never);
    const result = service.remove({ sub: 'admin_1', role: UserRole.ADMIN } as never, 'user_1');

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await result.catch((error: BadRequestException) => {
      const response = error.getResponse() as { message: string; code: string };
      expect(response.code).toBe('USER_TRANSFER_REQUIRED');
      expect(response.message).toContain('Submissions: 1');
    });
  });
});
