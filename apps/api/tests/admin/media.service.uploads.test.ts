import { describe, expect, it, vi } from 'vitest';
import { MediaService } from '../../src/modules/admin/media/media.service';

describe('MediaService upload metadata persistence', () => {
  it('stores processed mime/size/width/height for direct file uploads', async () => {
    const prisma = {
      mediaAsset: {
        create: vi.fn().mockResolvedValue({
          id: 'media_1',
          url: 'https://media.geminiprompts.io/gemini_prompts/media/2026/03/a.webp',
        }),
      },
    } as unknown as ConstructorParameters<typeof MediaService>[0];

    const auditService = {
      log: vi.fn().mockResolvedValue(undefined),
    } as unknown as ConstructorParameters<typeof MediaService>[1];

    const mediaStorageService = {
      uploadBuffer: vi.fn().mockResolvedValue({
        publicUrl: 'https://media.geminiprompts.io/gemini_prompts/media/2026/03/a.webp',
        storageKey: 'media/2026/03/a.webp',
        mime: 'image/webp',
        size: 1200,
        width: 1000,
        height: 600,
      }),
    } as unknown as ConstructorParameters<typeof MediaService>[2];

    const service = new MediaService(prisma, auditService, mediaStorageService);

    await service.uploadFile(
      'user_1',
      {
        buffer: Buffer.from([0x01, 0x02, 0x03]),
        mimetype: 'image/jpeg',
        originalname: 'hero.jpg',
      },
      { title: 'Hero image', altText: 'Hero' },
    );

    expect(prisma.mediaAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        mime: 'image/webp',
        size: 1200,
        width: 1000,
        height: 600,
      }),
    });
  });

  it('stores null width/height for unchanged non-converted uploads', async () => {
    const prisma = {
      mediaAsset: {
        create: vi.fn().mockResolvedValue({
          id: 'media_2',
          url: 'https://media.geminiprompts.io/gemini_prompts/media/2026/03/a.gif',
        }),
      },
    } as unknown as ConstructorParameters<typeof MediaService>[0];

    const auditService = {
      log: vi.fn().mockResolvedValue(undefined),
    } as unknown as ConstructorParameters<typeof MediaService>[1];

    const mediaStorageService = {
      uploadBuffer: vi.fn().mockResolvedValue({
        publicUrl: 'https://media.geminiprompts.io/gemini_prompts/media/2026/03/a.gif',
        storageKey: 'media/2026/03/a.gif',
        mime: 'image/gif',
        size: 512,
      }),
    } as unknown as ConstructorParameters<typeof MediaService>[2];

    const service = new MediaService(prisma, auditService, mediaStorageService);

    await service.uploadFile(
      'user_1',
      {
        buffer: Buffer.from([0x47, 0x49, 0x46]),
        mimetype: 'image/gif',
        originalname: 'anim.gif',
      },
      { title: 'Gif image' },
    );

    expect(prisma.mediaAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        mime: 'image/gif',
        size: 512,
        width: null,
        height: null,
      }),
    });
  });

  it('overrides inline create metadata with processed storage metadata', async () => {
    const prisma = {
      mediaAsset: {
        create: vi.fn().mockResolvedValue({
          id: 'media_3',
          url: 'https://media.geminiprompts.io/gemini_prompts/media/2026/03/inline.webp',
        }),
      },
    } as unknown as ConstructorParameters<typeof MediaService>[0];

    const auditService = {
      log: vi.fn().mockResolvedValue(undefined),
    } as unknown as ConstructorParameters<typeof MediaService>[1];

    const mediaStorageService = {
      isInlineImageDataUrl: vi.fn().mockReturnValue(true),
      isEnabled: vi.fn().mockReturnValue(true),
      uploadImageDataUrl: vi.fn().mockResolvedValue({
        publicUrl: 'https://media.geminiprompts.io/gemini_prompts/media/2026/03/inline.webp',
        storageKey: 'media/2026/03/inline.webp',
        mime: 'image/webp',
        size: 1111,
        width: 1280,
        height: 720,
      }),
    } as unknown as ConstructorParameters<typeof MediaService>[2];

    const service = new MediaService(prisma, auditService, mediaStorageService);

    await service.create('user_1', {
      title: 'Inline image',
      url: 'data:image/png;base64,AAAA',
      mime: 'image/png',
      size: 99,
      width: 20,
      height: 20,
    });

    expect(prisma.mediaAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        url: 'https://media.geminiprompts.io/gemini_prompts/media/2026/03/inline.webp',
        mime: 'image/webp',
        size: 1111,
        width: 1280,
        height: 720,
      }),
    });
  });

  it('overrides inline update metadata with processed storage metadata', async () => {
    const prisma = {
      mediaAsset: {
        findUnique: vi.fn().mockResolvedValue({ id: 'media_4' }),
        update: vi.fn().mockResolvedValue({
          id: 'media_4',
          url: 'https://media.geminiprompts.io/gemini_prompts/media/2026/03/update.webp',
        }),
      },
    } as unknown as ConstructorParameters<typeof MediaService>[0];

    const auditService = {
      log: vi.fn().mockResolvedValue(undefined),
    } as unknown as ConstructorParameters<typeof MediaService>[1];

    const mediaStorageService = {
      isInlineImageDataUrl: vi.fn().mockReturnValue(true),
      isEnabled: vi.fn().mockReturnValue(true),
      uploadImageDataUrl: vi.fn().mockResolvedValue({
        publicUrl: 'https://media.geminiprompts.io/gemini_prompts/media/2026/03/update.webp',
        storageKey: 'media/2026/03/update.webp',
        mime: 'image/webp',
        size: 2222,
        width: 1400,
        height: 800,
      }),
    } as unknown as ConstructorParameters<typeof MediaService>[2];

    const service = new MediaService(prisma, auditService, mediaStorageService);

    await service.update('user_1', 'media_4', {
      url: 'data:image/jpeg;base64,BBBB',
      mime: 'image/jpeg',
      size: 88,
      width: 10,
      height: 10,
    });

    expect(prisma.mediaAsset.update).toHaveBeenCalledWith({
      where: { id: 'media_4' },
      data: expect.objectContaining({
        url: 'https://media.geminiprompts.io/gemini_prompts/media/2026/03/update.webp',
        mime: 'image/webp',
        size: 2222,
        width: 1400,
        height: 800,
      }),
    });
  });
});
