CREATE TABLE `SeoIntegrationSettings` (
  `id` VARCHAR(191) NOT NULL,
  `scope` VARCHAR(20) NOT NULL,
  `googleSiteVerification` VARCHAR(191) NULL,
  `bingSiteVerification` VARCHAR(191) NULL,
  `gaMeasurementId` VARCHAR(64) NULL,
  `googleAdsTagId` VARCHAR(64) NULL,
  `adsensePublisherId` VARCHAR(64) NULL,
  `clarityProjectId` VARCHAR(64) NULL,
  `customHeadScriptUrls` JSON NULL,
  `customHeadInlineScript` LONGTEXT NULL,
  `customBodyStartInlineScript` LONGTEXT NULL,
  `customBodyEndInlineScript` LONGTEXT NULL,
  `updatedByUserId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `SeoIntegrationSettings_scope_key`(`scope`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `SeoIntegrationSettings` (`id`, `scope`, `createdAt`, `updatedAt`)
VALUES
  (UUID(), 'development', NOW(3), NOW(3)),
  (UUID(), 'staging', NOW(3), NOW(3)),
  (UUID(), 'production', NOW(3), NOW(3));
