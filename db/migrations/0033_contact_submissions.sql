-- Contact form submissions inbox for dashboard triage.
CREATE TABLE `ContactSubmission` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(320) NOT NULL,
  `subject` VARCHAR(160) NOT NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM') NOT NULL DEFAULT 'NEW',
  `internalNote` TEXT NULL,
  `source` VARCHAR(120) NOT NULL,
  `pagePath` VARCHAR(512) NULL,
  `ipAddress` VARCHAR(191) NULL,
  `userAgent` VARCHAR(512) NULL,
  `reviewedById` VARCHAR(191) NULL,
  `reviewedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `ContactSubmission_createdAt_idx`(`createdAt`),
  INDEX `ContactSubmission_status_idx`(`status`),
  INDEX `ContactSubmission_email_idx`(`email`),
  INDEX `ContactSubmission_source_idx`(`source`),
  INDEX `ContactSubmission_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `ContactSubmission_reviewedById_idx`(`reviewedById`),
  CONSTRAINT `ContactSubmission_reviewedById_fkey`
    FOREIGN KEY (`reviewedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Contact submissions permissions.
INSERT IGNORE INTO `Permission` (`id`, `code`, `label`, `group`, `description`, `createdAt`, `updatedAt`) VALUES
  (UUID(), 'contacts:read', 'Read contact submissions', 'Community', 'View contact form submissions', NOW(3), NOW(3)),
  (UUID(), 'contacts:manage', 'Manage contact submissions', 'Community', 'Update contact submission status and notes', NOW(3), NOW(3));

-- Grant contact submission permissions to SUPERADMIN and ADMIN only.
INSERT IGNORE INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id
FROM `Role` r
JOIN `Permission` p ON p.code IN ('contacts:read', 'contacts:manage')
WHERE r.name IN ('SUPERADMIN', 'ADMIN');
