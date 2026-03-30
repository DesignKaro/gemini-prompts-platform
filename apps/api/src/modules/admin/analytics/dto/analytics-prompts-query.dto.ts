import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { toOptionalInt, toOptionalTrimmedString } from '../../../../common/dto/query-transformers';

export enum AnalyticsPromptSortBy {
  VIEW_COUNT = 'viewCount',
  TITLE = 'title',
  CREATED_AT = 'createdAt',
  CATEGORY = 'category',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class AnalyticsPromptsQueryDto {
  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt()
  @Min(1)
  @Max(365)
  range?: number;

  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AnalyticsPromptSortBy)
  sortBy?: AnalyticsPromptSortBy;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}
