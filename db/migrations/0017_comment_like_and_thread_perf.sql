-- Add comment likes and thread/list performance indexes.

ALTER TABLE `Comment`
  ADD COLUMN `likeCount` INTEGER NOT NULL DEFAULT 0;

CREATE TABLE `CommentLike` (
  `commentId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `CommentLike_createdAt_idx`(`createdAt`),
  INDEX `CommentLike_userId_createdAt_idx`(`userId`, `createdAt`),
  PRIMARY KEY (`commentId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommentLikeIp` (
  `commentId` VARCHAR(191) NOT NULL,
  `ipHash` VARCHAR(64) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `CommentLikeIp_createdAt_idx`(`createdAt`),
  INDEX `CommentLikeIp_ipHash_idx`(`ipHash`),
  PRIMARY KEY (`commentId`, `ipHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CommentLike`
  ADD CONSTRAINT `CommentLike_commentId_fkey`
  FOREIGN KEY (`commentId`) REFERENCES `Comment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CommentLike`
  ADD CONSTRAINT `CommentLike_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CommentLikeIp`
  ADD CONSTRAINT `CommentLikeIp_commentId_fkey`
  FOREIGN KEY (`commentId`) REFERENCES `Comment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX `Comment_public_thread_idx`
  ON `Comment`(`targetType`, `targetId`, `parentId`, `status`, `deletedAt`, `createdAt`);

CREATE INDEX `Comment_parent_created_idx`
  ON `Comment`(`parentId`, `createdAt`);
