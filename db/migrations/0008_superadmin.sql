-- Add SUPERADMIN role and promote the requested account.
ALTER TABLE `User`
  MODIFY COLUMN `role` ENUM('ADMIN','EDITOR','MODERATOR','USER','SUPERADMIN') NOT NULL DEFAULT 'USER';

UPDATE `User`
  SET `role` = 'SUPERADMIN'
  WHERE `email` = 'argro.official@gmail.com';
