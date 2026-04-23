import { PrismaClient } from '@prisma/client';
import { Client, type AccessOptions } from 'basic-ftp';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { posix as pathPosix } from 'node:path';
import sharp from 'sharp';

type OptimizeResult = {
  categoryId: string;
  categoryName: string;
  sourceUrl: string;
  targetUrl?: string;
  sourceBytes?: number;
  outputBytes?: number;
  width?: number;
  height?: number;
  reductionPercent?: number;
  skipped?: string;
  error?: string;
};

const MAX_COMPRESSED_IMAGE_BYTES = 100 * 1024;
const WEBP_QUALITY_STEPS = [95, 92, 89, 86, 83, 80, 76, 72, 68, 64, 60, 56, 52, 48, 44];
const WEBP_SCALE_STEPS = [1, 0.95, 0.9, 0.85, 0.8, 0.72, 0.64, 0.56, 0.5, 0.44, 0.38, 0.33];

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

function shouldConvertToWebp(mime: string) {
  return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'].includes(mime);
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.trim().match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) {
    throw new Error('Invalid image data URL.');
  }

  return {
    mime: match[1]!.toLowerCase(),
    buffer: Buffer.from(match[2]!.replace(/\s+/g, ''), 'base64'),
  };
}

async function prepareUploadBuffer(input: { buffer: Buffer; mime: string }): Promise<{
  buffer: Buffer;
  mime: string;
  extension: string;
  width?: number;
  height?: number;
}> {
  const normalizedMime = input.mime.trim().toLowerCase();

  if (!shouldConvertToWebp(normalizedMime)) {
    if (input.buffer.length > MAX_COMPRESSED_IMAGE_BYTES) {
      throw new Error('Image exceeds the 100KB limit and cannot be converted.');
    }
    return {
      buffer: input.buffer,
      mime: normalizedMime,
      extension: normalizedMime.split('/').pop() || 'bin',
    };
  }

  const sourceMetadata = await sharp(input.buffer).metadata();
  const sourceWidth = sourceMetadata.width;
  const sourceHeight = sourceMetadata.height;

  if (!sourceWidth || !sourceHeight) {
    throw new Error('Unable to determine image dimensions.');
  }

  for (const scale of WEBP_SCALE_STEPS) {
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));
    const resizeConfig =
      scale < 1
        ? {
            width: targetWidth,
            height: targetHeight,
            fit: 'inside' as const,
            withoutEnlargement: true,
          }
        : null;

    const losslessPipeline = sharp(input.buffer).rotate();
    if (resizeConfig) {
      losslessPipeline.resize(resizeConfig);
    }

    const lossless = await losslessPipeline.webp({ lossless: true, effort: 6 }).toBuffer({
      resolveWithObject: true,
    });

    if (lossless.data.length <= MAX_COMPRESSED_IMAGE_BYTES) {
      return {
        buffer: lossless.data,
        mime: 'image/webp',
        extension: 'webp',
        width: lossless.info.width,
        height: lossless.info.height,
      };
    }

    for (const quality of WEBP_QUALITY_STEPS) {
      const qualityPipeline = sharp(input.buffer).rotate();
      if (resizeConfig) {
        qualityPipeline.resize(resizeConfig);
      }

      const candidate = await qualityPipeline
        .webp({
          quality,
          effort: 6,
          smartSubsample: true,
        })
        .toBuffer({ resolveWithObject: true });

      if (candidate.data.length <= MAX_COMPRESSED_IMAGE_BYTES) {
        return {
          buffer: candidate.data,
          mime: 'image/webp',
          extension: 'webp',
          width: candidate.info.width,
          height: candidate.info.height,
        };
      }
    }
  }

  throw new Error('Image exceeds the 100KB limit after compression.');
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

  async upload(storageKey: string, bytes: Buffer) {
    const normalizedKey = storageKey.replace(/^\/+/, '');
    const targetDir = pathPosix.join(this.rootDir, pathPosix.dirname(normalizedKey));
    const fileName = pathPosix.basename(normalizedKey);

    await this.client.ensureDir(targetDir);
    await this.client.uploadFrom(Readable.from(bytes), fileName);
  }
}

async function main() {
  const prisma = new PrismaClient();
  const ftp = new FtpsClient();
  const mediaBaseUrl = requiredEnv('MEDIA_PUBLIC_BASE_URL').replace(/\/+$/, '');
  const dryRun = process.argv.includes('--dry-run');

  const results: OptimizeResult[] = [];

  try {
    if (!dryRun) {
      await ftp.connect();
    }

    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    for (const category of categories) {
      if (!category.imageUrl) {
        results.push({
          categoryId: category.id,
          categoryName: category.name,
          sourceUrl: '',
          skipped: 'No imageUrl',
        });
        continue;
      }

      try {
        let contentType: string;
        let sourceBuffer: Buffer;

        if (category.imageUrl.startsWith('data:image/')) {
          const parsed = parseDataUrl(category.imageUrl);
          contentType = parsed.mime;
          sourceBuffer = parsed.buffer;
        } else {
          const response = await fetch(category.imageUrl);
          if (!response.ok) {
            throw new Error(`Download failed with status ${response.status}`);
          }

          contentType =
            response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() || '';
          sourceBuffer = Buffer.from(await response.arrayBuffer());
        }

        if (!contentType || !contentType.startsWith('image/')) {
          throw new Error(`Unsupported content-type: ${contentType || 'unknown'}`);
        }

        if (sourceBuffer.length === 0) {
          throw new Error('Downloaded image is empty.');
        }

        const prepared = await prepareUploadBuffer({
          buffer: sourceBuffer,
          mime: contentType,
        });

        if (prepared.buffer.length >= sourceBuffer.length) {
          results.push({
            categoryId: category.id,
            categoryName: category.name,
            sourceUrl: category.imageUrl,
            sourceBytes: sourceBuffer.length,
            outputBytes: prepared.buffer.length,
            width: prepared.width,
            height: prepared.height,
            skipped: 'No size improvement',
          });
          continue;
        }

        const now = new Date();
        const year = String(now.getUTCFullYear());
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const hash = createHash('sha256').update(prepared.buffer).digest('hex').slice(0, 32);
        const storageKey = `categories/${year}/${month}/${hash}.${prepared.extension}`;
        const targetUrl = `${mediaBaseUrl}/${storageKey
          .split('/')
          .map((segment) => encodeURIComponent(segment))
          .join('/')}`;

        if (!dryRun) {
          await ftp.upload(storageKey, prepared.buffer);
          await prisma.category.update({
            where: { id: category.id },
            data: { imageUrl: targetUrl },
          });
        }

        results.push({
          categoryId: category.id,
          categoryName: category.name,
          sourceUrl: category.imageUrl,
          targetUrl,
          sourceBytes: sourceBuffer.length,
          outputBytes: prepared.buffer.length,
          width: prepared.width,
          height: prepared.height,
          reductionPercent: Number(
            (((sourceBuffer.length - prepared.buffer.length) / sourceBuffer.length) * 100).toFixed(
              1,
            ),
          ),
        });
      } catch (error) {
        results.push({
          categoryId: category.id,
          categoryName: category.name,
          sourceUrl: category.imageUrl,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    ftp.close();
    await prisma.$disconnect();
  }

  const updated = results.filter((item) => item.targetUrl).length;
  const skipped = results.filter((item) => item.skipped).length;
  const failed = results.filter((item) => item.error).length;

  console.log(
    JSON.stringify(
      {
        dryRun,
        updated,
        skipped,
        failed,
        results,
      },
      null,
      2,
    ),
  );
}

void main();
