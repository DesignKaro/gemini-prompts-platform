import { Prisma, PrismaClient } from '@prisma/client';
import { Client, type AccessOptions } from 'basic-ftp';
import { basename, dirname, posix as pathPosix } from 'node:path';
import { Readable } from 'node:stream';
import { writeFile } from 'node:fs/promises';

type SyncFailure = {
  url: string;
  reason: string;
};

type SyncReport = {
  startedAt: string;
  oldPrefix: string;
  newPrefix: string;
  discoveredUrls: number;
  copiedUrls: number;
  failedCopies: number;
  dbUrlReplacements: number;
  galleryRowsUpdated: number;
  failures: SyncFailure[];
  finishedAt?: string;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class FtpsClient {
  private readonly client = new Client(25_000);
  private readonly host = requiredEnv('FTP_HOST');
  private readonly port = Number(optionalEnv('FTP_PORT', '21'));
  private readonly user = requiredEnv('FTP_USER');
  private readonly pass = requiredEnv('FTP_PASS');
  private readonly secureMode = optionalEnv('FTP_SECURE_MODE', 'explicit');
  private readonly rootDir = requiredEnv('FTP_ROOT_DIR').replace(/\/+$/, '');
  private readonly tlsRejectUnauthorized = parseBoolean(
    process.env.FTP_TLS_REJECT_UNAUTHORIZED,
    true,
  );
  private readonly tlsServername = process.env.FTP_TLS_SERVERNAME?.trim();

  async connect() {
    const secure: AccessOptions['secure'] =
      this.secureMode === 'none' ? false : this.secureMode === 'implicit' ? 'implicit' : true;

    await this.client.access({
      host: this.host,
      port: this.port,
      user: this.user,
      password: this.pass,
      secure,
      secureOptions: {
        rejectUnauthorized: this.tlsRejectUnauthorized,
        ...(this.tlsServername ? { servername: this.tlsServername } : {}),
      },
    });
  }

  close() {
    this.client.close();
  }

  async uploadByRelativePath(relativePath: string, bytes: Buffer) {
    const normalizedPath = relativePath.replace(/^\/+/, '');
    const targetDir = pathPosix.join(this.rootDir, dirname(normalizedPath).replace(/\\/g, '/'));
    const fileName = basename(normalizedPath);

    await this.client.ensureDir(targetDir);
    await this.client.uploadFrom(Readable.from(bytes), fileName);
  }
}

async function main() {
  const oldPrefix = optionalEnv(
    'OLD_MEDIA_PREFIX',
    'https://media.argro.io/gemini_prompts',
  ).replace(/\/+$/, '');
  const newPrefix = requiredEnv('MEDIA_PUBLIC_BASE_URL').replace(/\/+$/, '');
  const oldPrefixPattern = new RegExp(`${escapeRegex(oldPrefix)}[^\\s"'<>)]*`, 'g');
  const newPrefixUrl = new URL(newPrefix);
  const newPrefixPath = newPrefixUrl.pathname.replace(/\/+$/, '');

  const prisma = new PrismaClient();
  const ftp = new FtpsClient();
  const report: SyncReport = {
    startedAt: new Date().toISOString(),
    oldPrefix,
    newPrefix,
    discoveredUrls: 0,
    copiedUrls: 0,
    failedCopies: 0,
    dbUrlReplacements: 0,
    galleryRowsUpdated: 0,
    failures: [],
  };

  try {
    await ftp.connect();
    const urls = new Set<string>();

    const mediaAssets = await prisma.mediaAsset.findMany({
      select: { id: true, url: true },
    });
    for (const row of mediaAssets) {
      if (typeof row.url === 'string' && row.url.startsWith(oldPrefix)) {
        urls.add(row.url);
      }
    }

    const prompts = await prisma.prompt.findMany({
      select: { id: true, featuredImageUrl: true, galleryImageUrls: true, content: true },
    });
    for (const row of prompts) {
      if (typeof row.featuredImageUrl === 'string' && row.featuredImageUrl.startsWith(oldPrefix)) {
        urls.add(row.featuredImageUrl);
      }

      if (Array.isArray(row.galleryImageUrls)) {
        for (const entry of row.galleryImageUrls) {
          if (typeof entry === 'string' && entry.startsWith(oldPrefix)) {
            urls.add(entry);
          }
        }
      }

      const contentUrls = row.content.match(oldPrefixPattern) ?? [];
      for (const entry of contentUrls) {
        urls.add(entry);
      }
    }

    const posts = await prisma.post.findMany({
      select: { id: true, featuredImageUrl: true, content: true },
    });
    for (const row of posts) {
      if (typeof row.featuredImageUrl === 'string' && row.featuredImageUrl.startsWith(oldPrefix)) {
        urls.add(row.featuredImageUrl);
      }
      const contentUrls = row.content.match(oldPrefixPattern) ?? [];
      for (const entry of contentUrls) {
        urls.add(entry);
      }
    }

    const categories = await prisma.category.findMany({
      select: { id: true, imageUrl: true },
    });
    for (const row of categories) {
      if (typeof row.imageUrl === 'string' && row.imageUrl.startsWith(oldPrefix)) {
        urls.add(row.imageUrl);
      }
    }

    const users = await prisma.user.findMany({
      select: { id: true, avatarUrl: true },
    });
    for (const row of users) {
      if (typeof row.avatarUrl === 'string' && row.avatarUrl.startsWith(oldPrefix)) {
        urls.add(row.avatarUrl);
      }
    }

    const collabs = await prisma.collab.findMany({
      select: { id: true, featuredImageUrl: true },
    });
    for (const row of collabs) {
      if (typeof row.featuredImageUrl === 'string' && row.featuredImageUrl.startsWith(oldPrefix)) {
        urls.add(row.featuredImageUrl);
      }
    }

    const seoRows = await prisma.seoSettings.findMany({
      select: { id: true, defaultOgImageUrl: true, organizationLogoUrl: true },
    });
    for (const row of seoRows) {
      if (
        typeof row.defaultOgImageUrl === 'string' &&
        row.defaultOgImageUrl.startsWith(oldPrefix)
      ) {
        urls.add(row.defaultOgImageUrl);
      }
      if (
        typeof row.organizationLogoUrl === 'string' &&
        row.organizationLogoUrl.startsWith(oldPrefix)
      ) {
        urls.add(row.organizationLogoUrl);
      }
    }

    report.discoveredUrls = urls.size;

    for (const sourceUrl of urls) {
      try {
        const response = await fetch(sourceUrl, {
          method: 'GET',
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`Download failed with status ${response.status}`);
        }

        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length === 0) {
          throw new Error('Downloaded file is empty.');
        }

        const targetUrl = sourceUrl.replace(oldPrefix, newPrefix);
        const targetPathname = new URL(targetUrl).pathname;
        const normalizedPrefixPath = `${newPrefixPath}/`;
        if (!targetPathname.startsWith(normalizedPrefixPath)) {
          throw new Error(`Target path is outside media prefix: ${targetPathname}`);
        }

        const relativePath = targetPathname.slice(normalizedPrefixPath.length);
        await ftp.uploadByRelativePath(relativePath, bytes);
        report.copiedUrls += 1;
      } catch (error) {
        report.failedCopies += 1;
        report.failures.push({
          url: sourceUrl,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    for (const row of mediaAssets) {
      if (typeof row.url !== 'string' || !row.url.startsWith(oldPrefix)) continue;
      const nextUrl = row.url.replace(oldPrefix, newPrefix);
      await prisma.mediaAsset.update({
        where: { id: row.id },
        data: { url: nextUrl },
      });
      report.dbUrlReplacements += 1;
    }

    for (const prompt of prompts) {
      const updateData: Prisma.PromptUpdateInput = {};

      if (
        typeof prompt.featuredImageUrl === 'string' &&
        prompt.featuredImageUrl.startsWith(oldPrefix)
      ) {
        updateData.featuredImageUrl = prompt.featuredImageUrl.replace(oldPrefix, newPrefix);
      }

      if (typeof prompt.content === 'string' && prompt.content.includes(oldPrefix)) {
        updateData.content = prompt.content.split(oldPrefix).join(newPrefix);
      }

      if (Array.isArray(prompt.galleryImageUrls)) {
        const currentGallery = prompt.galleryImageUrls;
        const nextGallery = currentGallery.map((entry) =>
          typeof entry === 'string' && entry.startsWith(oldPrefix)
            ? entry.replace(oldPrefix, newPrefix)
            : entry,
        );
        const changed = nextGallery.some((entry, index) => entry !== currentGallery[index]);
        if (changed) {
          updateData.galleryImageUrls = nextGallery as Prisma.InputJsonValue;
          report.galleryRowsUpdated += 1;
        }
      }

      if (Object.keys(updateData).length === 0) continue;
      await prisma.prompt.update({
        where: { id: prompt.id },
        data: updateData,
      });
      report.dbUrlReplacements += 1;
    }

    for (const row of posts) {
      const updateData: Prisma.PostUpdateInput = {};
      if (typeof row.featuredImageUrl === 'string' && row.featuredImageUrl.startsWith(oldPrefix)) {
        updateData.featuredImageUrl = row.featuredImageUrl.replace(oldPrefix, newPrefix);
      }
      if (typeof row.content === 'string' && row.content.includes(oldPrefix)) {
        updateData.content = row.content.split(oldPrefix).join(newPrefix);
      }
      if (Object.keys(updateData).length === 0) continue;
      await prisma.post.update({
        where: { id: row.id },
        data: updateData,
      });
      report.dbUrlReplacements += 1;
    }

    for (const row of categories) {
      if (typeof row.imageUrl !== 'string' || !row.imageUrl.startsWith(oldPrefix)) continue;
      await prisma.category.update({
        where: { id: row.id },
        data: { imageUrl: row.imageUrl.replace(oldPrefix, newPrefix) },
      });
      report.dbUrlReplacements += 1;
    }

    for (const row of users) {
      if (typeof row.avatarUrl !== 'string' || !row.avatarUrl.startsWith(oldPrefix)) continue;
      await prisma.user.update({
        where: { id: row.id },
        data: { avatarUrl: row.avatarUrl.replace(oldPrefix, newPrefix) },
      });
      report.dbUrlReplacements += 1;
    }

    for (const row of collabs) {
      if (typeof row.featuredImageUrl !== 'string' || !row.featuredImageUrl.startsWith(oldPrefix)) {
        continue;
      }
      await prisma.collab.update({
        where: { id: row.id },
        data: { featuredImageUrl: row.featuredImageUrl.replace(oldPrefix, newPrefix) },
      });
      report.dbUrlReplacements += 1;
    }

    for (const row of seoRows) {
      const updateData: Prisma.SeoSettingsUpdateInput = {};
      if (
        typeof row.defaultOgImageUrl === 'string' &&
        row.defaultOgImageUrl.startsWith(oldPrefix)
      ) {
        updateData.defaultOgImageUrl = row.defaultOgImageUrl.replace(oldPrefix, newPrefix);
      }
      if (
        typeof row.organizationLogoUrl === 'string' &&
        row.organizationLogoUrl.startsWith(oldPrefix)
      ) {
        updateData.organizationLogoUrl = row.organizationLogoUrl.replace(oldPrefix, newPrefix);
      }
      if (Object.keys(updateData).length === 0) continue;
      await prisma.seoSettings.update({
        where: { id: row.id },
        data: updateData,
      });
      report.dbUrlReplacements += 1;
    }
  } finally {
    report.finishedAt = new Date().toISOString();
    ftp.close();
    await prisma.$disconnect();
  }

  const stamp = report.startedAt.replace(/[^0-9]/g, '').slice(0, 14);
  const reportPath = `/tmp/media-domain-sync-report-${stamp}.json`;
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(
    JSON.stringify(
      {
        summary: {
          discoveredUrls: report.discoveredUrls,
          copiedUrls: report.copiedUrls,
          failedCopies: report.failedCopies,
          dbUrlReplacements: report.dbUrlReplacements,
          galleryRowsUpdated: report.galleryRowsUpdated,
        },
        reportPath,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Media domain sync failed: ${message}`);
  process.exit(1);
});
