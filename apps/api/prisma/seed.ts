import { AuthProvider, PrismaClient } from '@prisma/client';
import { scrypt as nodeScrypt } from 'node:crypto';
import { promisify } from 'node:util';

const prisma = new PrismaClient();
const scrypt = promisify(nodeScrypt);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function hashPassword(password: string): Promise<string> {
  const salt = 'seed-static-salt';
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function main() {
  const seedPasswordHash = await hashPassword('SeedPass123!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@geminiprompts.local' },
    update: {
      name: 'Admin User',
      role: 'ADMIN',
      plan: 'PREMIUM',
    },
    create: {
      email: 'admin@geminiprompts.local',
      name: 'Admin User',
      role: 'ADMIN',
      plan: 'PREMIUM',
    },
  });

  const contributor = await prisma.user.upsert({
    where: { email: 'creator@geminiprompts.local' },
    update: {
      name: 'Creator User',
      role: 'USER',
      plan: 'FREE',
    },
    create: {
      email: 'creator@geminiprompts.local',
      name: 'Creator User',
      role: 'USER',
      plan: 'FREE',
    },
  });

  await prisma.passwordCredential.upsert({
    where: { userId: admin.id },
    update: { passwordHash: seedPasswordHash },
    create: {
      userId: admin.id,
      passwordHash: seedPasswordHash,
    },
  });

  await prisma.passwordCredential.upsert({
    where: { userId: contributor.id },
    update: { passwordHash: seedPasswordHash },
    create: {
      userId: contributor.id,
      passwordHash: seedPasswordHash,
    },
  });

  await prisma.authAccount.upsert({
    where: {
      provider_providerAccountId: {
        provider: AuthProvider.CREDENTIALS,
        providerAccountId: admin.email,
      },
    },
    update: { email: admin.email, userId: admin.id },
    create: {
      userId: admin.id,
      provider: AuthProvider.CREDENTIALS,
      providerAccountId: admin.email,
      email: admin.email,
    },
  });

  await prisma.authAccount.upsert({
    where: {
      provider_providerAccountId: {
        provider: AuthProvider.CREDENTIALS,
        providerAccountId: contributor.email,
      },
    },
    update: { email: contributor.email, userId: contributor.id },
    create: {
      userId: contributor.id,
      provider: AuthProvider.CREDENTIALS,
      providerAccountId: contributor.email,
      email: contributor.email,
    },
  });

  const categoryNames = ['Marketing', 'Wedding', 'Photography', 'Social Media', 'Web Design'];
  const tagNames = ['cinematic', '4k', 'hyper-realistic', 'viral', 'gemini-image'];

  const categories = await Promise.all(
    categoryNames.map((name) =>
      prisma.category.upsert({
        where: { slug: slugify(name) },
        update: { name },
        create: { name, slug: slugify(name) },
      }),
    ),
  );

  const tags = await Promise.all(
    tagNames.map((name) =>
      prisma.tag.upsert({
        where: { slug: slugify(name) },
        update: { name },
        create: { name, slug: slugify(name) },
      }),
    ),
  );

  const prompt = await prisma.prompt.upsert({
    where: { slug: 'cinematic-wedding-photography-gemini-prompt' },
    update: {
      title: 'Cinematic Wedding Photography Gemini Prompt',
      description: 'Generate dreamy cinematic wedding portraits with premium film lighting.',
      content:
        'Create a cinematic wedding portrait with natural golden-hour light, shallow depth of field, and elegant fashion details.',
      promptType: 'GEMINI_IMAGE',
      visibility: 'FREE',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      authorId: admin.id,
      categories: {
        set: [],
        connect: categories
          .filter((category) => ['Wedding', 'Photography'].includes(category.name))
          .map((category) => ({ id: category.id })),
      },
      tags: {
        set: [],
        connect: tags
          .filter((tag) => ['cinematic', '4k', 'gemini-image'].includes(tag.name))
          .map((tag) => ({ id: tag.id })),
      },
    },
    create: {
      title: 'Cinematic Wedding Photography Gemini Prompt',
      slug: 'cinematic-wedding-photography-gemini-prompt',
      description: 'Generate dreamy cinematic wedding portraits with premium film lighting.',
      content:
        'Create a cinematic wedding portrait with natural golden-hour light, shallow depth of field, and elegant fashion details.',
      promptType: 'GEMINI_IMAGE',
      visibility: 'FREE',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      authorId: admin.id,
      categories: {
        connect: categories
          .filter((category) => ['Wedding', 'Photography'].includes(category.name))
          .map((category) => ({ id: category.id })),
      },
      tags: {
        connect: tags
          .filter((tag) => ['cinematic', '4k', 'gemini-image'].includes(tag.name))
          .map((tag) => ({ id: tag.id })),
      },
    },
  });

  const collab = await prisma.collab.upsert({
    where: { slug: 'top-10-trending-wedding-image-prompts' },
    update: {
      title: 'Top 10 Trending Wedding Image Prompts',
      description: 'A high-performing collection of wedding image prompts for Gemini and image models.',
      visibility: 'FREE',
      authorId: admin.id,
      categories: {
        set: [],
        connect: categories
          .filter((category) => ['Wedding', 'Photography'].includes(category.name))
          .map((category) => ({ id: category.id })),
      },
      tags: {
        set: [],
        connect: tags
          .filter((tag) => ['cinematic', '4k'].includes(tag.name))
          .map((tag) => ({ id: tag.id })),
      },
    },
    create: {
      title: 'Top 10 Trending Wedding Image Prompts',
      slug: 'top-10-trending-wedding-image-prompts',
      description: 'A high-performing collection of wedding image prompts for Gemini and image models.',
      visibility: 'FREE',
      authorId: admin.id,
      categories: {
        connect: categories
          .filter((category) => ['Wedding', 'Photography'].includes(category.name))
          .map((category) => ({ id: category.id })),
      },
      tags: {
        connect: tags
          .filter((tag) => ['cinematic', '4k'].includes(tag.name))
          .map((tag) => ({ id: tag.id })),
      },
    },
  });

  await prisma.collabPrompt.upsert({
    where: {
      collabId_promptId: {
        collabId: collab.id,
        promptId: prompt.id,
      },
    },
    update: {
      sortOrder: 1,
      sourcePromptId: prompt.id,
    },
    create: {
      collabId: collab.id,
      promptId: prompt.id,
      sourcePromptId: prompt.id,
      sortOrder: 1,
    },
  });

  await prisma.subscription.upsert({
    where: { providerRef: 'seed-admin-subscription' },
    update: {
      userId: admin.id,
      plan: 'PREMIUM',
      status: 'ACTIVE',
      provider: 'STRIPE',
      startAt: new Date(),
    },
    create: {
      userId: admin.id,
      plan: 'PREMIUM',
      status: 'ACTIVE',
      provider: 'STRIPE',
      providerRef: 'seed-admin-subscription',
      startAt: new Date(),
    },
  });

  await prisma.submission.upsert({
    where: { id: 'seed_submission_id' },
    update: {
      title: 'Viral Festival Reels Prompt Pack',
      description: 'A batch of short video prompt ideas for festival campaigns.',
      content: 'Generate 10 short-form video prompt concepts for festive product launches.',
      promptType: 'VIDEO',
      status: 'PENDING',
      submittedById: contributor.id,
    },
    create: {
      id: 'seed_submission_id',
      title: 'Viral Festival Reels Prompt Pack',
      description: 'A batch of short video prompt ideas for festival campaigns.',
      content: 'Generate 10 short-form video prompt concepts for festive product launches.',
      promptType: 'VIDEO',
      status: 'PENDING',
      submittedById: contributor.id,
    },
  });

  console.log('Seed completed successfully. Seed credentials password: SeedPass123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
