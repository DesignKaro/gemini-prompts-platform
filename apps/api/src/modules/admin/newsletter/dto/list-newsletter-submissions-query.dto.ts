import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { toOptionalTrimmedString } from '../../../../common/dto/query-transformers';
import { PaginationQueryDto } from '../../dto/pagination-query.dto';

const newsletterSortValues = ['recent', 'oldest'] as const;

export class ListNewsletterSubmissionsQueryDto extends PaginationQueryDto {
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
  @IsIn(newsletterSortValues)
  sort?: (typeof newsletterSortValues)[number];
}
