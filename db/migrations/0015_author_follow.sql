-- Track author follows for authenticated users.
CREATE TABLE `AuthorFollow` (
    `followerId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuthorFollow_authorId_createdAt_idx`(`authorId`, `createdAt`),
    INDEX `AuthorFollow_followerId_createdAt_idx`(`followerId`, `createdAt`),
    PRIMARY KEY (`followerId`, `authorId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AuthorFollow`
  ADD CONSTRAINT `AuthorFollow_followerId_fkey`
  FOREIGN KEY (`followerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AuthorFollow`
  ADD CONSTRAINT `AuthorFollow_authorId_fkey`
  FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
