import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ListNewsletterSubmissionsQueryDto } from '../../src/modules/admin/newsletter/dto/list-newsletter-submissions-query.dto';
import { CreateNewsletterSubmissionDto } from '../../src/modules/public/dto/create-newsletter-submission.dto';

describe('CreateNewsletterSubmissionDto', () => {
  it('accepts a valid payload', () => {
    const dto = plainToInstance(CreateNewsletterSubmissionDto, {
      email: '  USER@Example.com ',
      source: 'global_cta',
      pagePath: '/prompts',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
    expect(dto.email).toBe('user@example.com');
    expect(dto.source).toBe('global_cta');
  });

  it('rejects invalid email values', () => {
    const dto = plainToInstance(CreateNewsletterSubmissionDto, {
      email: 'invalid-email',
      source: 'newsletter_page_hero',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.some((entry) => entry.property === 'email')).toBe(true);
  });
});

describe('ListNewsletterSubmissionsQueryDto', () => {
  it('accepts valid filters', () => {
    const dto = plainToInstance(ListNewsletterSubmissionsQueryDto, {
      skip: 20,
      take: 50,
      search: 'global_cta',
      source: 'prompt_sidebar',
      from: '2026-03-01',
      to: '2026-03-28',
      sort: 'recent',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects unsupported sort values', () => {
    const dto = plainToInstance(ListNewsletterSubmissionsQueryDto, {
      sort: 'desc',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.some((entry) => entry.property === 'sort')).toBe(true);
  });
});
