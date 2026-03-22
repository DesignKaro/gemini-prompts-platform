-- Speed up author detail page prompt/post list + count filters.
CREATE INDEX `Prompt_public_author_latest_idx`
  ON `Prompt`(`authorId`, `status`, `deletedAt`, `publishedAt`, `updatedAt`);

CREATE INDEX `Post_public_author_latest_idx`
  ON `Post`(`authorId`, `status`, `deletedAt`, `publishedAt`, `updatedAt`);
