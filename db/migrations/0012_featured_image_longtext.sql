-- Widen featured image URLs to support base64/data URLs
ALTER TABLE `Prompt`
  MODIFY `featuredImageUrl` LONGTEXT NULL;

ALTER TABLE `Post`
  MODIFY `featuredImageUrl` LONGTEXT NULL;

ALTER TABLE `Collab`
  MODIFY `featuredImageUrl` LONGTEXT NULL;
