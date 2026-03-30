-- Dashboard schema updates: categories/tags enhancements, posts, comments, media, audit, transactions

-- Extend Category
ALTER TABLE `Category`
  ADD COLUMN `parentId` VARCHAR(191) NULL,
  ADD COLUMN `description` TEXT NULL,
  ADD COLUMN `imageUrl` VARCHAR(1024) NULL,
  ADD COLUMN `colorConfig` JSON NULL,
  ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  ADD COLUMN `deletedAt` DATETIME(3) NULL;

CREATE INDEX `Category_deletedAt_idx` ON `Category`(`deletedAt`);

ALTER TABLE `Category` ADD CONSTRAINT `Category_parentId_fkey`
  FOREIGN KEY (`parentId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Extend Tag
ALTER TABLE `Tag`
  ADD COLUMN `color` VARCHAR(50) NULL,
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  ADD COLUMN `deletedAt` DATETIME(3) NULL;

CREATE INDEX `Tag_deletedAt_idx` ON `Tag`(`deletedAt`);

-- Extend Prompt
ALTER TABLE `Prompt`
  ADD COLUMN `seoTitle` VARCHAR(191) NULL,
  ADD COLUMN `seoDescription` VARCHAR(512) NULL,
  ADD COLUMN `primaryCategoryId` VARCHAR(191) NULL,
  ADD COLUMN `scheduledAt` DATETIME(3) NULL,
  ADD COLUMN `deletedAt` DATETIME(3) NULL,
  ADD COLUMN `viewCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `likeCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `saveCount` INTEGER NOT NULL DEFAULT 0;

CREATE INDEX `Prompt_deletedAt_idx` ON `Prompt`(`deletedAt`);

ALTER TABLE `Prompt` ADD CONSTRAINT `Prompt_primaryCategoryId_fkey`
  FOREIGN KEY (`primaryCategoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Create Post table
CREATE TABLE `Post` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `excerpt` TEXT NULL,
  `content` LONGTEXT NOT NULL,
  `status` ENUM('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `visibility` ENUM('FREE', 'EXCLUSIVE') NOT NULL DEFAULT 'FREE',
  `postType` ENUM('POST', 'PROMPT') NOT NULL DEFAULT 'POST',
  `postFormat` ENUM('STANDARD', 'CHECKLIST', 'GALLERY') NOT NULL DEFAULT 'STANDARD',
  `featuredImageUrl` VARCHAR(1024) NULL,
  `seoTitle` VARCHAR(191) NULL,
  `seoDescription` VARCHAR(512) NULL,
  `authorId` VARCHAR(191) NOT NULL,
  `primaryCategoryId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `publishedAt` DATETIME(3) NULL,
  `scheduledAt` DATETIME(3) NULL,
  `deletedAt` DATETIME(3) NULL,
  `viewCount` INTEGER NOT NULL DEFAULT 0,
  `commentCount` INTEGER NOT NULL DEFAULT 0,

  UNIQUE INDEX `Post_slug_key`(`slug`),
  INDEX `Post_status_visibility_idx`(`status`, `visibility`),
  INDEX `Post_publishedAt_idx`(`publishedAt`),
  INDEX `Post_deletedAt_idx`(`deletedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Post` ADD CONSTRAINT `Post_authorId_fkey`
  FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Post` ADD CONSTRAINT `Post_primaryCategoryId_fkey`
  FOREIGN KEY (`primaryCategoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Post tags/categories join tables
CREATE TABLE `_PostTags` (
  `A` VARCHAR(191) NOT NULL,
  `B` VARCHAR(191) NOT NULL,

  UNIQUE INDEX `_PostTags_AB_unique`(`A`, `B`),
  INDEX `_PostTags_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `_PostCategories` (
  `A` VARCHAR(191) NOT NULL,
  `B` VARCHAR(191) NOT NULL,

  UNIQUE INDEX `_PostCategories_AB_unique`(`A`, `B`),
  INDEX `_PostCategories_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `_PostTags` ADD CONSTRAINT `_PostTags_A_fkey`
  FOREIGN KEY (`A`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `_PostTags` ADD CONSTRAINT `_PostTags_B_fkey`
  FOREIGN KEY (`B`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `_PostCategories` ADD CONSTRAINT `_PostCategories_A_fkey`
  FOREIGN KEY (`A`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `_PostCategories` ADD CONSTRAINT `_PostCategories_B_fkey`
  FOREIGN KEY (`B`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Transaction table
CREATE TABLE `Transaction` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
  `provider` VARCHAR(191) NOT NULL,
  `providerRef` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL,
  `promptId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `Transaction_providerRef_key`(`providerRef`),
  INDEX `Transaction_userId_status_idx`(`userId`, `status`),
  INDEX `Transaction_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_promptId_fkey`
  FOREIGN KEY (`promptId`) REFERENCES `Prompt`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Create Comment table
CREATE TABLE `Comment` (
  `id` VARCHAR(191) NOT NULL,
  `targetType` ENUM('PROMPT', 'POST') NOT NULL,
  `targetId` VARCHAR(191) NOT NULL,
  `authorId` VARCHAR(191) NULL,
  `content` TEXT NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'TRASH') NOT NULL DEFAULT 'PENDING',
  `parentId` VARCHAR(191) NULL,
  `moderatedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,

  INDEX `Comment_targetType_targetId_createdAt_idx`(`targetType`, `targetId`, `createdAt`),
  INDEX `Comment_status_createdAt_idx`(`status`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Comment` ADD CONSTRAINT `Comment_authorId_fkey`
  FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Comment` ADD CONSTRAINT `Comment_parentId_fkey`
  FOREIGN KEY (`parentId`) REFERENCES `Comment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Comment` ADD CONSTRAINT `Comment_moderatedById_fkey`
  FOREIGN KEY (`moderatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Create MediaAsset table
CREATE TABLE `MediaAsset` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NULL,
  `url` VARCHAR(1024) NOT NULL,
  `storageKey` VARCHAR(512) NULL,
  `mime` VARCHAR(100) NULL,
  `size` INTEGER NULL,
  `width` INTEGER NULL,
  `height` INTEGER NULL,
  `altText` VARCHAR(255) NULL,
  `status` ENUM('ACTIVE', 'TRASH') NOT NULL DEFAULT 'ACTIVE',
  `uploadedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,

  INDEX `MediaAsset_status_createdAt_idx`(`status`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MediaAsset` ADD CONSTRAINT `MediaAsset_uploadedById_fkey`
  FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Create MediaUsage table
CREATE TABLE `MediaUsage` (
  `id` VARCHAR(191) NOT NULL,
  `assetId` VARCHAR(191) NOT NULL,
  `targetType` ENUM('PROMPT', 'POST', 'CATEGORY', 'USER') NOT NULL,
  `targetId` VARCHAR(191) NOT NULL,
  `field` VARCHAR(60) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `MediaUsage_targetType_targetId_idx`(`targetType`, `targetId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MediaUsage` ADD CONSTRAINT `MediaUsage_assetId_fkey`
  FOREIGN KEY (`assetId`) REFERENCES `MediaAsset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Create AuditLog table
CREATE TABLE `AuditLog` (
  `id` VARCHAR(191) NOT NULL,
  `actorId` VARCHAR(191) NULL,
  `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'UNPUBLISH', 'ARCHIVE', 'RESTORE') NOT NULL,
  `targetType` ENUM('PROMPT', 'POST', 'CATEGORY', 'TAG', 'COMMENT', 'MEDIA', 'USER') NOT NULL,
  `targetId` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `AuditLog_createdAt_idx`(`createdAt`),
  INDEX `AuditLog_actorId_createdAt_idx`(`actorId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey`
  FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
