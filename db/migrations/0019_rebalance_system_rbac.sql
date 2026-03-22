-- Align system role permissions with the public/staff access model.
DELETE rp
FROM `RolePermission` rp
JOIN `Role` r ON r.id = rp.roleId
WHERE r.name IN ('ADMIN', 'EDITOR', 'MODERATOR', 'USER');

INSERT IGNORE INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id
FROM `Role` r
JOIN `Permission` p ON p.code IN (
  'users:read','users:manage','roles:read','permissions:read',
  'prompts:read','prompts:manage','posts:read','posts:manage','media:read','media:manage',
  'categories:read','categories:manage','tags:read','tags:manage',
  'comments:read','comments:moderate','analytics:read','activity:read'
)
WHERE r.name = 'ADMIN';

INSERT IGNORE INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id
FROM `Role` r
JOIN `Permission` p ON p.code IN (
  'prompts:read','prompts:manage','posts:read','posts:manage','media:read','media:manage',
  'categories:read','categories:manage','tags:read','tags:manage',
  'comments:read','comments:moderate','analytics:read'
)
WHERE r.name = 'EDITOR';

INSERT IGNORE INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id
FROM `Role` r
JOIN `Permission` p ON p.code IN (
  'categories:read','tags:read','comments:read','comments:moderate'
)
WHERE r.name = 'MODERATOR';

INSERT IGNORE INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id
FROM `Role` r
JOIN `Permission` p ON p.code IN (
  'prompts:read','posts:read','comments:read'
)
WHERE r.name = 'USER';
