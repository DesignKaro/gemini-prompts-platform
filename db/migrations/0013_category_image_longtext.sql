-- Widen Category.imageUrl to support base64/data URLs
ALTER TABLE `Category`
  MODIFY `imageUrl` LONGTEXT NULL;
