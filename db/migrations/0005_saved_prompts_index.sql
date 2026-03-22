-- Add index for faster per-user saved prompt lookups
CREATE INDEX `SavedPrompt_userId_createdAt_idx`
  ON `SavedPrompt` (`userId`, `createdAt`);
