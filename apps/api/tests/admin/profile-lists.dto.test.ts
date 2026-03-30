import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ListProfileItemsQueryDto } from '../../src/modules/auth/dto/list-profile-items-query.dto';

describe('ListProfileItemsQueryDto', () => {
  it('accepts valid pagination values', () => {
    const dto = plainToInstance(ListProfileItemsQueryDto, {
      skip: '20',
      take: '200',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
    expect(dto.skip).toBe(20);
    expect(dto.take).toBe(200);
  });

  it('rejects take values above 200', () => {
    const dto = plainToInstance(ListProfileItemsQueryDto, {
      take: '201',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.some((entry) => entry.property === 'take')).toBe(true);
  });
});
