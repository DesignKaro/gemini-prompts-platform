import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, type AccessOptions } from 'basic-ftp';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import type { Env } from '@/config/env.validation';

export type MediaStorageScope =
  | 'media'
  | 'prompts'
  | 'posts'
  | 'categories'
  | 'avatars'
  | 'editor';

export type StoredMediaObject = {
  publicUrl: string;
  storageKey: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
};

type UploadBufferInput = {
  buffer: Buffer;
  mime: string;
  scope?: MediaStorageScope | string;
};

type UploadDataUrlInput = {
  dataUrl: string;
  scope?: MediaStorageScope | string;
};

type PreparedUpload = {
  buffer: Buffer;
  mime: string;
  extension: string;
  width?: number;
  height?: number;
};

const MAX_COMPRESSED_IMAGE_BYTES = 100 * 1024;
const WEBP_QUALITY_STEPS = [95, 92, 89, 86, 83, 80, 76, 72, 68, 64, 60, 56, 52, 48, 44];
const WEBP_SCALE_STEPS = [1, 0.95, 0.9, 0.85, 0.8, 0.72, 0.64, 0.56, 0.5, 0.44, 0.38, 0.33];

@Injectable()
export class MediaStorageService {
  private readonly logger = new Logger(MediaStorageService.name);
  private readonly mediaStorageDriver: 'none' | 'ftps';
  private readonly mediaPublicBaseUrl: string;
  private readonly ftpHost?: string;
  private readonly ftpPort: number;
  private readonly ftpUser?: string;
  private readonly ftpPass?: string;
  private readonly ftpSecureMode: 'none' | 'explicit' | 'implicit';
  private readonly ftpRootDir: string;
  private readonly ftpTlsRejectUnauthorized: boolean;
  private readonly ftpTlsServername?: string;
  private readonly imageDataUrlPattern =
    /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i;
  private readonly inlineImageSrcPattern =
    /src=(["'])(data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+)\1/gi;

  constructor(private readonly configService: ConfigService<Env, true>) {
    this.mediaStorageDriver = this.configService.getOrThrow('MEDIA_STORAGE_DRIVER', {
      infer: true,
    });
    this.mediaPublicBaseUrl = this.configService
      .getOrThrow('MEDIA_PUBLIC_BASE_URL', { infer: true })
      .replace(/\/+$/, '');
    this.ftpHost = this.configService.get('FTP_HOST', { infer: true });
    this.ftpPort = this.configService.getOrThrow('FTP_PORT', { infer: true });
    this.ftpUser = this.configService.get('FTP_USER', { infer: true });
    this.ftpPass = this.configService.get('FTP_PASS', { infer: true });
    this.ftpSecureMode = this.configService.getOrThrow('FTP_SECURE_MODE', { infer: true });
    const rootDir = this.configService.getOrThrow('FTP_ROOT_DIR', { infer: true }).trim();
    this.ftpRootDir = rootDir.startsWith('/') ? rootDir.replace(/\/+$/, '') : `/${rootDir}`;
    this.ftpTlsRejectUnauthorized = this.parseBooleanFlag(
      this.configService.getOrThrow('FTP_TLS_REJECT_UNAUTHORIZED', { infer: true }),
      true,
    );
    this.ftpTlsServername = this.configService.get('FTP_TLS_SERVERNAME', { infer: true })?.trim();
  }

  isEnabled() {
    return this.mediaStorageDriver === 'ftps';
  }

  isInlineImageDataUrl(value: string | null | undefined) {
    if (typeof value !== 'string') return false;
    return this.imageDataUrlPattern.test(value.trim());
  }

  async maybeUploadImageDataUrl(
    value: string | null | undefined,
    scope?: MediaStorageScope | string,
  ): Promise<string | null | undefined> {
    if (typeof value !== 'string') {
      return value;
    }

    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    if (!this.isInlineImageDataUrl(normalized)) {
      return normalized;
    }

    if (!this.isEnabled()) {
      return normalized;
    }

    const stored = await this.uploadImageDataUrl({
      dataUrl: normalized,
      scope,
    });
    return stored.publicUrl;
  }

  async uploadImageDataUrl(input: UploadDataUrlInput): Promise<StoredMediaObject> {
    const parsed = this.parseImageDataUrl(input.dataUrl);
    return this.uploadBuffer({
      buffer: parsed.buffer,
      mime: parsed.mime,
      scope: input.scope,
    });
  }

  async uploadBuffer(input: UploadBufferInput): Promise<StoredMediaObject> {
    if (!this.isEnabled()) {
      throw new BadRequestException('Media storage is not configured.');
    }

    this.assertFtpConfig();

    const prepared = await this.prepareUploadBuffer(input);
    const safeScope = this.normalizeScope(input.scope);
    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const hash = createHash('sha256').update(prepared.buffer).digest('hex').slice(0, 32);
    const fileName = `${hash}.${prepared.extension}`;
    const storageKey = `${safeScope}/${year}/${month}/${fileName}`;

    const remoteDir = `${this.ftpRootDir}/${safeScope}/${year}/${month}`;

    await this.withClient(async (client) => {
      await client.ensureDir(remoteDir);
      await client.uploadFrom(Readable.from(prepared.buffer), fileName);
    });

    return {
      publicUrl: this.buildPublicUrl(storageKey),
      storageKey,
      mime: prepared.mime,
      size: prepared.buffer.length,
      width: prepared.width,
      height: prepared.height,
    };
  }

  async replaceInlineImageDataUrls(
    html: string,
    scope?: MediaStorageScope | string,
  ): Promise<{ html: string; replacedCount: number }> {
    if (!html || typeof html !== 'string') {
      return { html, replacedCount: 0 };
    }

    if (!this.isEnabled()) {
      return { html, replacedCount: 0 };
    }

    const matches = Array.from(html.matchAll(this.inlineImageSrcPattern));
    if (matches.length === 0) {
      return { html, replacedCount: 0 };
    }

    const replacementMap = new Map<string, string>();
    for (const match of matches) {
      const dataUrl = match[2];
      if (!dataUrl || replacementMap.has(dataUrl)) {
        continue;
      }

      const uploaded = await this.uploadImageDataUrl({
        dataUrl,
        scope: scope ?? 'editor',
      });
      replacementMap.set(dataUrl, uploaded.publicUrl);
    }

    let nextHtml = html;
    let replacedCount = 0;
    for (const [source, target] of replacementMap) {
      if (!nextHtml.includes(source)) {
        continue;
      }
      nextHtml = nextHtml.split(source).join(target);
      replacedCount += 1;
    }

    return { html: nextHtml, replacedCount };
  }

  private parseImageDataUrl(dataUrl: string) {
    const normalized = dataUrl.trim();
    const match = normalized.match(this.imageDataUrlPattern);
    if (!match) {
      throw new BadRequestException('Invalid image data URL.');
    }

    const mime = match[1]!.toLowerCase();
    const base64 = match[2]!.replace(/\s+/g, '');
    if (!base64) {
      throw new BadRequestException('Image data is empty.');
    }

    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length === 0) {
      throw new BadRequestException('Image data is empty.');
    }

    return { mime, buffer };
  }

  private normalizeScope(scope?: MediaStorageScope | string) {
    const normalized = (scope ?? 'media').toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return normalized || 'media';
  }

  private mimeToExtension(mime: string) {
    const normalized = mime.toLowerCase();
    const extensionByMime: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/avif': 'avif',
      'image/svg+xml': 'svg',
    };
    return extensionByMime[normalized] ?? 'bin';
  }

  private shouldConvertToWebp(mime: string) {
    return (
      mime === 'image/jpeg' ||
      mime === 'image/jpg' ||
      mime === 'image/png' ||
      mime === 'image/webp' ||
      mime === 'image/avif'
    );
  }

  private async prepareUploadBuffer(input: UploadBufferInput): Promise<PreparedUpload> {
    const normalizedMime = input.mime.trim().toLowerCase();

    if (!this.shouldConvertToWebp(normalizedMime)) {
      this.assertMaxCompressedSize(input.buffer.length);
      return {
        buffer: input.buffer,
        mime: normalizedMime,
        extension: this.mimeToExtension(normalizedMime),
      };
    }

    try {
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

        const lossless = await losslessPipeline
          .webp({ lossless: true, effort: 6 })
          .toBuffer({ resolveWithObject: true });

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

      throw new BadRequestException('Image exceeds the 100KB limit after compression.');
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown image processing error';
      this.logger.error(`Lossless WebP conversion failed: ${message}`);
      throw new BadRequestException('Invalid or unsupported JPEG/PNG image.');
    }
  }

  private assertMaxCompressedSize(size: number) {
    if (size <= MAX_COMPRESSED_IMAGE_BYTES) {
      return;
    }
    throw new BadRequestException('Image exceeds the 100KB limit after compression.');
  }

  private buildPublicUrl(storageKey: string) {
    const encodedPath = storageKey
      .split('/')
      .filter((segment) => segment.length > 0)
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${this.mediaPublicBaseUrl}/${encodedPath}`;
  }

  private secureModeToFtpSecure(): AccessOptions['secure'] {
    if (this.ftpSecureMode === 'none') {
      return false;
    }
    if (this.ftpSecureMode === 'implicit') {
      return 'implicit';
    }
    return true;
  }

  private assertFtpConfig() {
    if (!this.ftpHost || !this.ftpUser || !this.ftpPass) {
      throw new BadRequestException(
        'FTPS configuration is incomplete. Check FTP_HOST, FTP_USER, and FTP_PASS.',
      );
    }
  }

  private parseBooleanFlag(value: string | undefined, fallback: boolean) {
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

  private async withClient<T>(worker: (client: Client) => Promise<T>): Promise<T> {
    const client = new Client(20_000);
    client.ftp.verbose = false;
    try {
      await client.access({
        host: this.ftpHost,
        port: this.ftpPort,
        user: this.ftpUser,
        password: this.ftpPass,
        secure: this.secureModeToFtpSecure(),
        secureOptions: {
          rejectUnauthorized: this.ftpTlsRejectUnauthorized,
          ...(this.ftpTlsServername ? { servername: this.ftpTlsServername } : {}),
        },
      });
      const result = await worker(client);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown FTP error';
      this.logger.error(`FTPS upload failed: ${message}`);
      throw new BadRequestException('Unable to upload media to FTPS storage.');
    } finally {
      client.close();
    }
  }
}
