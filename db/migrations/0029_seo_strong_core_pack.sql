ALTER TABLE `SeoSettings`
  ADD COLUMN `robotsBlockAiBots` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `robotsAdditionalRules` JSON NULL,
  ADD COLUMN `sitemapIncludePages` BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN `canonicalBaseUrl` LONGTEXT NULL,
  ADD COLUMN `googleSiteVerification` VARCHAR(191) NULL,
  ADD COLUMN `bingSiteVerification` VARCHAR(191) NULL,
  ADD COLUMN `organizationName` VARCHAR(191) NULL,
  ADD COLUMN `organizationLogoUrl` LONGTEXT NULL,
  ADD COLUMN `organizationSameAs` JSON NULL;
