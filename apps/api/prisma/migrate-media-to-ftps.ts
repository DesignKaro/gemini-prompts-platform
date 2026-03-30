import { PrismaClient, PromptStatus, MediaStatus, Prisma } from '@prisma/client';
import { Client, type AccessOptions } from 'basic-ftp';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { Readable } from 'node:stream';

type Scope = 'media' | 'prompts' | 'posts' | 'categories' | 'avatars' | 'editor';
type StoredUpload = {
  publicUrl: string;
  storageKey: string;
  mime: string;
  size: number;
};

type MigrationFailure = {
  target: string;
  recordId: string;
  reason: string;
};

type MigrationReport = {
  startedAt: string;
  finishedAt?: string;
  dryRun: boolean;
  uploadedFiles: number;
  updatedRecords: number;
  skippedRecords: number;
  failedRecords: number;
  failures: MigrationFailure[];
};

const DATA_URL_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i;
const INLINE_IMAGE_PATTERN = /src=(["'])(data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+)\1/gi;

function requiredEnv(key: string) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string) {
  const value = process.env[key]?.trim();
  return value || fallback;
}

function parseBooleanFlag(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }
  return fallback;
}

function isDataImageUrl(value: string | null | undefined): value is string {
  return typeof value === 'string' && DATA_URL_PATTERN.test(value.trim());
}

function mimeToExtension(mime: string) {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'image/svg+xml': 'svg',
  };
  return map[mime.toLowerCase()] ?? 'bin';
}

class FtpsUploader {
  private readonly client = new Client(20_000);
  private readonly cache = new Map<string, StoredUpload>();
  private readonly host = requiredEnv('FTP_HOST');
  private readonly port = Number(optionalEnv('FTP_PORT', '21'));
  private readonly user = requiredEnv('FTP_USER');
  private readonly pass = requiredEnv('FTP_PASS');
  private readonly secureMode = optionalEnv('FTP_SECURE_MODE', 'explicit');
  private readonly rootDir = optionalEnv('FTP_ROOT_DIR', '/public_html/gemini_prompts').replace(
    /\/+$/,
    '',
  );
  private readonly tlsRejectUnauthorized = parseBooleanFlag(
    process.env.FTP_TLS_REJECT_UNAUTHORIZED,
    true,
  );
  private readonly tlsServername = process.env.FTP_TLS_SERVERNAME?.trim();
  private readonly publicBaseUrl = optionalEnv(
    'MEDIA_PUBLIC_BASE_URL',
    'https://media.geminiprompts.io/gemini_prompts',
  ).replace(/\/+$/, '');

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

  async uploadDataUrl(dataUrl: string, scope: Scope): Promise<StoredUpload> {
    const normalized = dataUrl.trim();
    const cached = this.cache.get(normalized);
    if (cached) {
      return cached;
    }

    const match = normalized.match(DATA_URL_PATTERN);
    if (!match) {
      throw new Error('Invalid image data URL.');
    }

    const mime = match[1]!.toLowerCase();
    const base64 = match[2]!.replace(/\s+/g, '');
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length === 0) {
      throw new Error('Data URL image is empty.');
    }

    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 32);
    const extension = mimeToExtension(mime);
    const fileName = `${hash}.${extension}`;
    const storageKey = `${scope}/${year}/${month}/${fileName}`;
    const remoteDir = `${this.rootDir}/${scope}/${year}/${month}`;

    await this.client.ensureDir(remoteDir);
    await this.client.uploadFrom(Readable.from(buffer), fileName);

    const uploaded = {
      publicUrl: `${this.publicBaseUrl}/${storageKey
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/')}`,
      storageKey,
      mime,
      size: buffer.length,
    };
    this.cache.set(normalized, uploaded);
    return uploaded;
  }

  async replaceInlineImages(
    html: string,
    scope: Scope = 'editor',
  ): Promise<{ html: string; replaced: number }> {
    const matches = Array.from(html.matchAll(INLINE_IMAGE_PATTERN));
    if (matches.length === 0) {
      return { html, replaced: 0 };
    }

    const mapping = new Map<string, string>();
    for (const match of matches) {
      const dataUrl = match[2];
      if (!dataUrl || mapping.has(dataUrl)) {
        continue;
      }
      const uploaded = await this.uploadDataUrl(dataUrl, scope);
      mapping.set(dataUrl, uploaded.publicUrl);
    }

    let next = html;
    let replaced = 0;
    for (const [source, target] of mapping) {
      if (!next.includes(source)) {
        continue;
      }
      next = next.split(source).join(target);
      replaced += 1;
    }

    return { html: next, replaced };
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const prisma = new PrismaClient();
  const uploader = new FtpsUploader();
  const report: MigrationReport = {
    startedAt: new Date().toISOString(),
    dryRun,
    uploadedFiles: 0,
    updatedRecords: 0,
    skippedRecords: 0,
    failedRecords: 0,
    failures: [],
  };

  const trackFailure = (target: string, recordId: string, error: unknown) => {
    report.failedRecords += 1;
    report.failures.push({
      target,
      recordId,
      reason: error instanceof Error ? error.message : String(error),
    });
  };

  try {
    await uploader.connect();

    const mediaAssets = await prisma.mediaAsset.findMany({
      where: {
        status: MediaStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        url: true,
      },
    });

    for (const asset of mediaAssets) {
      if (!isDataImageUrl(asset.url)) {
        report.skippedRecords += 1;
        continue;
      }

      try {
        const uploaded = await uploader.uploadDataUrl(asset.url, 'media');
        report.uploadedFiles += 1;
        if (!dryRun) {
          await prisma.mediaAsset.update({
            where: { id: asset.id },
            data: {
              url: uploaded.publicUrl,
              storageKey: uploaded.storageKey,
              mime: uploaded.mime,
              size: uploaded.size,
            },
          });
        }
        report.updatedRecords += 1;
      } catch (error) {
        trackFailure('mediaAsset', asset.id, error);
      }
    }

    const prompts = await prisma.prompt.findMany({
      where: {
        deletedAt: null,
        status: PromptStatus.PUBLISHED,
      },
      select: {
        id: true,
        featuredImageUrl: true,
        galleryImageUrls: true,
        content: true,
      },
    });

    for (const prompt of prompts) {
      try {
        let shouldUpdate = false;
        const nextData: Record<string, unknown> = {};

        if (isDataImageUrl(prompt.featuredImageUrl)) {
          const uploaded = await uploader.uploadDataUrl(prompt.featuredImageUrl, 'prompts');
          report.uploadedFiles += 1;
          nextData.featuredImageUrl = uploaded.publicUrl;
          shouldUpdate = true;
        }

        if (Array.isArray(prompt.galleryImageUrls)) {
          const nextGallery: string[] = [];
          for (const entry of prompt.galleryImageUrls) {
            if (typeof entry !== 'string') {
              continue;
            }
            if (isDataImageUrl(entry)) {
              const uploaded = await uploader.uploadDataUrl(entry, 'prompts');
              report.uploadedFiles += 1;
              nextGallery.push(uploaded.publicUrl);
              shouldUpdate = true;
            } else {
              nextGallery.push(entry);
            }
          }
          if (shouldUpdate) {
            nextData.galleryImageUrls = nextGallery;
          }
        }

        if (prompt.content.includes('data:image')) {
          const replaced = await uploader.replaceInlineImages(prompt.content, 'editor');
          if (replaced.replaced > 0) {
            nextData.content = replaced.html;
            shouldUpdate = true;
            report.uploadedFiles += replaced.replaced;
          }
        }

        if (!shouldUpdate) {
          report.skippedRecords += 1;
          continue;
        }

        if (!dryRun) {
          await prisma.prompt.update({
            where: { id: prompt.id },
            data: nextData as Prisma.PromptUpdateInput,
          });
        }
        report.updatedRecords += 1;
      } catch (error) {
        trackFailure('prompt', prompt.id, error);
      }
    }

    const posts = await prisma.post.findMany({
      where: {
        deletedAt: null,
        status: PromptStatus.PUBLISHED,
      },
      select: {
        id: true,
        featuredImageUrl: true,
        content: true,
      },
    });

    for (const post of posts) {
      try {
        let shouldUpdate = false;
        const nextData: Record<string, unknown> = {};

        if (isDataImageUrl(post.featuredImageUrl)) {
          const uploaded = await uploader.uploadDataUrl(post.featuredImageUrl, 'posts');
          report.uploadedFiles += 1;
          nextData.featuredImageUrl = uploaded.publicUrl;
          shouldUpdate = true;
        }

        if (post.content.includes('data:image')) {
          const replaced = await uploader.replaceInlineImages(post.content, 'editor');
          if (replaced.replaced > 0) {
            nextData.content = replaced.html;
            shouldUpdate = true;
            report.uploadedFiles += replaced.replaced;
          }
        }

        if (!shouldUpdate) {
          report.skippedRecords += 1;
          continue;
        }

        if (!dryRun) {
          await prisma.post.update({
            where: { id: post.id },
            data: nextData as Prisma.PostUpdateInput,
          });
        }
        report.updatedRecords += 1;
      } catch (error) {
        trackFailure('post', post.id, error);
      }
    }

    const categories = await prisma.category.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        imageUrl: true,
      },
    });

    for (const category of categories) {
      if (!isDataImageUrl(category.imageUrl)) {
        report.skippedRecords += 1;
        continue;
      }

      try {
        const uploaded = await uploader.uploadDataUrl(category.imageUrl, 'categories');
        report.uploadedFiles += 1;
        if (!dryRun) {
          await prisma.category.update({
            where: { id: category.id },
            data: { imageUrl: uploaded.publicUrl },
          });
        }
        report.updatedRecords += 1;
      } catch (error) {
        trackFailure('category', category.id, error);
      }
    }

    const users = await prisma.user.findMany({
      where: {
        suspendedAt: null,
      },
      select: {
        id: true,
        avatarUrl: true,
      },
    });

    for (const user of users) {
      if (!isDataImageUrl(user.avatarUrl)) {
        report.skippedRecords += 1;
        continue;
      }

      try {
        const uploaded = await uploader.uploadDataUrl(user.avatarUrl, 'avatars');
        report.uploadedFiles += 1;
        if (!dryRun) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              avatarUrl: uploaded.publicUrl,
              avatarUpdatedAt: new Date(),
            },
          });
        }
        report.updatedRecords += 1;
      } catch (error) {
        trackFailure('user', user.id, error);
      }
    }
  } finally {
    report.finishedAt = new Date().toISOString();
    uploader.close();
    await prisma.$disconnect();
  }

  const fileSafeTimestamp = report.startedAt.replace(/[^0-9]/g, '').slice(0, 14);
  const reportPath = `/tmp/media-migration-report-${fileSafeTimestamp}.json`;
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(
    JSON.stringify(
      {
        summary: {
          dryRun: report.dryRun,
          uploadedFiles: report.uploadedFiles,
          updatedRecords: report.updatedRecords,
          skippedRecords: report.skippedRecords,
          failedRecords: report.failedRecords,
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
  console.error(`Media migration failed: ${message}`);
  process.exit(1);
});
