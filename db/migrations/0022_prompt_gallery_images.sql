-- Add optional gallery image storage for prompt detail sliders
ALTER TABLE `Prompt`
  ADD COLUMN `galleryImageUrls` JSON NULL;
