import {
  ArrayMaxSize,
  IsBoolean,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PostFormat, PostType, PromptStatus, PromptVisibility } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  toOptionalBoolean,
  toOptionalStringArray,
} from '../../../../common/dto/query-transformers';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(220)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  excerpt?: string | null;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsEnum(PromptStatus)
  status?: PromptStatus;

  @IsOptional()
  @IsEnum(PromptVisibility)
  visibility?: PromptVisibility;

  @IsOptional()
  @IsEnum(PostType)
  postType?: PostType;

  @IsOptional()
  @IsEnum(PostFormat)
  postFormat?: PostFormat;

  @IsOptional()
  @IsString()
  @MaxLength(5000000)
  featuredImageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  metaTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  metaDescription?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  seoTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  seoDescription?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  seoFocusKeyword?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000000)
  seoCanonicalUrl?: string | null;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  seoNoIndex?: boolean;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  primaryCategoryId?: string | null;

  @IsOptional()
  @Transform(toOptionalStringArray)
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(191, { each: true })
  categoryIds?: string[];

  @IsOptional()
  @Transform(toOptionalStringArray)
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(191, { each: true })
  tagIds?: string[];
}
