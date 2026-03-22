-- Allow storing data URLs for avatars and track updates
ALTER TABLE `User`
  MODIFY COLUMN `avatarUrl` LONGTEXT NULL;

ALTER TABLE `User`
  ADD COLUMN `avatarUpdatedAt` DATETIME(3) NULL;
