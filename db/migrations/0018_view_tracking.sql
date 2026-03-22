-- Add deduplicated prompt/post view tracking tables.

CREATE TABLE `PromptView` (
  `promptId` VARCHAR(191) NOT NULL,
  `viewerHash` VARCHAR(64) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `firstViewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastViewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `viewCount` INTEGER NOT NULL DEFAULT 1,

  INDEX `PromptView_viewerHash_idx`(`viewerHash`),
  INDEX `PromptView_lastViewedAt_idx`(`lastViewedAt`),
  INDEX `PromptView_userId_lastViewedAt_idx`(`userId`, `lastViewedAt`),
  PRIMARY KEY (`promptId`, `viewerHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PostView` (
  `postId` VARCHAR(191) NOT NULL,
  `viewerHash` VARCHAR(64) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `firstViewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastViewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `viewCount` INTEGER NOT NULL DEFAULT 1,

  INDEX `PostView_viewerHash_idx`(`viewerHash`),
  INDEX `PostView_lastViewedAt_idx`(`lastViewedAt`),
  INDEX `PostView_userId_lastViewedAt_idx`(`userId`, `lastViewedAt`),
  PRIMARY KEY (`postId`, `viewerHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PromptView`
  ADD CONSTRAINT `PromptView_promptId_fkey`
  FOREIGN KEY (`promptId`) REFERENCES `Prompt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PromptView`
  ADD CONSTRAINT `PromptView_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PostView`
  ADD CONSTRAINT `PostView_postId_fkey`
  FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PostView`
  ADD CONSTRAINT `PostView_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
