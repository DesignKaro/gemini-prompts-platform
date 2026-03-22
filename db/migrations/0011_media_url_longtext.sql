-- Widen MediaAsset.url to support base64/data URLs
ALTER TABLE `MediaAsset`
  MODIFY `url` LONGTEXT NOT NULL;
