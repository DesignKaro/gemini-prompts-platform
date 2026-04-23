import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import { MediaStorageService } from '../../src/modules/media-storage/media-storage.service';

type FakeConfigValues = {
  MEDIA_STORAGE_DRIVER: 'none' | 'ftps';
  MEDIA_PUBLIC_BASE_URL: string;
  FTP_HOST: string;
  FTP_PORT: number;
  FTP_USER: string;
  FTP_PASS: string;
  FTP_SECURE_MODE: 'none' | 'explicit' | 'implicit';
  FTP_ROOT_DIR: string;
  FTP_TLS_REJECT_UNAUTHORIZED: string;
  FTP_TLS_SERVERNAME: string;
};

const DEFAULT_CONFIG: FakeConfigValues = {
  MEDIA_STORAGE_DRIVER: 'ftps',
  MEDIA_PUBLIC_BASE_URL: 'https://media.geminiprompts.io/gemini_prompts',
  FTP_HOST: '127.0.0.1',
  FTP_PORT: 21,
  FTP_USER: 'user',
  FTP_PASS: 'pass',
  FTP_SECURE_MODE: 'explicit',
  FTP_ROOT_DIR: '/public_html/gemini_prompts',
  FTP_TLS_REJECT_UNAUTHORIZED: 'true',
  FTP_TLS_SERVERNAME: '',
};

const MAX_BYTES = 200 * 1024;

function createService(overrides?: Partial<FakeConfigValues>) {
  const values = { ...DEFAULT_CONFIG, ...(overrides ?? {}) };
  const configService = {
    getOrThrow: vi.fn((key: keyof FakeConfigValues) => values[key]),
    get: vi.fn((key: keyof FakeConfigValues) => values[key]),
  } as unknown as ConstructorParameters<typeof MediaStorageService>[0];

  return new MediaStorageService(configService);
}

async function readStream(source: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of source) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function stubUploadClient(service: MediaStorageService) {
  const capture: {
    dir?: string;
    fileName?: string;
    bytes?: Buffer;
  } = {};

  (
    service as unknown as {
      withClient: (worker: (client: unknown) => Promise<unknown>) => Promise<unknown>;
    }
  ).withClient = async (worker) => {
    const fakeClient = {
      ensureDir: async (dir: string) => {
        capture.dir = dir;
      },
      uploadFrom: async (source: Readable, fileName: string) => {
        capture.fileName = fileName;
        capture.bytes = await readStream(source);
      },
    };
    return worker(fakeClient);
  };

  return capture;
}

describe('MediaStorageService upload processing', () => {
  it('converts JPEG to lossless WebP and captures dimensions', async () => {
    const service = createService();
    const capture = stubUploadClient(service);
    const jpeg = await sharp({
      create: {
        width: 7,
        height: 5,
        channels: 3,
        background: { r: 30, g: 120, b: 210 },
      },
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    const stored = await service.uploadBuffer({
      buffer: jpeg,
      mime: 'image/jpeg',
      scope: 'media',
    });

    expect(stored.mime).toBe('image/webp');
    expect(stored.storageKey.endsWith('.webp')).toBe(true);
    expect(stored.publicUrl.endsWith('.webp')).toBe(true);
    expect(stored.width).toBe(7);
    expect(stored.height).toBe(5);
    expect(stored.size).toBeLessThanOrEqual(MAX_BYTES);
    expect(capture.fileName?.endsWith('.webp')).toBe(true);
    expect(capture.bytes).toBeDefined();
    const metadata = await sharp(capture.bytes as Buffer).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(7);
    expect(metadata.height).toBe(5);
  });

  it('converts PNG to lossless WebP and captures dimensions', async () => {
    const service = createService();
    const capture = stubUploadClient(service);
    const png = await sharp({
      create: {
        width: 6,
        height: 4,
        channels: 4,
        background: { r: 200, g: 150, b: 40, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const stored = await service.uploadBuffer({
      buffer: png,
      mime: 'image/png',
      scope: 'media',
    });

    expect(stored.mime).toBe('image/webp');
    expect(stored.storageKey.endsWith('.webp')).toBe(true);
    expect(stored.width).toBe(6);
    expect(stored.height).toBe(4);
    expect(stored.size).toBeLessThanOrEqual(MAX_BYTES);
    const metadata = await sharp(capture.bytes as Buffer).metadata();
    expect(metadata.format).toBe('webp');
  });

  it('reduces large noisy PNG uploads to at most 200KB', async () => {
    const service = createService();
    const capture = stubUploadClient(service);
    const width = 1200;
    const height = 900;
    const channels = 3;
    const raw = Buffer.alloc(width * height * channels);
    for (let index = 0; index < raw.length; index += 1) {
      raw[index] = (index * 31 + 17) % 256;
    }
    const noisyPng = await sharp(raw, { raw: { width, height, channels } })
      .png({ compressionLevel: 0 })
      .toBuffer();

    const stored = await service.uploadBuffer({
      buffer: noisyPng,
      mime: 'image/png',
      scope: 'media',
    });

    expect(stored.mime).toBe('image/webp');
    expect(stored.size).toBeLessThanOrEqual(MAX_BYTES);
    expect(capture.bytes?.length).toBeLessThanOrEqual(MAX_BYTES);
    expect(stored.width).toBeGreaterThan(0);
    expect(stored.height).toBeGreaterThan(0);
    expect(stored.width).toBeLessThanOrEqual(width);
    expect(stored.height).toBeLessThanOrEqual(height);
  });

  it.each([
    {
      label: 'GIF',
      mime: 'image/gif',
      expectedExtension: '.gif',
      buffer: Buffer.from('R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=', 'base64'),
    },
    {
      label: 'SVG',
      mime: 'image/svg+xml',
      expectedExtension: '.svg',
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2"/></svg>',
      ),
    },
  ])('keeps $label uploads unchanged', async ({ mime, expectedExtension, buffer }) => {
    const service = createService();
    const capture = stubUploadClient(service);

    const stored = await service.uploadBuffer({
      buffer,
      mime,
      scope: 'media',
    });

    expect(stored.mime).toBe(mime);
    expect(stored.storageKey.endsWith(expectedExtension)).toBe(true);
    expect(capture.fileName?.endsWith(expectedExtension)).toBe(true);
    expect(capture.bytes?.equals(buffer)).toBe(true);
    expect(stored.size).toBeLessThanOrEqual(MAX_BYTES);
  });

  it('rejects non-converted image uploads above 200KB', async () => {
    const service = createService();
    const withClientSpy = vi.fn();
    (
      service as unknown as {
        withClient: (worker: (client: unknown) => Promise<unknown>) => Promise<unknown>;
      }
    ).withClient = withClientSpy;

    await expect(
      service.uploadBuffer({
        buffer: Buffer.alloc(220 * 1024, 1),
        mime: 'image/gif',
        scope: 'media',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(withClientSpy).not.toHaveBeenCalled();
  });

  it('throws for corrupt PNG/JPEG inputs and does not upload original bytes', async () => {
    const service = createService();
    const withClientSpy = vi.fn();
    (
      service as unknown as {
        withClient: (worker: (client: unknown) => Promise<unknown>) => Promise<unknown>;
      }
    ).withClient = withClientSpy;

    await expect(
      service.uploadBuffer({
        buffer: Buffer.from('not-a-real-png'),
        mime: 'image/png',
        scope: 'media',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(withClientSpy).not.toHaveBeenCalled();
  });
});
