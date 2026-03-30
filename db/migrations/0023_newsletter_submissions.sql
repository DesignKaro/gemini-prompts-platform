-- Store newsletter form submissions across public surfaces
CREATE TABLE `NewsletterSubmission` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(320) NOT NULL,
  `source` VARCHAR(120) NOT NULL,
  `pagePath` VARCHAR(512) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `NewsletterSubmission_createdAt_idx`(`createdAt`),
  INDEX `NewsletterSubmission_email_idx`(`email`),
  INDEX `NewsletterSubmission_source_idx`(`source`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
