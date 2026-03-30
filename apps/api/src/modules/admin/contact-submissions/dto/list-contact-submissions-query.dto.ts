import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { toOptionalTrimmedString } from '../../../../common/dto/query-transformers';
import {
  CONTACT_SUBMISSION_STATUSES,
  type ContactSubmissionStatus,
} from '../contact-submission-status';
import { PaginationQueryDto } from '../../dto/pagination-query.dto';

const contactSubmissionSortValues = ['recent', 'oldest'] as const;

export class ListContactSubmissionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(120)
  source?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsDateString()
  from?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsIn(contactSubmissionSortValues)
  sort?: (typeof contactSubmissionSortValues)[number];

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsIn(CONTACT_SUBMISSION_STATUSES)
  status?: ContactSubmissionStatus;
}
