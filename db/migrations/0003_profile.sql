-- Add profile fields to User
ALTER TABLE `User`
  ADD COLUMN `profileTitle` VARCHAR(120) NULL,
  ADD COLUMN `bio` TEXT NULL,
  ADD COLUMN `focusTags` JSON NULL;
