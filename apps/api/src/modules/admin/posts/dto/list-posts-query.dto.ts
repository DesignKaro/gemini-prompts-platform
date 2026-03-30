import { PromptStatus, PromptVisibility } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  toOptionalBoolean,
  toOptionalTrimmedString,
} from '../../../../common/dto/query-transformers';
import { PaginationQueryDto } from '../../dto/pagination-query.dto';

const postSortValues = ['recent', 'views', 'az'] as const;

export class ListPostsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PromptStatus)
  status?: PromptStatus;

  @IsOptional()
  @IsEnum(PromptVisibility)
  visibility?: PromptVisibility;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(191)
  categoryId?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(191)
  tagId?: string;

  @IsOptional()
  @IsIn(postSortValues)
  sort?: (typeof postSortValues)[number];

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  trash?: boolean;
}
