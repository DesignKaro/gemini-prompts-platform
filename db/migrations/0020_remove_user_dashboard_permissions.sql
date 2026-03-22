-- Plain USER accounts should not inherit dashboard/admin permissions.
DELETE rp
FROM `RolePermission` rp
JOIN `Role` r ON r.id = rp.roleId
WHERE r.name = 'USER';
