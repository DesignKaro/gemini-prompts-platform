import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreatePromptDto } from '../../src/modules/admin/prompts/dto/create-prompt.dto';

function buildCreatePromptDtoPayload(overrides?: Partial<Record<string, unknown>>) {
  return {
    title: 'Gallery Prompt',
    slug: 'gallery-prompt',
    content: 'Prompt content',
    promptType: 'CONTENT',
    ...overrides,
  };
}

describe('CreatePromptDto galleryImageUrls validation', () => {
  it('accepts up to 5 gallery images', () => {
    const dto = plainToInstance(
      CreatePromptDto,
      buildCreatePromptDtoPayload({
        galleryImageUrls: ['a', 'b', 'c', 'd', 'e'],
      }),
    );

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
    expect(dto.galleryImageUrls).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('rejects more than 5 gallery images', () => {
    const dto = plainToInstance(
      CreatePromptDto,
      buildCreatePromptDtoPayload({
        galleryImageUrls: ['a', 'b', 'c', 'd', 'e', 'f'],
      }),
    );

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.some((error) => error.property === 'galleryImageUrls')).toBe(true);
  });
});
