import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type CategoryRef = { id: string; deletedAt: Date | null };
type TagRef = { id: string; deletedAt: Date | null };

function needsPrimaryFallback(
  primaryId: string | null,
  deletedCategoryIds: Set<string>,
  fallbackCategoryId: string,
) {
  if (!primaryId) return true;
  if (primaryId === fallbackCategoryId) return false;
  return deletedCategoryIds.has(primaryId);
}

function pickDeletedRelationIds<T extends CategoryRef | TagRef>(items: T[]) {
  return items.filter((item) => item.deletedAt).map((item) => item.id);
}

async function main() {
  const fallbackCategory = await prisma.category.upsert({
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
  });

  const fallbackTag = await prisma.tag.upsert({
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
  });

  const [deletedCategories, deletedTags] = await Promise.all([
    prisma.category.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true },
    }),
    prisma.tag.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true },
    }),
  ]);

  const deletedCategoryIds = new Set(deletedCategories.map((item) => item.id));
  const deletedTagIds = new Set(deletedTags.map((item) => item.id));

  let promptsUpdated = 0;
  let postsUpdated = 0;
  let collabsUpdated = 0;

  const prompts = await prisma.prompt.findMany({
    select: {
      id: true,
      primaryCategoryId: true,
      categories: { select: { id: true, deletedAt: true } },
      tags: { select: { id: true, deletedAt: true } },
    },
  });

  for (const prompt of prompts) {
    const deletedCategoryRelationIds = pickDeletedRelationIds(prompt.categories);
    const activeCategoryCount = prompt.categories.filter((category) => !category.deletedAt).length;
    const deletedTagRelationIds = pickDeletedRelationIds(prompt.tags);
    const activeTagCount = prompt.tags.filter((tag) => !tag.deletedAt).length;

    const shouldUpdatePrimary = needsPrimaryFallback(
      prompt.primaryCategoryId,
      deletedCategoryIds,
      fallbackCategory.id,
    );
    const shouldFixCategories = deletedCategoryRelationIds.length > 0 || activeCategoryCount === 0;
    const shouldFixTags = deletedTagRelationIds.length > 0 || activeTagCount === 0;

    if (!shouldUpdatePrimary && !shouldFixCategories && !shouldFixTags) {
      continue;
    }

    await prisma.prompt.update({
      where: { id: prompt.id },
      data: {
        ...(shouldUpdatePrimary ? { primaryCategoryId: fallbackCategory.id } : {}),
        ...(shouldFixCategories
          ? {
              categories: {
                ...(deletedCategoryRelationIds.length > 0
                  ? { disconnect: deletedCategoryRelationIds.map((id) => ({ id })) }
                  : {}),
                ...(activeCategoryCount === 0 ? { connect: { id: fallbackCategory.id } } : {}),
              },
            }
          : {}),
        ...(shouldFixTags
          ? {
              tags: {
                ...(deletedTagRelationIds.length > 0
                  ? { disconnect: deletedTagRelationIds.map((id) => ({ id })) }
                  : {}),
                ...(activeTagCount === 0 ? { connect: { id: fallbackTag.id } } : {}),
              },
            }
          : {}),
      },
    });

    promptsUpdated += 1;
  }

  const posts = await prisma.post.findMany({
    select: {
      id: true,
      primaryCategoryId: true,
      categories: { select: { id: true, deletedAt: true } },
      tags: { select: { id: true, deletedAt: true } },
    },
  });

  for (const post of posts) {
    const deletedCategoryRelationIds = pickDeletedRelationIds(post.categories);
    const activeCategoryCount = post.categories.filter((category) => !category.deletedAt).length;
    const deletedTagRelationIds = pickDeletedRelationIds(post.tags);
    const activeTagCount = post.tags.filter((tag) => !tag.deletedAt).length;

    const shouldUpdatePrimary = needsPrimaryFallback(
      post.primaryCategoryId,
      deletedCategoryIds,
      fallbackCategory.id,
    );
    const shouldFixCategories = deletedCategoryRelationIds.length > 0 || activeCategoryCount === 0;
    const shouldFixTags = deletedTagRelationIds.length > 0 || activeTagCount === 0;

    if (!shouldUpdatePrimary && !shouldFixCategories && !shouldFixTags) {
      continue;
    }

    await prisma.post.update({
      where: { id: post.id },
      data: {
        ...(shouldUpdatePrimary ? { primaryCategoryId: fallbackCategory.id } : {}),
        ...(shouldFixCategories
          ? {
              categories: {
                ...(deletedCategoryRelationIds.length > 0
                  ? { disconnect: deletedCategoryRelationIds.map((id) => ({ id })) }
                  : {}),
                ...(activeCategoryCount === 0 ? { connect: { id: fallbackCategory.id } } : {}),
              },
            }
          : {}),
        ...(shouldFixTags
          ? {
              tags: {
                ...(deletedTagRelationIds.length > 0
                  ? { disconnect: deletedTagRelationIds.map((id) => ({ id })) }
                  : {}),
                ...(activeTagCount === 0 ? { connect: { id: fallbackTag.id } } : {}),
              },
            }
          : {}),
      },
    });

    postsUpdated += 1;
  }

  const collabs = await prisma.collab.findMany({
    select: {
      id: true,
      categories: { select: { id: true, deletedAt: true } },
      tags: { select: { id: true, deletedAt: true } },
    },
  });

  for (const collab of collabs) {
    const deletedCategoryRelationIds = pickDeletedRelationIds(collab.categories);
    const activeCategoryCount = collab.categories.filter((category) => !category.deletedAt).length;
    const deletedTagRelationIds = pickDeletedRelationIds(collab.tags);
    const activeTagCount = collab.tags.filter((tag) => !tag.deletedAt).length;

    const shouldFixCategories = deletedCategoryRelationIds.length > 0 || activeCategoryCount === 0;
    const shouldFixTags = deletedTagRelationIds.length > 0 || activeTagCount === 0;

    if (!shouldFixCategories && !shouldFixTags) {
      continue;
    }

    await prisma.collab.update({
      where: { id: collab.id },
      data: {
        ...(shouldFixCategories
          ? {
              categories: {
                ...(deletedCategoryRelationIds.length > 0
                  ? { disconnect: deletedCategoryRelationIds.map((id) => ({ id })) }
                  : {}),
                ...(activeCategoryCount === 0 ? { connect: { id: fallbackCategory.id } } : {}),
              },
            }
          : {}),
        ...(shouldFixTags
          ? {
              tags: {
                ...(deletedTagRelationIds.length > 0
                  ? { disconnect: deletedTagRelationIds.map((id) => ({ id })) }
                  : {}),
                ...(activeTagCount === 0 ? { connect: { id: fallbackTag.id } } : {}),
              },
            }
          : {}),
      },
    });

    collabsUpdated += 1;
  }

  console.log(
    `[backfill-default-taxonomy] done: prompts=${promptsUpdated}, posts=${postsUpdated}, collabs=${collabsUpdated}`,
  );
}

main()
  .catch((error) => {
    console.error('[backfill-default-taxonomy] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
