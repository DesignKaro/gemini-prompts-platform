-- Track prompt likes by hashed IP so each IP can like a prompt only once.
CREATE TABLE `PromptLikeIp` (
    `promptId` VARCHAR(191) NOT NULL,
    `ipHash` VARCHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PromptLikeIp_createdAt_idx`(`createdAt`),
    INDEX `PromptLikeIp_ipHash_idx`(`ipHash`),
    PRIMARY KEY (`promptId`, `ipHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PromptLikeIp`
  ADD CONSTRAINT `PromptLikeIp_promptId_fkey`
  FOREIGN KEY (`promptId`) REFERENCES `Prompt`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
