ALTER TABLE `User`
  ADD COLUMN `handle` VARCHAR(40) NULL;

CREATE UNIQUE INDEX `User_handle_key` ON `User`(`handle`);
