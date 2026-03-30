import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  CONTACT_SUBMISSION_STATUSES,
  type ContactSubmissionStatus,
} from '../contact-submission-status';

export class UpdateContactSubmissionDto {
  @IsOptional()
  @IsIn(CONTACT_SUBMISSION_STATUSES)
  status?: ContactSubmissionStatus;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(4000)
  internalNote?: string | null;
}
