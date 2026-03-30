-- Data Migration: Backfill primaryCategoryId for Prompts and Posts
-- This ensures that existing records have a valid parent category for the new /[category]/[slug] URL structure.

-- 1. Update Prompts that have at least one category but no primary category
UPDATE `Prompt` p
JOIN `_PromptCategories` pc ON p.id = pc.B
SET p.primaryCategoryId = pc.A
WHERE p.primaryCategoryId IS NULL;

-- 2. Update Posts that have at least one category but no primary category (if table exists)
-- Note: Assuming _PostCategories follows same convention (A=CategoryId, B=PostId)
UPDATE `Post` p
JOIN `_PostCategories` pc ON p.id = pc.B
SET p.primaryCategoryId = pc.A
WHERE p.primaryCategoryId IS NULL;
