-- Create RBAC tables
CREATE TABLE `Role` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `isSystem` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `Role_name_key`(`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Permission` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `group` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `Permission_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RolePermission` (
  `roleId` VARCHAR(191) NOT NULL,
  `permissionId` VARCHAR(191) NOT NULL,

  PRIMARY KEY (`roleId`, `permissionId`),
  CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `UserRole` (
  `userId` VARCHAR(191) NOT NULL,
  `roleId` VARCHAR(191) NOT NULL,

  PRIMARY KEY (`userId`, `roleId`),
  CONSTRAINT `UserRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed permissions
INSERT IGNORE INTO `Permission` (`id`, `code`, `label`, `group`, `description`, `createdAt`, `updatedAt`) VALUES
  (UUID(), 'users:read', 'Read users', 'Users', 'View user accounts', NOW(3), NOW(3)),
  (UUID(), 'users:manage', 'Manage users', 'Users', 'Update or remove users', NOW(3), NOW(3)),
  (UUID(), 'roles:read', 'Read roles', 'Roles', 'View role definitions', NOW(3), NOW(3)),
  (UUID(), 'roles:manage', 'Manage roles', 'Roles', 'Create, update, or delete roles', NOW(3), NOW(3)),
  (UUID(), 'permissions:read', 'Read permissions', 'Roles', 'View permission catalog', NOW(3), NOW(3)),
  (UUID(), 'prompts:read', 'Read prompts', 'Content', 'View prompts', NOW(3), NOW(3)),
  (UUID(), 'prompts:manage', 'Manage prompts', 'Content', 'Create or update prompts', NOW(3), NOW(3)),
  (UUID(), 'posts:read', 'Read posts', 'Content', 'View posts', NOW(3), NOW(3)),
  (UUID(), 'posts:manage', 'Manage posts', 'Content', 'Create or update posts', NOW(3), NOW(3)),
  (UUID(), 'media:read', 'Read media', 'Content', 'View media library', NOW(3), NOW(3)),
  (UUID(), 'media:manage', 'Manage media', 'Content', 'Upload or update media', NOW(3), NOW(3)),
  (UUID(), 'categories:read', 'Read categories', 'Taxonomy', 'View categories', NOW(3), NOW(3)),
  (UUID(), 'categories:manage', 'Manage categories', 'Taxonomy', 'Create or update categories', NOW(3), NOW(3)),
  (UUID(), 'tags:read', 'Read tags', 'Taxonomy', 'View tags', NOW(3), NOW(3)),
  (UUID(), 'tags:manage', 'Manage tags', 'Taxonomy', 'Create or update tags', NOW(3), NOW(3)),
  (UUID(), 'comments:read', 'Read comments', 'Community', 'View comments', NOW(3), NOW(3)),
  (UUID(), 'comments:moderate', 'Moderate comments', 'Community', 'Moderate or reply to comments', NOW(3), NOW(3)),
  (UUID(), 'analytics:read', 'Read analytics', 'Insights', 'View analytics dashboards', NOW(3), NOW(3)),
  (UUID(), 'activity:read', 'Read activity', 'Insights', 'View admin activity logs', NOW(3), NOW(3));

-- Seed system roles
INSERT IGNORE INTO `Role` (`id`, `name`, `description`, `isSystem`, `createdAt`, `updatedAt`) VALUES
  (UUID(), 'SUPERADMIN', 'Full system access', true, NOW(3), NOW(3)),
  (UUID(), 'ADMIN', 'Administration access', true, NOW(3), NOW(3)),
  (UUID(), 'EDITOR', 'Content editor access', true, NOW(3), NOW(3)),
  (UUID(), 'MODERATOR', 'Community moderation access', true, NOW(3), NOW(3)),
  (UUID(), 'USER', 'Default user role', true, NOW(3), NOW(3));

-- Map permissions to roles
INSERT IGNORE INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id
FROM `Role` r
JOIN `Permission` p ON p.code IN (
  'users:read','users:manage','roles:read','roles:manage','permissions:read',
  'prompts:read','prompts:manage','posts:read','posts:manage','media:read','media:manage',
  'categories:read','categories:manage','tags:read','tags:manage','comments:read','comments:moderate',
  'analytics:read','activity:read'
)
WHERE r.name = 'SUPERADMIN';

INSERT IGNORE INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id
FROM `Role` r
JOIN `Permission` p ON p.code IN (
  'users:read','users:manage','roles:read','permissions:read',
  'prompts:read','prompts:manage','posts:read','posts:manage','media:read','media:manage',
  'categories:read','categories:manage','tags:read','tags:manage','comments:read','comments:moderate',
  'analytics:read','activity:read'
)
WHERE r.name = 'ADMIN';

INSERT IGNORE INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id
FROM `Role` r
JOIN `Permission` p ON p.code IN (
  'roles:read','permissions:read',
  'prompts:read','prompts:manage','posts:read','posts:manage','media:read','media:manage',
  'categories:read','categories:manage','tags:read','tags:manage','comments:read','comments:moderate',
  'analytics:read','activity:read'
)
WHERE r.name = 'EDITOR';

INSERT IGNORE INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id
FROM `Role` r
JOIN `Permission` p ON p.code IN (
  'roles:read','permissions:read',
  'categories:read','categories:manage','tags:read','tags:manage',
  'comments:read','comments:moderate','analytics:read','activity:read'
)
WHERE r.name = 'MODERATOR';

INSERT IGNORE INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id
FROM `Role` r
JOIN `Permission` p ON p.code IN (
  'prompts:read','posts:read','comments:read'
)
WHERE r.name = 'USER';
