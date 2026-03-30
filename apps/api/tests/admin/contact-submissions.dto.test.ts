import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ListContactSubmissionsQueryDto } from '../../src/modules/admin/contact-submissions/dto/list-contact-submissions-query.dto';
import { UpdateContactSubmissionDto } from '../../src/modules/admin/contact-submissions/dto/update-contact-submission.dto';
import { CreateContactSubmissionDto } from '../../src/modules/public/dto/create-contact-submission.dto';

describe('CreateContactSubmissionDto', () => {
  it('accepts valid payload and normalizes fields', () => {
    const dto = plainToInstance(CreateContactSubmissionDto, {
      name: '  Alex  ',
      email: '  ALEX@Example.com ',
      subject: '  Support ',
      message: ' Need help with billing ',
      source: ' contact_page ',
      pagePath: ' /contact ',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Alex');
    expect(dto.email).toBe('alex@example.com');
    expect(dto.source).toBe('contact_page');
    expect(dto.pagePath).toBe('/contact');
  });

  it('rejects invalid email values', () => {
    const dto = plainToInstance(CreateContactSubmissionDto, {
      name: 'Alex',
      email: 'invalid-email',
      subject: 'Support',
      message: 'Need help',
      source: 'contact_page',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.some((entry) => entry.property === 'email')).toBe(true);
  });
});

describe('ListContactSubmissionsQueryDto', () => {
  it('accepts valid filters', () => {
    const dto = plainToInstance(ListContactSubmissionsQueryDto, {
      skip: 20,
      take: 50,
      search: 'billing',
      source: 'contact_page',
      status: 'NEW',
      from: '2026-03-01',
      to: '2026-03-30',
      sort: 'recent',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects take greater than 200', () => {
    const dto = plainToInstance(ListContactSubmissionsQueryDto, {
      take: 201,
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.some((entry) => entry.property === 'take')).toBe(true);
  });
});

describe('UpdateContactSubmissionDto', () => {
  it('accepts status and note updates', () => {
    const dto = plainToInstance(UpdateContactSubmissionDto, {
      status: 'IN_PROGRESS',
      internalNote: '  Followed up over email. ',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
    expect(dto.internalNote).toBe('Followed up over email.');
  });

  it('rejects unsupported status values', () => {
    const dto = plainToInstance(UpdateContactSubmissionDto, {
      status: 'DONE',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.some((entry) => entry.property === 'status')).toBe(true);
  });
});
