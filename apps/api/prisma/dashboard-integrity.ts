import { PrismaClient, type Prisma } from '@prisma/client';

type Mode = 'audit' | 'repair';

type TaxonomyLink = { id: string; deletedAt: Date | null };
type PromptRow = {
  id: string;
  primaryCategoryId: string | null;
  categories: TaxonomyLink[];
  tags: TaxonomyLink[];
};
type PostRow = {
  id: string;
  primaryCategoryId: string | null;
  categories: TaxonomyLink[];
  tags: TaxonomyLink[];
};
type CollabRow = {
  id: string;
  categories: TaxonomyLink[];
  tags: TaxonomyLink[];
};

type DashboardData = {
  prompts: PromptRow[];
  posts: PostRow[];
  collabs: CollabRow[];
  fallbackCategory: { id: string; deletedAt: Date | null } | null;
  fallbackTag: { id: string; deletedAt: Date | null } | null;
  deletedCategoryIds: Set<string>;
  deletedTagIds: Set<string>;
  postCategoriesSchema: PostCategoriesSchemaStatus;
};

type AuditIssueCounts = {
  postCategoriesSchemaMismatch: number;
  missingFallbackCategory: number;
  missingFallbackTag: number;
  deletedFallbackCategory: number;
  deletedFallbackTag: number;
  promptsMissingPrimaryCategory: number;
  postsMissingPrimaryCategory: number;
  promptsPrimaryCategoryDeleted: number;
  postsPrimaryCategoryDeleted: number;
  promptsPrimaryNotInCategories: number;
  postsPrimaryNotInCategories: number;
  promptsWithDeletedCategoryLinks: number;
  postsWithDeletedCategoryLinks: number;
  collabsWithDeletedCategoryLinks: number;
  promptsWithoutActiveCategories: number;
  postsWithoutActiveCategories: number;
  collabsWithoutActiveCategories: number;
  promptsWithDeletedTagLinks: number;
  postsWithDeletedTagLinks: number;
  collabsWithDeletedTagLinks: number;
  promptsWithoutActiveTags: number;
  postsWithoutActiveTags: number;
  collabsWithoutActiveTags: number;
};

type RepairPlan = {
  promptUpdates: Array<{
    id: string;
    primaryCategoryId: string;
    categoryIds: string[];
    tagIds: string[];
  }>;
  postUpdates: Array<{
    id: string;
    primaryCategoryId: string;
    categoryIds: string[];
    tagIds: string[];
  }>;
  collabUpdates: Array<{
    id: string;
    categoryIds: string[];
    tagIds: string[];
  }>;
};

type CliOptions = {
  mode: Mode;
  apply: boolean;
  json: boolean;
};

type PostCategoriesConstraintRow = {
  constraintName: string;
  columnName: string;
  referencedTableName: string;
};

type PostCategoriesSchemaStatus = {
  tableExists: boolean;
  expected: boolean;
  legacyReversed: boolean;
  constraintNames: string[];
  referencesByColumn: {
    A: string | null;
    B: string | null;
  };
};

type PostCategoriesSchemaRepairResult = {
  changed: boolean;
  swappedRows: number;
  before: PostCategoriesSchemaStatus;
  after: PostCategoriesSchemaStatus;
};

const prisma = new PrismaClient();

function parseCliOptions(argv: string[]): CliOptions {
  let mode: Mode = 'audit';
  let apply = false;
  let json = false;

  for (const rawArg of argv) {
    const arg = rawArg.trim();
    if (!arg) continue;

    if (arg === 'audit' || arg === '--mode=audit') {
      mode = 'audit';
      continue;
    }

    if (arg === 'repair' || arg === '--mode=repair') {
      mode = 'repair';
      continue;
    }

    if (arg === '--apply') {
      apply = true;
      continue;
    }

    if (arg === '--json') {
      json = true;
      continue;
    }
  }

  if (mode === 'audit') {
    apply = false;
  }

  return { mode, apply, json };
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values));
}

function asNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  return 0;
}

async function inspectPostCategoriesSchema(
  db: PrismaClient | Prisma.TransactionClient,
): Promise<PostCategoriesSchemaStatus> {
  const [tables, constraints] = await Promise.all([
    db.$queryRawUnsafe<Array<{ tableName: string }>>(
      "SELECT table_name as tableName FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '_PostCategories'",
    ),
    db.$queryRawUnsafe<Array<PostCategoriesConstraintRow>>(
      `SELECT
         constraint_name as constraintName,
         column_name as columnName,
         referenced_table_name as referencedTableName
       FROM information_schema.key_column_usage
       WHERE table_schema = DATABASE()
         AND table_name = '_PostCategories'
         AND column_name IN ('A', 'B')
         AND referenced_table_name IS NOT NULL`,
    ),
  ]);

  if (tables.length === 0) {
    return {
      tableExists: false,
      expected: false,
      legacyReversed: false,
      constraintNames: [],
      referencesByColumn: { A: null, B: null },
    };
  }

  const referencesByColumn: PostCategoriesSchemaStatus['referencesByColumn'] = {
    A: null,
    B: null,
  };

  for (const constraint of constraints) {
    if (constraint.columnName === 'A' || constraint.columnName === 'B') {
      referencesByColumn[constraint.columnName] = constraint.referencedTableName;
    }
  }

  const expected = referencesByColumn.A === 'Category' && referencesByColumn.B === 'Post';
  const legacyReversed = referencesByColumn.A === 'Post' && referencesByColumn.B === 'Category';

  return {
    tableExists: true,
    expected,
    legacyReversed,
    constraintNames: uniq(constraints.map((constraint) => constraint.constraintName)),
    referencesByColumn,
  };
}

async function ensurePostCategoriesSchema(
  db: PrismaClient | Prisma.TransactionClient,
): Promise<PostCategoriesSchemaRepairResult> {
  const before = await inspectPostCategoriesSchema(db);
  if (!before.tableExists || before.expected) {
    return {
      changed: false,
      swappedRows: 0,
      before,
      after: before,
    };
  }

  for (const constraintName of before.constraintNames) {
    await db.$executeRawUnsafe(
      `ALTER TABLE \`_PostCategories\` DROP FOREIGN KEY \`${constraintName}\``,
    );
  }

  let swappedRows = 0;
  if (before.legacyReversed) {
    const rowCountRows = await db.$queryRawUnsafe<Array<{ total: bigint | number }>>(
      'SELECT COUNT(*) as total FROM `_PostCategories`',
    );
    swappedRows = asNumber(rowCountRows[0]?.total ?? 0);

    if (swappedRows > 0) {
      await db.$executeRawUnsafe(
        'CREATE TEMPORARY TABLE `_PostCategories_fix_tmp` (`A` VARCHAR(191) NOT NULL, `B` VARCHAR(191) NOT NULL, UNIQUE KEY `_PostCategories_fix_tmp_ab_unique` (`A`,`B`))',
      );
      await db.$executeRawUnsafe(
        'INSERT IGNORE INTO `_PostCategories_fix_tmp` (`A`,`B`) SELECT `B`,`A` FROM `_PostCategories`',
      );
      await db.$executeRawUnsafe('TRUNCATE TABLE `_PostCategories`');
      await db.$executeRawUnsafe(
        'INSERT IGNORE INTO `_PostCategories` (`A`,`B`) SELECT `A`,`B` FROM `_PostCategories_fix_tmp`',
      );
      await db.$executeRawUnsafe('DROP TEMPORARY TABLE `_PostCategories_fix_tmp`');
    }
  }

  const droppedState = await inspectPostCategoriesSchema(db);
  if (droppedState.referencesByColumn.A !== 'Category') {
    await db.$executeRawUnsafe(
      'ALTER TABLE `_PostCategories` ADD CONSTRAINT `_PostCategories_A_fkey` FOREIGN KEY (`A`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }

  if (droppedState.referencesByColumn.B !== 'Post') {
    await db.$executeRawUnsafe(
      'ALTER TABLE `_PostCategories` ADD CONSTRAINT `_PostCategories_B_fkey` FOREIGN KEY (`B`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }

  const after = await inspectPostCategoriesSchema(db);
  if (!after.expected) {
    throw new Error(
      `Failed to normalize _PostCategories relation schema. Current mapping: A->${after.referencesByColumn.A ?? 'null'}, B->${after.referencesByColumn.B ?? 'null'}.`,
    );
  }

  return {
    changed: true,
    swappedRows,
    before,
    after,
  };
}

async function loadDashboardData(
  db: PrismaClient | Prisma.TransactionClient,
): Promise<DashboardData> {
  const [
    fallbackCategory,
    fallbackTag,
    deletedCategories,
    deletedTags,
    prompts,
    posts,
    collabs,
    postCategoriesSchema,
  ] = await Promise.all([
    db.category.findUnique({
      where: { slug: 'uncategorized' },
      select: { id: true, deletedAt: true },
    }),
    db.tag.findUnique({
      where: { slug: 'default' },
      select: { id: true, deletedAt: true },
    }),
    db.category.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true },
    }),
    db.tag.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true },
    }),
    db.prompt.findMany({
      select: {
        id: true,
        primaryCategoryId: true,
        categories: { select: { id: true, deletedAt: true } },
        tags: { select: { id: true, deletedAt: true } },
      },
    }),
    db.post.findMany({
      select: {
        id: true,
        primaryCategoryId: true,
        categories: { select: { id: true, deletedAt: true } },
        tags: { select: { id: true, deletedAt: true } },
      },
    }),
    db.collab.findMany({
      select: {
        id: true,
        categories: { select: { id: true, deletedAt: true } },
        tags: { select: { id: true, deletedAt: true } },
      },
    }),
    inspectPostCategoriesSchema(db),
  ]);

  return {
    prompts,
    posts,
    collabs,
    fallbackCategory,
    fallbackTag,
    deletedCategoryIds: new Set(deletedCategories.map((entry) => entry.id)),
    deletedTagIds: new Set(deletedTags.map((entry) => entry.id)),
    postCategoriesSchema,
  };
}

function buildInitialIssueCounts(): AuditIssueCounts {
  return {
    postCategoriesSchemaMismatch: 0,
    missingFallbackCategory: 0,
    missingFallbackTag: 0,
    deletedFallbackCategory: 0,
    deletedFallbackTag: 0,
    promptsMissingPrimaryCategory: 0,
    postsMissingPrimaryCategory: 0,
    promptsPrimaryCategoryDeleted: 0,
    postsPrimaryCategoryDeleted: 0,
    promptsPrimaryNotInCategories: 0,
    postsPrimaryNotInCategories: 0,
    promptsWithDeletedCategoryLinks: 0,
    postsWithDeletedCategoryLinks: 0,
    collabsWithDeletedCategoryLinks: 0,
    promptsWithoutActiveCategories: 0,
    postsWithoutActiveCategories: 0,
    collabsWithoutActiveCategories: 0,
    promptsWithDeletedTagLinks: 0,
    postsWithDeletedTagLinks: 0,
    collabsWithDeletedTagLinks: 0,
    promptsWithoutActiveTags: 0,
    postsWithoutActiveTags: 0,
    collabsWithoutActiveTags: 0,
  };
}

function countAuditIssues(data: DashboardData): AuditIssueCounts {
  const issues = buildInitialIssueCounts();

  if (!data.postCategoriesSchema.expected) {
    issues.postCategoriesSchemaMismatch += 1;
  }

  if (!data.fallbackCategory) {
    issues.missingFallbackCategory += 1;
  } else if (data.fallbackCategory.deletedAt) {
    issues.deletedFallbackCategory += 1;
  }

  if (!data.fallbackTag) {
    issues.missingFallbackTag += 1;
  } else if (data.fallbackTag.deletedAt) {
    issues.deletedFallbackTag += 1;
  }

  for (const prompt of data.prompts) {
    const deletedCategoryLinks = prompt.categories.filter((category) => category.deletedAt);
    const activeCategoryIds = prompt.categories
      .filter((category) => !category.deletedAt)
      .map((category) => category.id);
    const deletedTagLinks = prompt.tags.filter((tag) => tag.deletedAt);
    const activeTagIds = prompt.tags.filter((tag) => !tag.deletedAt).map((tag) => tag.id);

    if (!prompt.primaryCategoryId) {
      issues.promptsMissingPrimaryCategory += 1;
    } else if (data.deletedCategoryIds.has(prompt.primaryCategoryId)) {
      issues.promptsPrimaryCategoryDeleted += 1;
    }

    if (prompt.primaryCategoryId && !activeCategoryIds.includes(prompt.primaryCategoryId)) {
      issues.promptsPrimaryNotInCategories += 1;
    }

    if (deletedCategoryLinks.length > 0) {
      issues.promptsWithDeletedCategoryLinks += 1;
    }

    if (activeCategoryIds.length === 0) {
      issues.promptsWithoutActiveCategories += 1;
    }

    if (deletedTagLinks.length > 0) {
      issues.promptsWithDeletedTagLinks += 1;
    }

    if (activeTagIds.length === 0) {
      issues.promptsWithoutActiveTags += 1;
    }
  }

  for (const post of data.posts) {
    const deletedCategoryLinks = post.categories.filter((category) => category.deletedAt);
    const activeCategoryIds = post.categories
      .filter((category) => !category.deletedAt)
      .map((category) => category.id);
    const deletedTagLinks = post.tags.filter((tag) => tag.deletedAt);
    const activeTagIds = post.tags.filter((tag) => !tag.deletedAt).map((tag) => tag.id);

    if (!post.primaryCategoryId) {
      issues.postsMissingPrimaryCategory += 1;
    } else if (data.deletedCategoryIds.has(post.primaryCategoryId)) {
      issues.postsPrimaryCategoryDeleted += 1;
    }

    if (post.primaryCategoryId && !activeCategoryIds.includes(post.primaryCategoryId)) {
      issues.postsPrimaryNotInCategories += 1;
    }

    if (deletedCategoryLinks.length > 0) {
      issues.postsWithDeletedCategoryLinks += 1;
    }

    if (activeCategoryIds.length === 0) {
      issues.postsWithoutActiveCategories += 1;
    }

    if (deletedTagLinks.length > 0) {
      issues.postsWithDeletedTagLinks += 1;
    }

    if (activeTagIds.length === 0) {
      issues.postsWithoutActiveTags += 1;
    }
  }

  for (const collab of data.collabs) {
    const deletedCategoryLinks = collab.categories.filter((category) => category.deletedAt);
    const activeCategoryIds = collab.categories.filter((category) => !category.deletedAt);
    const deletedTagLinks = collab.tags.filter((tag) => tag.deletedAt);
    const activeTagIds = collab.tags.filter((tag) => !tag.deletedAt);

    if (deletedCategoryLinks.length > 0) {
      issues.collabsWithDeletedCategoryLinks += 1;
    }

    if (activeCategoryIds.length === 0) {
      issues.collabsWithoutActiveCategories += 1;
    }

    if (deletedTagLinks.length > 0) {
      issues.collabsWithDeletedTagLinks += 1;
    }

    if (activeTagIds.length === 0) {
      issues.collabsWithoutActiveTags += 1;
    }
  }

  return issues;
}

function buildRepairPlan(
  data: DashboardData,
  fallbackCategoryId: string,
  fallbackTagId: string,
): RepairPlan {
  const plan: RepairPlan = {
    promptUpdates: [],
    postUpdates: [],
    collabUpdates: [],
  };

  for (const prompt of data.prompts) {
    const activeCategoryIds = prompt.categories
      .filter((category) => !category.deletedAt)
      .map((category) => category.id)
      .filter((id) => !data.deletedCategoryIds.has(id));
    const activeTagIds = prompt.tags
      .filter((tag) => !tag.deletedAt)
      .map((tag) => tag.id)
      .filter((id) => !data.deletedTagIds.has(id));

    const normalizedPrimary =
      prompt.primaryCategoryId && !data.deletedCategoryIds.has(prompt.primaryCategoryId)
        ? prompt.primaryCategoryId
        : fallbackCategoryId;

    const nextCategoryIds = uniq([normalizedPrimary, ...activeCategoryIds]);
    const ensuredCategoryIds = nextCategoryIds.length > 0 ? nextCategoryIds : [fallbackCategoryId];
    const ensuredTagIds = activeTagIds.length > 0 ? uniq(activeTagIds) : [fallbackTagId];

    const currentCategoryIds = uniq(prompt.categories.map((category) => category.id));
    const currentTagIds = uniq(prompt.tags.map((tag) => tag.id));

    const shouldUpdatePrimary = prompt.primaryCategoryId !== normalizedPrimary;
    const shouldUpdateCategories =
      ensuredCategoryIds.length !== currentCategoryIds.length ||
      ensuredCategoryIds.some((id) => !currentCategoryIds.includes(id));
    const shouldUpdateTags =
      ensuredTagIds.length !== currentTagIds.length ||
      ensuredTagIds.some((id) => !currentTagIds.includes(id));

    if (shouldUpdatePrimary || shouldUpdateCategories || shouldUpdateTags) {
      plan.promptUpdates.push({
        id: prompt.id,
        primaryCategoryId: normalizedPrimary,
        categoryIds: ensuredCategoryIds,
        tagIds: ensuredTagIds,
      });
    }
  }

  for (const post of data.posts) {
    const activeCategoryIds = post.categories
      .filter((category) => !category.deletedAt)
      .map((category) => category.id)
      .filter((id) => !data.deletedCategoryIds.has(id));
    const activeTagIds = post.tags
      .filter((tag) => !tag.deletedAt)
      .map((tag) => tag.id)
      .filter((id) => !data.deletedTagIds.has(id));

    const normalizedPrimary =
      post.primaryCategoryId && !data.deletedCategoryIds.has(post.primaryCategoryId)
        ? post.primaryCategoryId
        : fallbackCategoryId;

    const nextCategoryIds = uniq([normalizedPrimary, ...activeCategoryIds]);
    const ensuredCategoryIds = nextCategoryIds.length > 0 ? nextCategoryIds : [fallbackCategoryId];
    const ensuredTagIds = activeTagIds.length > 0 ? uniq(activeTagIds) : [fallbackTagId];

    const currentCategoryIds = uniq(post.categories.map((category) => category.id));
    const currentTagIds = uniq(post.tags.map((tag) => tag.id));

    const shouldUpdatePrimary = post.primaryCategoryId !== normalizedPrimary;
    const shouldUpdateCategories =
      ensuredCategoryIds.length !== currentCategoryIds.length ||
      ensuredCategoryIds.some((id) => !currentCategoryIds.includes(id));
    const shouldUpdateTags =
      ensuredTagIds.length !== currentTagIds.length ||
      ensuredTagIds.some((id) => !currentTagIds.includes(id));

    if (shouldUpdatePrimary || shouldUpdateCategories || shouldUpdateTags) {
      plan.postUpdates.push({
        id: post.id,
        primaryCategoryId: normalizedPrimary,
        categoryIds: ensuredCategoryIds,
        tagIds: ensuredTagIds,
      });
    }
  }

  for (const collab of data.collabs) {
    const activeCategoryIds = collab.categories
      .filter((category) => !category.deletedAt)
      .map((category) => category.id)
      .filter((id) => !data.deletedCategoryIds.has(id));
    const activeTagIds = collab.tags
      .filter((tag) => !tag.deletedAt)
      .map((tag) => tag.id)
      .filter((id) => !data.deletedTagIds.has(id));

    const ensuredCategoryIds =
      activeCategoryIds.length > 0 ? uniq(activeCategoryIds) : [fallbackCategoryId];
    const ensuredTagIds = activeTagIds.length > 0 ? uniq(activeTagIds) : [fallbackTagId];

    const currentCategoryIds = uniq(collab.categories.map((category) => category.id));
    const currentTagIds = uniq(collab.tags.map((tag) => tag.id));

    const shouldUpdateCategories =
      ensuredCategoryIds.length !== currentCategoryIds.length ||
      ensuredCategoryIds.some((id) => !currentCategoryIds.includes(id));
    const shouldUpdateTags =
      ensuredTagIds.length !== currentTagIds.length ||
      ensuredTagIds.some((id) => !currentTagIds.includes(id));

    if (shouldUpdateCategories || shouldUpdateTags) {
      plan.collabUpdates.push({
        id: collab.id,
        categoryIds: ensuredCategoryIds,
        tagIds: ensuredTagIds,
      });
    }
  }

  return plan;
}

async function applyRepairPlan(
  tx: Prisma.TransactionClient,
  plan: RepairPlan,
): Promise<{ promptsUpdated: number; postsUpdated: number; collabsUpdated: number }> {
  for (const prompt of plan.promptUpdates) {
    await tx.prompt.update({
      where: { id: prompt.id },
      data: {
        primaryCategoryId: prompt.primaryCategoryId,
        categories: { set: prompt.categoryIds.map((id) => ({ id })) },
        tags: { set: prompt.tagIds.map((id) => ({ id })) },
      },
    });
  }

  for (const post of plan.postUpdates) {
    await tx.post.update({
      where: { id: post.id },
      data: {
        primaryCategoryId: post.primaryCategoryId,
        categories: { set: post.categoryIds.map((id) => ({ id })) },
        tags: { set: post.tagIds.map((id) => ({ id })) },
      },
    });
  }

  for (const collab of plan.collabUpdates) {
    await tx.collab.update({
      where: { id: collab.id },
      data: {
        categories: { set: collab.categoryIds.map((id) => ({ id })) },
        tags: { set: collab.tagIds.map((id) => ({ id })) },
      },
    });
  }

  return {
    promptsUpdated: plan.promptUpdates.length,
    postsUpdated: plan.postUpdates.length,
    collabsUpdated: plan.collabUpdates.length,
  };
}

function hasAnyIssues(issues: AuditIssueCounts): boolean {
  return Object.values(issues).some((count) => count > 0);
}

function printReport(report: unknown, asJson: boolean) {
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(report);
}

async function runAudit(options: CliOptions) {
  const beforeData = await loadDashboardData(prisma);
  const beforeIssues = countAuditIssues(beforeData);

  if (options.mode === 'audit') {
    printReport(
      {
        mode: 'audit',
        dryRun: true,
        issues: beforeIssues,
        schema: {
          postCategories: beforeData.postCategoriesSchema,
        },
        hasIssues: hasAnyIssues(beforeIssues),
      },
      options.json,
    );
    return;
  }

  const fallbackCategoryId = beforeData.fallbackCategory?.id ?? '__fallback_category__';
  const fallbackTagId = beforeData.fallbackTag?.id ?? '__fallback_tag__';
  const dryRunPlan = buildRepairPlan(beforeData, fallbackCategoryId, fallbackTagId);

  if (!options.apply) {
    printReport(
      {
        mode: 'repair',
        dryRun: true,
        beforeIssues,
        schema: {
          postCategories: beforeData.postCategoriesSchema,
        },
        plannedChanges: {
          promptsUpdated: dryRunPlan.promptUpdates.length,
          postsUpdated: dryRunPlan.postUpdates.length,
          collabsUpdated: dryRunPlan.collabUpdates.length,
        },
      },
      options.json,
    );
    return;
  }

  const schemaRepair = await ensurePostCategoriesSchema(prisma);

  const repairResult = await prisma.$transaction(
    async (tx) => {
      const fallbackCategory = await tx.category.upsert({
        where: { slug: 'uncategorized' },
        update: {
          name: 'Uncategorized',
          deletedAt: null,
        },
        create: {
          name: 'Uncategorized',
          slug: 'uncategorized',
          description: 'Fallback category for uncategorized content.',
          sortOrder: 0,
        },
        select: { id: true },
      });

      const fallbackTag = await tx.tag.upsert({
        where: { slug: 'default' },
        update: {
          name: 'Default',
          deletedAt: null,
          color: null,
        },
        create: {
          name: 'Default',
          slug: 'default',
          color: null,
        },
        select: { id: true },
      });

      const latestData = await loadDashboardData(tx);
      const plan = buildRepairPlan(latestData, fallbackCategory.id, fallbackTag.id);
      const appliedCounts = await applyRepairPlan(tx, plan);

      return {
        fallbackCategoryId: fallbackCategory.id,
        fallbackTagId: fallbackTag.id,
        appliedCounts,
      };
    },
    {
      maxWait: 20_000,
      timeout: 60_000,
    },
  );

  const afterData = await loadDashboardData(prisma);
  const afterIssues = countAuditIssues(afterData);

  printReport(
    {
      mode: 'repair',
      dryRun: false,
      beforeIssues,
      afterIssues,
      schema: {
        before: beforeData.postCategoriesSchema,
        repair: schemaRepair,
        after: afterData.postCategoriesSchema,
      },
      appliedChanges: repairResult.appliedCounts,
      fallbackCategoryId: repairResult.fallbackCategoryId,
      fallbackTagId: repairResult.fallbackTagId,
    },
    options.json,
  );
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  await runAudit(options);
}

main()
  .catch((error) => {
    console.error('[dashboard-integrity] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
