import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { toOptionalTrimmedString } from '../../../common/dto/query-transformers';

export class CreateNewsletterSubmissionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(320)
  email = '';

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  source = '';

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(512)
  pagePath?: string;
}
