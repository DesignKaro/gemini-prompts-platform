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
import {
  ImagePromptMode,
  PromptStatus,
  PromptType,
  PromptVisibility,
  WebsitePromptKind,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  toOptionalBoolean,
  toOptionalStringArray,
} from '../../../../common/dto/query-transformers';

export class CreatePromptDto {
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
  description?: string | null;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsEnum(PromptType)
  promptType!: PromptType;

  @IsOptional()
  @IsEnum(ImagePromptMode)
  imageMode?: ImagePromptMode | null;

  @IsOptional()
  @IsEnum(WebsitePromptKind)
  websitePromptKind?: WebsitePromptKind | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  websiteComponent?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  websiteFeature?: string | null;

  @IsOptional()
  @IsEnum(PromptVisibility)
  visibility?: PromptVisibility;

  @IsOptional()
  @IsEnum(PromptStatus)
  status?: PromptStatus;

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
  @Transform(toOptionalStringArray)
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(5000000, { each: true })
  galleryImageUrls?: string[];

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
