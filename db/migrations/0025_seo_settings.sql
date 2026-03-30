CREATE TABLE `SeoSettings` (
  `id` VARCHAR(32) NOT NULL,
  `siteTitle` VARCHAR(191) NOT NULL DEFAULT 'Gemini Prompts',
  `titleSeparator` VARCHAR(10) NOT NULL DEFAULT '|',
  `defaultMetaDescription` VARCHAR(512) NOT NULL DEFAULT 'Discover curated AI prompts, practical workflows, creator guides, and weekly prompt drops.',
  `homepageTitle` VARCHAR(191) NULL,
  `homepageDescription` VARCHAR(512) NULL,
  `defaultOgImageUrl` LONGTEXT NULL,
  `defaultOgImageAlt` VARCHAR(191) NULL,
  `twitterCardType` VARCHAR(40) NOT NULL DEFAULT 'summary_large_image',
  `schemaOrganizationEnabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `schemaWebsiteEnabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `schemaArticleEnabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `schemaProfileEnabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `schemaBreadcrumbEnabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `robotsSiteIndex` BOOLEAN NOT NULL DEFAULT TRUE,
  `robotsSiteFollow` BOOLEAN NOT NULL DEFAULT TRUE,
  `robotsDisallowPaths` JSON NULL,
  `sitemapIncludePrompts` BOOLEAN NOT NULL DEFAULT TRUE,
  `sitemapIncludePosts` BOOLEAN NOT NULL DEFAULT TRUE,
  `sitemapIncludeNewsletter` BOOLEAN NOT NULL DEFAULT TRUE,
  `sitemapIncludeTags` BOOLEAN NOT NULL DEFAULT TRUE,
  `sitemapIncludeCategories` BOOLEAN NOT NULL DEFAULT TRUE,
  `sitemapIncludeAuthors` BOOLEAN NOT NULL DEFAULT TRUE,
  `noindexSearchPages` BOOLEAN NOT NULL DEFAULT TRUE,
  `noindexPaginatedArchives` BOOLEAN NOT NULL DEFAULT TRUE,
  `noindexAuthorPages` BOOLEAN NOT NULL DEFAULT FALSE,
  `noindexTagPages` BOOLEAN NOT NULL DEFAULT FALSE,
  `noindexCategoryPages` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `SeoSettings` (`id`)
VALUES ('global')
ON DUPLICATE KEY UPDATE `id` = VALUES(`id`);
